#!/usr/bin/env python3
"""
Manual regression script for hotel booking flow with hard asserts.

Covers:
1) search_hotels returns a concrete bookable offer_id
2) prebook_hotel works via backward-compatible alias
3) book_hotel works via backward-compatible alias
4) create_booking writes a DB-valid booking status (not legacy "pending")

Run:
  python apps/api/tests/manual/test_booking_flow_asserts.py
"""

import asyncio
import json
from pathlib import Path
from unittest.mock import patch


PROJECT_ROOT = Path(__file__).resolve().parents[2]
import sys
sys.path.insert(0, str(PROJECT_ROOT))


class FakeResponse:
    def __init__(self, status_code: int, payload: dict):
        self.status_code = status_code
        self._payload = payload
        self.text = json.dumps(payload)

    def json(self):
        return self._payload


class FakeAsyncClient:
    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def post(self, url, headers=None, json=None):
        if url.endswith("/hotels/rates"):
            return FakeResponse(
                200,
                {
                    "hotels": [
                        {
                            "hotelId": "h-marriott-isb",
                            "hotel": {
                                "id": "h-marriott-isb",
                                "name": "Islamabad Marriott Hotel",
                                "city": "Islamabad",
                                "stars": 5,
                                "rating": 4.2,
                            },
                            "roomTypes": [
                                {
                                    "offerId": "offer-marriott-001",
                                    "name": "Deluxe Room",
                                    "rates": [
                                        {
                                            "rateId": "rate-001",
                                            "name": "Refundable Rate",
                                            "boardName": "Breakfast Included",
                                            "retailRate": {
                                                "total": [{"amount": 1218, "currency": "USD"}],
                                                "taxes": {"amount": 120},
                                                "suggestedSellingPrice": 1098,
                                            },
                                        }
                                    ],
                                }
                            ],
                        }
                    ]
                },
            )

        if url.endswith("/rates/prebook"):
            return FakeResponse(
                201,
                {
                    "data": {
                        "prebookId": "pb-123",
                        "totalPrice": 1218,
                        "currency": "USD",
                        "cancellationPolicies": [],
                    }
                },
            )

        if url.endswith("/rates/book"):
            return FakeResponse(
                201,
                {
                    "data": {
                        "bookingId": "bk-456",
                        "confirmationNumber": "CNF-456",
                        "totalPrice": 1218,
                        "currency": "USD",
                        "hotel": {"name": "Islamabad Marriott Hotel"},
                    }
                },
            )

        return FakeResponse(404, {"error": f"Unhandled URL in fake client: {url}"})

    async def get(self, url, headers=None, params=None):
        return FakeResponse(404, {"error": f"Unhandled GET URL in fake client: {url}"})


class _InsertQuery:
    def __init__(self, payload: dict):
        self.payload = payload

    def execute(self):
        return type("Result", (), {"data": [{"id": "local-booking-1", **self.payload}]})()


class _BookingsTable:
    def __init__(self):
        self.last_insert_payload = None

    def insert(self, payload: dict):
        self.last_insert_payload = payload
        return _InsertQuery(payload)


class _FakeSupabase:
    def __init__(self):
        self.bookings_table = _BookingsTable()

    def table(self, table_name: str):
        assert table_name == "bookings", f"Unexpected table: {table_name}"
        return self.bookings_table


async def main():
    from app.agents.tools import hotel_tools, trip_tools
    from app.services.database import db_service

    with patch("app.agents.tools.hotel_tools.httpx.AsyncClient", FakeAsyncClient):
        # 1) Search hotels and assert bookable offer id is present
        search_raw = await hotel_tools.search_hotels.ainvoke(
            {
                "city": "Islamabad",
                "country_code": "PK",
                "checkin": "2026-04-13",
                "checkout": "2026-04-20",
                "guests": 1,
                "max_results": 5,
            }
        )
        search_data = json.loads(search_raw)
        assert "hotels" in search_data and len(search_data["hotels"]) > 0, "No hotels returned"
        first_hotel = search_data["hotels"][0]
        assert first_hotel["name"] == "Islamabad Marriott Hotel"
        assert first_hotel.get("best_offer_id"), "Missing best_offer_id (not bookable)"

        # 2) Prebook via alias to verify backward-compat function name
        prebook_raw = await hotel_tools.prebook_hotel.ainvoke(
            {"offer_id": first_hotel["best_offer_id"], "use_payment_sdk": False}
        )
        prebook_data = json.loads(prebook_raw)
        assert prebook_data.get("prebook_id") == "pb-123", "Prebook alias failed"

        # 3) Book via alias to verify backward-compat function name
        booking_raw = await hotel_tools.book_hotel.ainvoke(
            {
                "prebook_id": prebook_data["prebook_id"],
                "first_name": "Test",
                "last_name": "User",
                "email": "test@example.com",
                "phone": "+923001234567",
            }
        )
        booking_data = json.loads(booking_raw)
        assert booking_data.get("status") == "confirmed", "Hotel booking not confirmed"
        assert booking_data.get("booking_id") == "bk-456", "Unexpected booking_id"

    # 4) Assert create_booking writes valid status (regression: no 'pending')
    fake_supabase = _FakeSupabase()
    with patch.object(db_service, "supabase", fake_supabase):
        create_raw = await trip_tools.create_booking.ainvoke(
            {
                "trip_id": "11111111-1111-1111-1111-111111111111",
                "user_id": "22222222-2222-2222-2222-222222222222",
                "booking_type": "hotel",
                "provider": "liteAPI",
                "details": json.dumps({"hotel": "Islamabad Marriott Hotel"}),
                "price": 1218,
                "currency": "USD",
            }
        )
        create_data = json.loads(create_raw)
        assert create_data.get("status") == "created", "DB booking insert failed"

        inserted = fake_supabase.bookings_table.last_insert_payload
        assert inserted is not None, "No insert payload captured"
        assert inserted["status"] in {
            "searching",
            "held",
            "payment_pending",
            "confirmed",
            "cancelled",
            "refunded",
            "failed",
        }, f"Invalid booking enum status: {inserted['status']}"
        assert inserted["status"] != "pending", "Regression: legacy invalid status 'pending' was inserted"

    print("PASS: booking flow regression script completed with all asserts.")


if __name__ == "__main__":
    asyncio.run(main())
