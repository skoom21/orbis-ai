"""
Hotel search tools for the Hotel Agent.

Uses liteAPI for live hotel data and rates.
API Key: stored in LITEAPI_KEY env var (sandbox key: sand_583409da-28e0-4ca1-ad0e-ddd61b78cb85)
"""

import json
import os
import httpx
from langchain_core.tools import tool
from app.logging_config import get_logger

logger = get_logger("agents.tools.hotel")

LITEAPI_KEY = os.environ.get("LITEAPI_KEY", "sand_583409da-28e0-4ca1-ad0e-ddd61b78cb85")
LITEAPI_BASE = "https://api.liteapi.travel/v3.0"

_CITY_TO_COUNTRY = {
    "bali": "ID", "jakarta": "ID", "lombok": "ID",
    "paris": "FR", "nice": "FR", "lyon": "FR",
    "london": "GB", "manchester": "GB",
    "new york": "US", "los angeles": "US", "chicago": "US", "miami": "US",
    "tokyo": "JP", "osaka": "JP", "kyoto": "JP",
    "dubai": "AE", "abu dhabi": "AE",
    "singapore": "SG",
    "bangkok": "TH", "phuket": "TH", "chiang mai": "TH",
    "rome": "IT", "milan": "IT", "venice": "IT", "florence": "IT",
    "barcelona": "ES", "madrid": "ES",
    "amsterdam": "NL",
    "berlin": "DE", "munich": "DE",
    "istanbul": "TR",
    "karachi": "PK", "lahore": "PK", "islamabad": "PK",
}


def _headers() -> dict:
    return {
        "X-API-Key": LITEAPI_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


@tool
async def search_hotels(
    city: str,
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
        country_code = _CITY_TO_COUNTRY.get(city.lower(), "")

        # Step 1: Get hotel metadata list
        params = {"cityName": city, "limit": min(max_results * 4, 50)}
        if country_code:
            params["countryCode"] = country_code
        if min_rating:
            params["minRating"] = min_rating

        async with httpx.AsyncClient(timeout=20) as client:
            meta_resp = await client.get(
                f"{LITEAPI_BASE}/data/hotels",
                headers=_headers(),
                params=params,
            )
            if meta_resp.status_code != 200:
                return json.dumps({"error": f"Hotel metadata search failed ({meta_resp.status_code})", "hotels": []})

            hotel_list = meta_resp.json().get("data", [])
            if not hotel_list:
                return json.dumps({"hotels": [], "note": f"No hotels found in {city}"})

            hotel_ids = [h["id"] for h in hotel_list[:25]]

            # Step 2: Get live rates
            rates_payload = {
                "hotelIds": hotel_ids,
                "occupancies": [{"adults": guests}],
                "checkin": checkin,
                "checkout": checkout,
                "currency": "USD",
                "guestNationality": "US",
                "maxRatesPerHotel": 1,
            }
            rates_resp = await client.post(
                f"{LITEAPI_BASE}/hotels/rates",
                headers=_headers(),
                json=rates_payload,
            )

        # Build hotel→cheapest rate lookup
        rate_by_id: dict = {}
        if rates_resp.status_code == 200:
            for h in rates_resp.json().get("hotels", []):
                hid = h.get("hotelId") or h.get("id")
                for rt in h.get("roomTypes", []):
                    for rate in rt.get("rates", []):
                        total_list = rate.get("retailRate", {}).get("total", [{}])
                        price = total_list[0].get("amount", 0) if total_list else 0
                        if price > 0 and (hid not in rate_by_id or price < rate_by_id[hid]["price"]):
                            rate_by_id[hid] = {
                                "price": price,
                                "currency": total_list[0].get("currency", "USD"),
                                "room_name": rate.get("name", "Standard Room"),
                                "board_name": rate.get("boardName", "Room Only"),
                                "offer_id": rt.get("offerId", ""),
                                "rate_id": rate.get("rateId", ""),
                            }

        result = []
        for hotel in hotel_list:
            hid = hotel.get("id")
            rate = rate_by_id.get(hid)
            if not rate:
                continue
            if max_price and rate["price"] > max_price:
                continue
            result.append({
                "id": hid,
                "name": hotel.get("name"),
                "city": hotel.get("city"),
                "address": hotel.get("address", ""),
                "stars": hotel.get("stars"),
                "rating": hotel.get("rating"),
                "review_count": hotel.get("reviewCount", 0),
                "photo": hotel.get("main_photo"),
                "total_price_usd": rate["price"],
                "currency": rate["currency"],
                "room_type": rate["room_name"],
                "board": rate["board_name"],
                "offer_id": rate["offer_id"],
                "rate_id": rate["rate_id"],
            })
            if len(result) >= max_results:
                break

        # Fallback: return metadata only if no rates found
        if not result:
            result = [
                {
                    "id": h.get("id"), "name": h.get("name"),
                    "city": h.get("city"), "stars": h.get("stars"),
                    "rating": h.get("rating"), "photo": h.get("main_photo"),
                }
                for h in hotel_list[:max_results]
            ]
            return json.dumps({
                "hotels": result,
                "note": "Metadata only — no live rates available for these exact dates. Consider nearby dates.",
            })

        return json.dumps({"hotels": result, "total": len(result)})

    except httpx.TimeoutException:
        return json.dumps({"error": "Hotel search timed out. Try again or adjust dates."})
    except Exception as e:
        logger.error("search_hotels error", error=str(e))
        return json.dumps({"error": str(e)})


@tool
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


HOTEL_TOOLS = [search_hotels, get_nearby_attractions, get_hotel_details]
