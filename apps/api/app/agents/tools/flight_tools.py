"""
Flight search tools for the Flight Agent.

Uses SerpApi Google Flights API — 250 free searches/month, no enterprise needed.
Set SERPAPI_KEY in .env. Sign up free at https://serpapi.com
"""

import os
import json
import httpx
from langchain_core.tools import tool
from app.logging_config import get_logger

logger = get_logger("agents.tools.flight")

SERPAPI_KEY = os.environ.get("SERPAPI_KEY", "")
SERPAPI_BASE = "https://serpapi.com/search.json"

# Common city → IATA airport mappings to help resolve plain city names
_CITY_TO_IATA = {
    "karachi": "KHI", "lahore": "LHE", "islamabad": "ISB",
    "dubai": "DXB", "abu dhabi": "AUH",
    "london": "LHR", "manchester": "MAN",
    "paris": "CDG",
    "new york": "JFK", "los angeles": "LAX", "chicago": "ORD", "miami": "MIA",
    "tokyo": "NRT", "osaka": "KIX", "kyoto": "KIX",
    "bali": "DPS", "jakarta": "CGK",
    "bangkok": "BKK", "phuket": "HKT",
    "singapore": "SIN",
    "sydney": "SYD", "melbourne": "MEL",
    "toronto": "YYZ", "vancouver": "YVR",
    "rome": "FCO", "milan": "MXP",
    "barcelona": "BCN", "madrid": "MAD",
    "amsterdam": "AMS",
    "berlin": "BER", "munich": "MUC",
    "istanbul": "IST",
    "hong kong": "HKG",
    "kuala lumpur": "KUL",
    "mumbai": "BOM", "delhi": "DEL",
}


def _city_to_iata(city: str) -> str:
    """Convert a city name to an IATA code if known, otherwise return as-is (may already be IATA)."""
    code = _CITY_TO_IATA.get(city.strip().lower())
    if code:
        return code
    # If it looks like a 3-letter IATA code already, use it uppercase
    stripped = city.strip()
    if len(stripped) == 3 and stripped.isalpha():
        return stripped.upper()
    return stripped  # SerpApi also accepts city names / location kgmids


