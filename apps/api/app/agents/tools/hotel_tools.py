"""
Hotel search tools for the Hotel Agent.

Uses liteAPI for live hotel data and rates.
API Key: stored in LITEAPI_KEY env var (sandbox key: sand_583409da-28e0-4ca1-ad0e-ddd61b78cb85)
"""

import json
import httpx
from langchain_core.tools import tool
from app.agents.tools.base import log_tool_call
from app.logging_config import get_logger
from app.config import settings

logger = get_logger("agents.tools.hotel")

LITEAPI_KEY = settings.LITEAPI_KEY or "sand_583409da-28e0-4ca1-ad0e-ddd61b78cb85"
LITEAPI_BASE = "https://api.liteapi.travel/v3.0"
_IATA_CACHE: dict[tuple[str, str], str] = {}

def _headers() -> dict:
    return {
        "X-API-Key": LITEAPI_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def _safe_float(value, default: float = 0.0) -> float:
    try:
        return float(value)
    except Exception:
        return default


def _extract_price_data(rate: dict) -> dict:
    """
    Normalize LiteAPI rate price payloads (which can differ by feed/shape).
    """
    retail = rate.get("retailRate") or {}
    total = retail.get("total")
    amount = 0.0
    currency = "USD"

    if isinstance(total, list) and total:
        amount = _safe_float(total[0].get("amount", 0))
        currency = total[0].get("currency", currency)
    elif isinstance(total, dict):
        amount = _safe_float(total.get("amount", 0))
        currency = total.get("currency", currency)
    elif isinstance(total, (int, float, str)):
        amount = _safe_float(total)
        currency = retail.get("currency", currency)

    tax = retail.get("taxes")
    if isinstance(tax, dict):
        tax = tax.get("amount", 0)

    return {
        "total_price": amount,
        "currency": currency,
        "taxes": _safe_float(tax, 0),
        "base_price": _safe_float(retail.get("suggestedSellingPrice", amount), amount),
        "payment_type": rate.get("paymentType"),
    }


def _extract_amount_currency_from_any(node: dict) -> tuple[float, str]:
    """
    Best-effort extractor for LiteAPI price shapes:
    - retailRate.total (list|dict|number)
    - minRate / lowestRate
    - amount+currency pairs
    """
    if not isinstance(node, dict):
        return 0.0, "USD"

    # Prefer structured rate extractor if this looks like a rate node.
    if "retailRate" in node:
        p = _extract_price_data(node)
        return p.get("total_price", 0.0), p.get("currency", "USD")

    # Common hotel-level fields
    for key in ("minRate", "lowestRate", "price"):
        val = node.get(key)
        if isinstance(val, dict):
            amount = _safe_float(val.get("amount", val.get("value", 0)))
            currency = val.get("currency", "USD")
            if amount > 0:
                return amount, currency
        elif isinstance(val, (int, float, str)):
            amount = _safe_float(val, 0)
            if amount > 0:
                return amount, node.get("currency", "USD")

    # Generic amount/currency pair
    amount = _safe_float(node.get("amount", node.get("value", 0)), 0)
    if amount > 0:
        return amount, node.get("currency", "USD")

    return 0.0, "USD"


def _normalize_text(value: str) -> str:
    return "".join(ch for ch in (value or "").strip().lower() if ch.isalnum() or ch.isspace()).strip()


async def _resolve_iata_code(
    client: httpx.AsyncClient,
    city: str,
    country_code: str = "",
) -> str | None:
    """
    Resolve city -> likely IATA code using LiteAPI /data/iatacodes (dynamic, no hardcoded city map).
    """
    city_norm = _normalize_text(city)
    if not city_norm:
        return None

    cache_key = (city_norm, (country_code or "").upper())
    if cache_key in _IATA_CACHE:
        return _IATA_CACHE[cache_key]

    try:
        resp = await client.get(
            f"{LITEAPI_BASE}/data/iatacodes",
            headers=_headers(),
            params={"timeout": 12},
        )
        if resp.status_code != 200:
            return None

        rows = resp.json().get("data", []) or []
        country = (country_code or "").upper()

        best_code = None
        best_score = -1
        for row in rows:
            code = (row.get("iataCode") or row.get("code") or "").upper()
            if len(code) != 3:
                continue

            row_country = (row.get("countryCode") or row.get("country") or "").upper()
            if country and row_country and row_country != country:
                continue

            searchable_fields = [
                row.get("city"),
                row.get("cityName"),
                row.get("municipality"),
                row.get("name"),
                row.get("airportName"),
            ]
            joined = " ".join(_normalize_text(str(x or "")) for x in searchable_fields)
            if not joined:
                continue

            score = 0
            if city_norm == joined:
                score = 100
            elif f" {city_norm} " in f" {joined} ":
                score = 80
            elif joined.startswith(city_norm):
                score = 70
            elif city_norm in joined:
                score = 60

            if score > best_score:
                best_score = score
                best_code = code

        if best_code:
            _IATA_CACHE[cache_key] = best_code
        return best_code
    except Exception:
        return None


@tool
@log_tool_call
async def search_hotels(
    city: str,
    country_code: str,
    checkin: str,
    checkout: str,
    guests: int = 1,
    max_price: float = 0,
    min_rating: float = 0,
    max_results: int = 5,
) -> str:
    """
    Search for available hotels with real-time rates using liteAPI.

    Args:
        city: City name (e.g., "Bali", "Paris", "Tokyo").
        country_code: 2-letter ISO country code of the city (e.g., "ID", "FR", "US").
        checkin: Check-in date in YYYY-MM-DD format.
        checkout: Check-out date in YYYY-MM-DD format.
        guests: Number of guests (default 1).
        max_price: Maximum total stay price in USD (0 = no limit).
        min_rating: Minimum hotel rating 0-10 (0 = no filter).
        max_results: Maximum number of hotels to return.

    Returns:
        JSON string with available hotels including names, prices, ratings, and room types.
    """
    try:
        city_clean = (city or "").strip()
        effective_country = (country_code or "").upper()

        base_payload = {
            "occupancies": [{"adults": max(1, guests)}],
            "checkin": checkin,
            "checkout": checkout,
            "currency": "USD",
            "guestNationality": effective_country or "US",
            "maxRatesPerHotel": 3,
            "includeHotelData": True,
            "limit": min(max_results * 5, 80),
        }

        attempts = []
        # Attempt 1: explicit city+country search
        attempt_city = dict(base_payload)
        attempt_city["cityName"] = city_clean
        if effective_country:
            attempt_city["countryCode"] = effective_country
        if min_rating:
            # LiteAPI expects 0-5 scale
            attempt_city["minRating"] = min(float(min_rating), 5.0)
        attempts.append(attempt_city)

        # Attempt 2: relaxed city search (no rating filter, wider timeout)
        attempt_relaxed = dict(base_payload)
        attempt_relaxed["cityName"] = city_clean
        if effective_country:
            attempt_relaxed["countryCode"] = effective_country
        attempt_relaxed["timeout"] = 20
        attempts.append(attempt_relaxed)

        # Attempt 3: AI semantic fallback for misspelled or loosely matched city names
        attempt_ai = dict(base_payload)
        attempt_ai["aiSearch"] = f"good hotels in {city_clean}"
        attempt_ai["timeout"] = 20
        attempts.append(attempt_ai)

        hotel_rows = []
        last_error = None
        async with httpx.AsyncClient(timeout=30) as client:
            for payload in attempts:
                rates_resp = await client.post(
                    f"{LITEAPI_BASE}/hotels/rates",
                    headers=_headers(),
                    json=payload,
                )
                if rates_resp.status_code != 200:
                    last_error = f"{rates_resp.status_code}: {rates_resp.text[:220]}"
                    continue
                raw = rates_resp.json()
                hotel_rows = raw.get("hotels", [])
                if hotel_rows:
                    break

            # Attempt 4: dynamic IATA fallback when city/semantic lookups return no rows
            if not hotel_rows:
                iata_code = await _resolve_iata_code(client, city_clean, effective_country)
                if iata_code:
                    iata_payload = dict(base_payload)
                    iata_payload["iataCode"] = iata_code
                    iata_payload["timeout"] = 20
                    iata_resp = await client.post(
                        f"{LITEAPI_BASE}/hotels/rates",
                        headers=_headers(),
                        json=iata_payload,
                    )
                    if iata_resp.status_code == 200:
                        raw = iata_resp.json()
                        hotel_rows = raw.get("hotels", [])
                    else:
                        last_error = f"{iata_resp.status_code}: {iata_resp.text[:220]}"

        if not hotel_rows:
            return json.dumps(
                {
                    "hotels": [],
                    "note": f"No live rates found in {city_clean} for selected dates. Try nearby dates or broader city query.",
                    "debug": {"last_error": last_error},
                }
            )

        result = []
        for item in hotel_rows:
            hotel = item.get("hotel") or item
            room_types = item.get("roomTypes", []) or []
            hotel_id = item.get("hotelId") or hotel.get("id")

            rate_options = []
            cheapest = None
            for room in room_types:
                for rate in room.get("rates", []) or []:
                    price_data = _extract_price_data(rate)
                    total_price = price_data["total_price"]
                    if total_price <= 0:
                        continue

                    rate_option = {
                        "offer_id": room.get("offerId", ""),
                        "rate_id": rate.get("rateId", ""),
                        "room_name": rate.get("name") or room.get("name") or "Standard Room",
                        "board_name": rate.get("boardName", "Room Only"),
                        "refundability": rate.get("refundability"),
                        "cancellation_policies": rate.get("cancellationPolicies", []),
                        "price": price_data,
                    }
                    rate_options.append(rate_option)
                    if cheapest is None or total_price < cheapest["price"]["total_price"]:
                        cheapest = rate_option

            # Some feeds return only hotel-level minimum rates and no roomTypes/rates.
            if cheapest is None:
                hotel_level_amount, hotel_level_currency = _extract_amount_currency_from_any(item)
                if hotel_level_amount <= 0:
                    hotel_level_amount, hotel_level_currency = _extract_amount_currency_from_any(hotel)
                if hotel_level_amount > 0:
                    cheapest = {
                        "offer_id": item.get("offerId", ""),
                        "rate_id": item.get("rateId", ""),
                        "room_name": "Best Available",
                        "board_name": item.get("boardName", "Room Only"),
                        "refundability": item.get("refundability"),
                        "cancellation_policies": item.get("cancellationPolicies", []),
                        "price": {
                            "total_price": hotel_level_amount,
                            "currency": hotel_level_currency,
                            "taxes": 0,
                            "base_price": hotel_level_amount,
                            "payment_type": item.get("paymentType"),
                        },
                    }

            if not cheapest:
                continue
            if max_price and cheapest["price"]["total_price"] > float(max_price):
                continue

            result.append(
                {
                    "id": hotel_id,
                    "name": hotel.get("name"),
                    "city": hotel.get("city"),
                    "address": hotel.get("address", ""),
                    "stars": hotel.get("stars"),
                    "rating": hotel.get("rating"),
                    "review_count": hotel.get("reviewCount", 0),
                    "photo": hotel.get("main_photo"),
                    "lowest_price": cheapest["price"],
                    "best_offer_id": cheapest["offer_id"],
                    "best_rate_id": cheapest["rate_id"],
                    "best_room_type": cheapest["room_name"],
                    "best_board": cheapest["board_name"],
                    "rate_options": rate_options[:3],
                }
            )
            if len(result) >= max_results:
                break

        if not result:
            # Fallback: fetch city hotel IDs and query /hotels/min-rates so we can still
            # return concrete starting prices when full /hotels/rates is sparse.
            meta_params = {"cityName": city_clean, "limit": min(max_results * 6, 120)}
            if effective_country:
                meta_params["countryCode"] = effective_country
            if min_rating:
                meta_params["minRating"] = min(float(min_rating), 5.0)

            async with httpx.AsyncClient(timeout=30) as client:
                meta_resp = await client.get(
                    f"{LITEAPI_BASE}/data/hotels",
                    headers=_headers(),
                    params=meta_params,
                )

                if meta_resp.status_code == 200:
                    hotels_meta = meta_resp.json().get("data", []) or []
                    hotel_ids = [h.get("id") for h in hotels_meta if h.get("id")][: min(len(hotels_meta), 80)]

                    if hotel_ids:
                        min_rates_resp = await client.post(
                            f"{LITEAPI_BASE}/hotels/min-rates",
                            headers=_headers(),
                            json={
                                "hotelIds": hotel_ids,
                                "occupancies": [{"adults": max(1, guests)}],
                                "checkin": checkin,
                                "checkout": checkout,
                                "currency": "USD",
                                "guestNationality": effective_country or "US",
                                "timeout": 20,
                            },
                        )

                        if min_rates_resp.status_code == 200:
                            min_payload = min_rates_resp.json()
                            min_rows = (
                                min_payload.get("hotels")
                                or min_payload.get("data")
                                or min_payload.get("results")
                                or []
                            )
                            by_id = {}
                            for row in min_rows:
                                hid = row.get("hotelId") or row.get("id")
                                amount, currency = _extract_amount_currency_from_any(row)
                                if hid and amount > 0:
                                    by_id[hid] = {
                                        "total_price": amount,
                                        "currency": currency,
                                    }

                            for hotel in hotels_meta:
                                hid = hotel.get("id")
                                price = by_id.get(hid)
                                if not price:
                                    continue
                                if max_price and price["total_price"] > float(max_price):
                                    continue
                                result.append(
                                    {
                                        "id": hid,
                                        "name": hotel.get("name"),
                                        "city": hotel.get("city"),
                                        "address": hotel.get("address", ""),
                                        "stars": hotel.get("stars"),
                                        "rating": hotel.get("rating"),
                                        "review_count": hotel.get("reviewCount", 0),
                                        "photo": hotel.get("main_photo"),
                                        "lowest_price": price,
                                        "pricing_mode": "min_rates_fallback",
                                    }
                                )
                                if len(result) >= max_results:
                                    break

            if result:
                return json.dumps(
                    {
                        "hotels": result,
                        "total": len(result),
                        "source": "liteapi_min_rates_fallback",
                        "search_context": {
                            "city": city_clean,
                            "country_code": effective_country or None,
                            "checkin": checkin,
                            "checkout": checkout,
                            "guests": guests,
                        },
                    }
                )

            return json.dumps(
                {
                    "hotels": [],
                    "note": "Hotels found, but no qualifying live prices for the selected filters.",
                }
            )

        return json.dumps(
            {
                "hotels": result,
                "total": len(result),
                "source": "liteapi_rates",
                "search_context": {
                    "city": city_clean,
                    "country_code": effective_country or None,
                    "checkin": checkin,
                    "checkout": checkout,
                    "guests": guests,
                },
            }
        )

    except httpx.TimeoutException:
        return json.dumps({"error": "Hotel search timed out. Try again or adjust dates."})
    except Exception as e:
        logger.error("search_hotels error", error=str(e))
        return json.dumps({"error": str(e)})


@tool
@log_tool_call
async def get_nearby_attractions(city: str, category: str = "") -> str:
    """
    Get tourist attractions in a given city, optionally filtered by category.

    Args:
        city: City name (e.g., "Bali", "Paris").
        category: Optional category filter (e.g., "museum", "temple", "beach").

    Returns:
        JSON string with attractions from the local database.
    """
    from app.agents.tools.database_tools import search_attractions
    return await search_attractions.ainvoke({"city": city, "category": category})


@tool
@log_tool_call
async def get_hotel_details(hotel_id: str) -> str:
    """
    Get detailed information about a specific hotel using its liteAPI hotel ID.

    Args:
        hotel_id: The liteAPI hotel ID (e.g., "lp19f1f").

    Returns:
        JSON string with hotel name, description, amenities, star rating, and photo.
    """
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{LITEAPI_BASE}/data/hotel",
                headers=_headers(),
                params={"hotelId": hotel_id},
            )
        if resp.status_code == 200:
            d = resp.json().get("data", {})
            return json.dumps({
                "id": d.get("id"),
                "name": d.get("name"),
                "description": d.get("hotelDescription", "")[:600],
                "stars": d.get("stars"),
                "rating": d.get("rating"),
                "address": d.get("address"),
                "city": d.get("city"),
                "photo": d.get("main_photo"),
            })
        return json.dumps({"error": f"Hotel {hotel_id} not found"})
    except Exception as e:
        return json.dumps({"error": str(e)})


