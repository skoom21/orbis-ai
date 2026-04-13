"""
Booking management router.

Endpoints:
  POST /api/v1/bookings/flights/search        - search flights (via SerpApi)
  POST /api/v1/bookings/hotels/search         - search hotels (via liteAPI)
  POST /api/v1/bookings/hotels/prebook        - prebook a hotel rate (liteAPI)
  POST /api/v1/bookings/hotels/book           - confirm hotel booking (liteAPI)
  GET  /api/v1/bookings/hotels/{prebook_id}   - get prebook details (liteAPI)
  POST /api/v1/bookings                       - create booking record in DB
  POST /api/v1/bookings/{id}/confirm          - mark booking confirmed in DB
  POST /api/v1/bookings/{id}/cancel           - cancel a booking in DB
  GET  /api/v1/bookings/{id}                  - get booking from DB
"""

import os
import json
import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, List, Optional

from app.api.dependencies.auth import get_optional_user
from app.services.database import db_service
from app.logging_config import get_logger

logger = get_logger("api.bookings")
router = APIRouter(prefix="/bookings", tags=["bookings"])

LITEAPI_KEY = os.environ.get("LITEAPI_KEY", "sand_583409da-28e0-4ca1-ad0e-ddd61b78cb85")
LITEAPI_BASE = "https://api.liteapi.travel/v3.0"


def _liteapi_headers() -> dict:
    return {"X-API-Key": LITEAPI_KEY, "Content-Type": "application/json", "Accept": "application/json"}


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class FlightSearchRequest(BaseModel):
    origin: str
    destination: str
    departure_date: str
    return_date: Optional[str] = ""
    passengers: int = 1
    cabin_class: str = "ECONOMY"


class HotelSearchRequest(BaseModel):
    city: str
    checkin: str
    checkout: str
    guests: int = 1
    max_price: Optional[float] = 0
    min_rating: Optional[float] = 0


class BookingCreate(BaseModel):
    trip_id: str
    booking_type: str          # flight, hotel, activity, transfer
    provider: str
    details: Dict[str, Any]
    price: float
    currency: str = "USD"


class BookingConfirm(BaseModel):
    confirmation_number: str
    provider_booking_id: Optional[str] = None


class HotelPrebookRequest(BaseModel):
    offer_id: str                        # offerId from hotel search rates
    use_payment_sdk: bool = False        # True for Stripe SDK, False for credit line


class HotelBookRequest(BaseModel):
    prebook_id: str
    holder: Dict[str, Any]               # { firstName, lastName, email, phone }
    guests: List[Dict[str, Any]]         # [{ firstName, lastName, email }]
    payment_method: str = "CREDIT"       # "CREDIT" for sandbox, "TRANSACTION_ID" for Stripe
    transaction_id: Optional[str] = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/flights/search")
async def search_flights_endpoint(
    request: FlightSearchRequest,
    current_user: Dict[str, Any] = Depends(get_optional_user),
):
    """Search for available flights using the Flight Agent tool."""
    import json
    from app.agents.tools.flight_tools import search_flights
    result = await search_flights.ainvoke({
        "origin": request.origin,
        "destination": request.destination,
        "departure_date": request.departure_date,
        "return_date": request.return_date,
        "passengers": request.passengers,
        "cabin_class": request.cabin_class,
    })
    return json.loads(result)


@router.post("/hotels/search")
async def search_hotels_endpoint(
    request: HotelSearchRequest,
    current_user: Dict[str, Any] = Depends(get_optional_user),
):
    """Search for available hotels via liteAPI."""
    import json
    from app.agents.tools.hotel_tools import search_hotels
    result = await search_hotels.ainvoke({
        "city": request.city,
        "checkin": request.checkin,
        "checkout": request.checkout,
        "guests": request.guests,
        "max_price": request.max_price or 0,
        "min_rating": request.min_rating or 0,
        "max_results": 10,
    })
    return json.loads(result)