@tool
async def search_flights(
    origin: str,
    destination: str,
    departure_date: str,
    return_date: str = "",
    passengers: int = 1,
    cabin_class: str = "ECONOMY",
    max_results: int = 5,
) -> str:
    """
    Search for available flights between two airports using Google Flights data (via SerpApi).

    Args:
        origin: Departure city name or IATA code (e.g., "Karachi", "KHI", "London", "LHR").
        destination: Arrival city name or IATA code (e.g., "Bali", "DPS", "Paris", "CDG").
        departure_date: Departure date in YYYY-MM-DD format.
        return_date: Return date in YYYY-MM-DD format. Leave empty for one-way.
        passengers: Number of adult passengers (default 1).
        cabin_class: ECONOMY, PREMIUM_ECONOMY, BUSINESS, or FIRST.
        max_results: Maximum number of flight options to return (default 5).

    Returns:
        JSON string with available flights including airline, price, duration, and stops.
    """
    if not SERPAPI_KEY:
        logger.warning("SERPAPI_KEY not set — returning mock flight data")
        return json.dumps({
            "flights": [
                {
                    "airline": "Emirates",
                    "flight_number": "EK 607",
                    "origin": origin,
                    "destination": destination,
                    "departure": f"{departure_date} 02:30",
                    "arrival": f"{departure_date} 11:00",
                    "duration": "8h 30m",
                    "stops": 0,
                    "price_usd": 650,
                    "cabin": cabin_class,
                },
                {
                    "airline": "PIA",
                    "flight_number": "PK 855",
                    "origin": origin,
                    "destination": destination,
                    "departure": f"{departure_date} 05:00",
                    "arrival": f"{departure_date} 17:30",
                    "duration": "12h 30m",
                    "stops": 1,
                    "price_usd": 420,
                    "cabin": cabin_class,
                },
            ],
            "note": "Mock data — set SERPAPI_KEY in .env for live Google Flights results",
        })

    origin_id = _city_to_iata(origin)
    dest_id = _city_to_iata(destination)

    # SerpApi travel class codes
    class_map = {"ECONOMY": "1", "PREMIUM_ECONOMY": "2", "BUSINESS": "3", "FIRST": "4"}
    travel_class = class_map.get(cabin_class.upper(), "1")

    params = {
        "engine": "google_flights",
        "departure_id": origin_id,
        "arrival_id": dest_id,
        "outbound_date": departure_date,
        "adults": passengers,
        "travel_class": travel_class,
        "currency": "USD",
        "hl": "en",
        "api_key": SERPAPI_KEY,
        "type": "1" if return_date else "2",  # 1=round trip, 2=one way
    }
    if return_date:
        params["return_date"] = return_date

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(SERPAPI_BASE, params=params)

        if resp.status_code != 200:
            return json.dumps({"error": f"Flight search failed ({resp.status_code})", "flights": []})

        data = resp.json()

        # SerpApi returns best_flights and other_flights
        all_flights = data.get("best_flights", []) + data.get("other_flights", [])

        results = []
        for offer in all_flights[:max_results]:
            legs = offer.get("flights", [])
            if not legs:
                continue

            first_leg = legs[0]
            last_leg = legs[-1]
            layovers = offer.get("layovers", [])

            stops = len(legs) - 1
            total_minutes = offer.get("total_duration", 0)
            hours, mins = divmod(total_minutes, 60)

            results.append({
                "airline": first_leg.get("airline"),
                "airline_logo": first_leg.get("airline_logo"),
                "flight_number": first_leg.get("flight_number"),
                "origin_airport": first_leg.get("departure_airport", {}).get("id"),
                "origin_name": first_leg.get("departure_airport", {}).get("name"),
                "destination_airport": last_leg.get("arrival_airport", {}).get("id"),
                "destination_name": last_leg.get("arrival_airport", {}).get("name"),
                "departure_time": first_leg.get("departure_airport", {}).get("time"),
                "arrival_time": last_leg.get("arrival_airport", {}).get("time"),
                "duration": f"{hours}h {mins}m" if total_minutes else "N/A",
                "stops": stops,
                "layovers": [{"airport": lv.get("name"), "duration_min": lv.get("duration")} for lv in layovers],
                "price_usd": offer.get("price"),
                "cabin": cabin_class,
                "airplane": first_leg.get("airplane"),
                "legroom": first_leg.get("legroom"),
                "type": offer.get("type"),
            })

        price_insights = data.get("price_insights", {})
        return json.dumps({
            "flights": results,
            "total_found": len(results),
            "price_insights": {
                "lowest_price": price_insights.get("lowest_price"),
                "price_level": price_insights.get("price_level"),
                "typical_range": price_insights.get("typical_price_range"),
            } if price_insights else None,
        })

    except httpx.TimeoutException:
        return json.dumps({"error": "Flight search timed out. Try again."})
    except Exception as e:
        logger.error("search_flights error", error=str(e))
        return json.dumps({"error": str(e)})


@tool
async def get_airport_info(query: str) -> str:
    """
    Look up airport information by city name or IATA code.

    Args:
        query: City name (e.g., "Karachi") or IATA code (e.g., "KHI").

    Returns:
        JSON string with airport name, IATA code, city, and country.
    """
    iata = _city_to_iata(query)
    # Return from our local DB first
    from app.agents.tools.database_tools import search_airports
    result = await search_airports.ainvoke({"query": query})
    parsed = json.loads(result)
    if parsed.get("airports"):
        return result
    # Fallback: return the resolved IATA code
    return json.dumps({"airports": [{"iata_code": iata, "note": f"Resolved from '{query}'"}]})


FLIGHT_TOOLS = [search_flights, get_airport_info]