@tool
@log_tool_call
async def prebook_hotel_rate(offer_id: str, use_payment_sdk: bool = False) -> str:
    """
    Create LiteAPI prebook session for a selected hotel offer.
    """
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                f"{LITEAPI_BASE}/rates/prebook",
                headers=_headers(),
                json={"offerId": offer_id, "usePaymentSdk": use_payment_sdk},
            )
        if resp.status_code not in (200, 201):
            return json.dumps(
                {
                    "error": f"Prebook failed ({resp.status_code})",
                    "detail": resp.text[:500],
                }
            )
        data = resp.json().get("data", resp.json())
        return json.dumps(
            {
                "prebook_id": data.get("prebookId") or data.get("id"),
                "total_price": data.get("totalPrice"),
                "currency": data.get("currency", "USD"),
                "cancellation_policies": data.get("cancellationPolicies", []),
                "raw": data,
            }
        )
    except Exception as e:
        return json.dumps({"error": str(e)})


@tool
@log_tool_call
async def book_hotel_rate(
    prebook_id: str,
    first_name: str,
    last_name: str,
    email: str,
    phone: str,
    payment_method: str = "ACC_CREDIT_CARD",
) -> str:
    """
    Confirm LiteAPI hotel booking from a prebook ID.
    """
    try:
        holder = {
            "firstName": first_name,
            "lastName": last_name,
            "email": email,
            "phone": phone,
        }
        guests = [
            {
                "occupancyNumber": 1,
                "firstName": first_name,
                "lastName": last_name,
                "email": email,
                "phone": phone,
            }
        ]
        payment = {"method": payment_method}

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{LITEAPI_BASE}/rates/book",
                headers=_headers(),
                json={
                    "prebookId": prebook_id,
                    "holder": holder,
                    "guests": guests,
                    "payment": payment,
                },
            )
        if resp.status_code not in (200, 201):
            return json.dumps(
                {
                    "error": f"Booking failed ({resp.status_code})",
                    "detail": resp.text[:700],
                }
            )
        data = resp.json().get("data", resp.json())
        return json.dumps(
            {
                "status": "confirmed",
                "booking_id": data.get("bookingId") or data.get("id"),
                "confirmation_number": data.get("bookingId") or data.get("confirmationNumber"),
                "total_price": data.get("totalPrice") or data.get("price"),
                "currency": data.get("currency", "USD"),
                "hotel": data.get("hotel", {}),
                "raw": data,
            }
        )
    except Exception as e:
        return json.dumps({"error": str(e)})


@tool
@log_tool_call
async def prebook_hotel(offer_id: str, use_payment_sdk: bool = False) -> str:
    """
    Backward-compatible alias for prebook_hotel_rate.
    """
    return await prebook_hotel_rate.ainvoke(
        {"offer_id": offer_id, "use_payment_sdk": use_payment_sdk}
    )


@tool
@log_tool_call
async def book_hotel(
    prebook_id: str,
    first_name: str,
    last_name: str,
    email: str,
    phone: str,
    payment_method: str = "ACC_CREDIT_CARD",
) -> str:
    """
    Backward-compatible alias for book_hotel_rate.
    """
    return await book_hotel_rate.ainvoke(
        {
            "prebook_id": prebook_id,
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
            "phone": phone,
            "payment_method": payment_method,
        }
    )


HOTEL_TOOLS = [
    search_hotels,
    get_nearby_attractions,
    get_hotel_details,
    prebook_hotel_rate,
    book_hotel_rate,
    prebook_hotel,
    book_hotel,
]