@router.post("/hotels/prebook")
async def prebook_hotel(
    request: HotelPrebookRequest,
    current_user: Dict[str, Any] = Depends(get_optional_user),
):
    """
    Step 2 of hotel booking: prebook a rate to lock price and get a prebookId.

    Supply the offerId from /hotels/search results.
    Returns a prebookId to use in /hotels/book.
    """
    try:
        payload = {
            "offerId": request.offer_id,
            "usePaymentSdk": request.use_payment_sdk,
        }
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                f"{LITEAPI_BASE}/rates/prebook",
                headers=_liteapi_headers(),
                json=payload,
            )
        if resp.status_code not in (200, 201):
            raise HTTPException(status_code=resp.status_code, detail=f"Prebook failed: {resp.text[:300]}")
        data = resp.json()
        return data.get("data", data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("prebook_hotel error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/hotels/prebook/{prebook_id}")
async def get_prebook(
    prebook_id: str,
    current_user: Dict[str, Any] = Depends(get_optional_user),
):
    """Get details of an existing prebook by prebookId."""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{LITEAPI_BASE}/prebooks/{prebook_id}",
                headers=_liteapi_headers(),
            )
        if resp.status_code != 200:
            raise HTTPException(status_code=404, detail="Prebook not found")
        return resp.json().get("data", resp.json())
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/hotels/book")
async def book_hotel(
    request: HotelBookRequest,
    current_user: Dict[str, Any] = Depends(get_optional_user),
):
    """
    Step 3 of hotel booking: confirm the booking using a prebookId.

    In sandbox, use payment_method="CREDIT" — no real payment needed.
    In production, integrate Stripe and pass payment_method="TRANSACTION_ID".

    On success, saves the confirmed booking to the database and returns the confirmation.
    """
    user_id = current_user["id"]
    try:
        payment: Dict[str, Any] = {"method": request.payment_method}
        if request.transaction_id:
            payment["transactionId"] = request.transaction_id

        payload = {
            "prebookId": request.prebook_id,
            "holder": request.holder,
            "guests": request.guests,
            "payment": payment,
        }

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{LITEAPI_BASE}/rates/book",
                headers=_liteapi_headers(),
                json=payload,
            )

        if resp.status_code not in (200, 201):
            raise HTTPException(status_code=resp.status_code, detail=f"Booking failed: {resp.text[:400]}")

        booking_data = resp.json().get("data", resp.json())
        booking_id = booking_data.get("bookingId") or booking_data.get("id")
        hotel_name = booking_data.get("hotel", {}).get("name", "Hotel")
        total_price = booking_data.get("totalPrice") or booking_data.get("price", 0)

        # Persist to our DB
        if db_service.supabase and booking_id:
            try:
                db_service.supabase.table("bookings").insert({
                    "user_id": user_id,
                    "booking_type": "hotel",
                    "provider": "liteAPI",
                    "provider_booking_id": str(booking_id),
                    "confirmation_number": str(booking_id),
                    "status": "confirmed",
                    "price": float(total_price),
                    "currency": booking_data.get("currency", "USD"),
                    "details": {
                        "hotel_name": hotel_name,
                        "prebook_id": request.prebook_id,
                        "holder": request.holder,
                        "raw": booking_data,
                    },
                }).execute()
                logger.info("Hotel booking saved to DB", booking_id=booking_id, hotel=hotel_name)
            except Exception as db_err:
                logger.warning("Could not save booking to DB", error=str(db_err))

        return {
            "status": "confirmed",
            "booking_id": booking_id,
            "hotel": hotel_name,
            "total_price": total_price,
            "currency": booking_data.get("currency", "USD"),
            "details": booking_data,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("book_hotel error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", status_code=201)
async def create_booking(
    data: BookingCreate,
    current_user: Dict[str, Any] = Depends(get_optional_user),
):
    """Create a new booking record for a trip."""
    user_id = current_user["id"]
    try:
        if not db_service.supabase:
            raise HTTPException(status_code=503, detail="Database unavailable")
        result = db_service.supabase.table("bookings").insert({
            "trip_id": data.trip_id,
            "user_id": user_id,
            "booking_type": data.booking_type,
            "provider": data.provider,
            "details": data.details,
            "price": data.price,
            "currency": data.currency,
            "status": "pending",
        }).execute()
        if result.data:
            return result.data[0]
        raise HTTPException(status_code=500, detail="Failed to create booking")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("create_booking error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{booking_id}")
async def get_booking(
    booking_id: str,
    current_user: Dict[str, Any] = Depends(get_optional_user),
):
    """Get details of a specific booking."""
    user_id = current_user["id"]
    try:
        if not db_service.supabase:
            raise HTTPException(status_code=503, detail="Database unavailable")
        result = db_service.supabase.table("bookings") \
            .select("*") \
            .eq("id", booking_id) \
            .eq("user_id", user_id) \
            .single() \
            .execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Booking not found")
        return result.data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{booking_id}/confirm")
async def confirm_booking(
    booking_id: str,
    data: BookingConfirm,
    current_user: Dict[str, Any] = Depends(get_optional_user),
):
    """Mark a booking as confirmed with a provider confirmation number."""
    user_id = current_user["id"]
    try:
        if not db_service.supabase:
            raise HTTPException(status_code=503, detail="Database unavailable")
        result = db_service.supabase.table("bookings") \
            .update({
                "status": "confirmed",
                "confirmation_number": data.confirmation_number,
                "provider_booking_id": data.provider_booking_id,
            }) \
            .eq("id", booking_id) \
            .eq("user_id", user_id) \
            .execute()
        if result.data:
            return result.data[0]
        raise HTTPException(status_code=404, detail="Booking not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{booking_id}/cancel")
async def cancel_booking(
    booking_id: str,
    current_user: Dict[str, Any] = Depends(get_optional_user),
):
    """Cancel a booking."""
    user_id = current_user["id"]
    try:
        if not db_service.supabase:
            raise HTTPException(status_code=503, detail="Database unavailable")
        result = db_service.supabase.table("bookings") \
            .update({"status": "cancelled"}) \
            .eq("id", booking_id) \
            .eq("user_id", user_id) \
            .execute()
        if result.data:
            return {"status": "cancelled", "booking_id": booking_id}
        raise HTTPException(status_code=404, detail="Booking not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
