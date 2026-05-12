"""
Trip and booking management tools for the Booking and Itinerary agents.
"""

import json
from langchain_core.tools import tool
from app.agents.tools.base import log_tool_call
from app.services.database import db_service
from app.logging_config import get_logger

logger = get_logger("agents.tools.trip")


@tool
@log_tool_call
async def create_trip(
    user_id: str,
    title: str,
    destinations: str,
    start_date: str,
    end_date: str,
    estimated_budget: float = 0,
    trip_type: str = "relaxation",
    number_of_travelers: int = 1,
    currency: str = "USD",
) -> str:
    """
    Create a new trip record in the database.

    Args:
        user_id: The UUID of the user creating the trip.
        title: Trip title (e.g., "Paris Adventure - 5 Days").
        destinations: JSON array string of destinations e.g. '[{"city":"Paris","country":"France"}]'.
        start_date: Trip start date in YYYY-MM-DD format.
        end_date: Trip end date in YYYY-MM-DD format.
        estimated_budget: Estimated total budget in specified currency.
        trip_type: Type of trip: adventure, cultural, relaxation, business, family, romantic, solo.
        number_of_travelers: Number of travelers.
        currency: Budget currency code (default USD).

    Returns:
        JSON string with the created trip id and details.
    """
    try:
        if not db_service.supabase:
            return json.dumps({"error": "Database not available"})
        try:
            dest_list = json.loads(destinations)
        except Exception:
            dest_list = [{"city": destinations}]

        result = db_service.supabase.table("trips").insert({
            "user_id": user_id,
            "title": title,
            "destinations": dest_list,
            "start_date": start_date,
            "end_date": end_date,
            "estimated_budget": estimated_budget,
            "trip_type": trip_type,
            "number_of_travelers": number_of_travelers,
            "currency": currency,
            "status": "planning",
        }).execute()
        if result.data:
            return json.dumps({"trip": result.data[0], "status": "created"})
        return json.dumps({"error": "Failed to create trip"})
    except Exception as e:
        logger.error("create_trip error", error=str(e))
        return json.dumps({"error": str(e)})


@tool
@log_tool_call
async def get_trip_summary(trip_id: str) -> str:
    """
    Retrieve full details for an existing trip including bookings.

    Args:
        trip_id: The UUID of the trip.

    Returns:
        JSON string with trip details and associated bookings.
    """
    try:
        if not db_service.supabase:
            return json.dumps({"error": "Database not available"})
        trip = db_service.supabase.table("trips").select("*").eq("id", trip_id).single().execute()
        if not trip.data:
            return json.dumps({"error": "Trip not found"})
        bookings = db_service.supabase.table("bookings") \
            .select("booking_type, status, provider, price, currency, confirmation_number") \
            .eq("trip_id", trip_id).execute()
        return json.dumps({
            "trip": {k: v for k, v in trip.data.items() if k != "itinerary"},
            "bookings": bookings.data or [],
        })
    except Exception as e:
        logger.error("get_trip_summary error", error=str(e))
        return json.dumps({"error": str(e)})


@tool
@log_tool_call
async def update_itinerary(trip_id: str, itinerary_json: str) -> str:
    """
    Update the itinerary for an existing trip.

    Args:
        trip_id: The UUID of the trip to update.
        itinerary_json: A JSON string representing the itinerary structure.
            Example: '{"day_1": {"date": "2025-06-15", "activities": [...]}}'

    Returns:
        JSON string confirming the update.
    """
    try:
        if not db_service.supabase:
            return json.dumps({"error": "Database not available"})
        try:
            itinerary = json.loads(itinerary_json)
        except Exception:
            return json.dumps({"error": "itinerary_json must be valid JSON"})
        result = db_service.supabase.table("trips") \
            .update({"itinerary": itinerary}) \
            .eq("id", trip_id).execute()
        return json.dumps({"status": "updated", "trip_id": trip_id})
    except Exception as e:
        logger.error("update_itinerary error", error=str(e))
        return json.dumps({"error": str(e)})


@tool
@log_tool_call
async def create_booking(
    trip_id: str,
    user_id: str,
    booking_type: str,
    provider: str,
    details: str,
    price: float,
    currency: str = "USD",
    status: str = "confirmed",
) -> str:
    """
    Create a booking record for a trip (flight, hotel, activity, etc.).

    Args:
        trip_id: The UUID of the trip this booking belongs to.
        user_id: The UUID of the user.
        booking_type: Type of booking: flight, hotel, activity, transfer.
        provider: Service provider name (e.g., "Amadeus", "Booking.com").
        details: JSON string with booking-specific details (e.g., flight numbers, hotel name).
        price: Total price of the booking.
        currency: Currency code (default USD).
        status: Booking lifecycle status. Must match booking_status enum
            (searching, held, payment_pending, confirmed, cancelled, refunded, failed).
            Defaults to confirmed for finalized bookings.

    Returns:
        JSON string with the created booking id and status.
    """
    try:
        if not db_service.supabase:
            return json.dumps({"error": "Database not available"})
        try:
            details_dict = json.loads(details)
        except Exception:
            details_dict = {"info": details}
        allowed_statuses = {
            "searching",
            "held",
            "payment_pending",
            "confirmed",
            "cancelled",
            "refunded",
            "failed",
        }
        normalized_status = (status or "confirmed").strip().lower()
        if normalized_status not in allowed_statuses:
            normalized_status = "confirmed"

        result = db_service.supabase.table("bookings").insert({
            "trip_id": trip_id,
            "user_id": user_id,
            "booking_type": booking_type,
            "provider": provider,
            "details": details_dict,
            "price": price,
            "currency": currency,
            "status": normalized_status,
        }).execute()
        if result.data:
            return json.dumps({"booking": result.data[0], "status": "created"})
        return json.dumps({"error": "Failed to create booking"})
    except Exception as e:
        logger.error("create_booking error", error=str(e))
        return json.dumps({"error": str(e)})


TRIP_TOOLS = [create_trip, get_trip_summary, update_itinerary, create_booking]
