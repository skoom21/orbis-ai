"""
Trip management router.

Endpoints:
  POST  /api/v1/trips                      - create trip
  GET   /api/v1/trips                      - list user trips
  GET   /api/v1/trips/{id}                 - get trip details
  PATCH /api/v1/trips/{id}                 - update trip metadata
  PATCH /api/v1/trips/{id}/itinerary       - update itinerary JSON
  POST  /api/v1/trips/{id}/cancel          - cancel trip
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Any, Dict, List, Optional

from app.api.dependencies.auth import get_optional_user
from app.services.database import db_service
from app.logging_config import get_logger

logger = get_logger("api.trips")
router = APIRouter(prefix="/trips", tags=["trips"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class TripCreate(BaseModel):
    title: str
    description: Optional[str] = None
    conversation_id: Optional[str] = None
    destinations: List[Dict[str, Any]]
    start_date: str
    end_date: str
    trip_type: Optional[str] = "leisure"
    number_of_travelers: Optional[int] = 1
    estimated_budget: Optional[float] = 0
    currency: Optional[str] = "USD"


class TripUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    estimated_budget: Optional[float] = None
    currency: Optional[str] = None
    status: Optional[str] = None
    number_of_travelers: Optional[int] = None


class ItineraryUpdate(BaseModel):
    itinerary: Dict[str, Any]


class CancelTrip(BaseModel):
    reason: Optional[str] = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("", status_code=201)
async def create_trip(
    data: TripCreate,
    current_user: Dict[str, Any] = Depends(get_optional_user),
):
    """Create a new trip."""
    user_id = current_user["id"]
    try:
        if not db_service.supabase:
            raise HTTPException(status_code=503, detail="Database unavailable")
        result = db_service.supabase.table("trips").insert({
            "user_id": user_id,
            "title": data.title,
            "description": data.description,
            "conversation_id": data.conversation_id,
            "destinations": data.destinations,
            "start_date": data.start_date,
            "end_date": data.end_date,
            "trip_type": data.trip_type,
            "number_of_travelers": data.number_of_travelers,
            "estimated_budget": data.estimated_budget,
            "currency": data.currency,
            "status": "planning",
        }).execute()
        if result.data:
            return result.data[0]
        raise HTTPException(status_code=500, detail="Failed to create trip")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("create_trip error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("")
async def list_trips(
    status: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Dict[str, Any] = Depends(get_optional_user),
):
    """List all trips for the current user, optionally filtered by status."""
    user_id = current_user["id"]
    try:
        if not db_service.supabase:
            raise HTTPException(status_code=503, detail="Database unavailable")
        query = db_service.supabase.table("trips") \
            .select("id, title, status, destinations, start_date, end_date, estimated_budget, actual_cost, currency, trip_type, created_at") \
            .eq("user_id", user_id) \
            .order("created_at", desc=True) \
            .range(offset, offset + limit - 1)
        if status:
            query = query.eq("status", status)
        result = query.execute()
        return {"items": result.data or [], "limit": limit, "offset": offset}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("list_trips error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{trip_id}")
async def get_trip(
    trip_id: str,
    current_user: Dict[str, Any] = Depends(get_optional_user),
):
    """Get full trip details including bookings."""
    user_id = current_user["id"]
    try:
        if not db_service.supabase:
            raise HTTPException(status_code=503, detail="Database unavailable")
        trip = db_service.supabase.table("trips") \
            .select("*") \
            .eq("id", trip_id) \
            .eq("user_id", user_id) \
            .single() \
            .execute()
        if not trip.data:
            raise HTTPException(status_code=404, detail="Trip not found")
        bookings = db_service.supabase.table("bookings") \
            .select("*") \
            .eq("trip_id", trip_id) \
            .execute()
        return {"trip": trip.data, "bookings": bookings.data or []}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_trip error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{trip_id}")
async def update_trip(
    trip_id: str,
    data: TripUpdate,
    current_user: Dict[str, Any] = Depends(get_optional_user),
):
    """Update trip metadata."""
    user_id = current_user["id"]
    update_fields = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    try:
        if not db_service.supabase:
            raise HTTPException(status_code=503, detail="Database unavailable")
        result = db_service.supabase.table("trips") \
            .update(update_fields) \
            .eq("id", trip_id) \
            .eq("user_id", user_id) \
            .execute()
        if result.data:
            return result.data[0]
        raise HTTPException(status_code=404, detail="Trip not found or update failed")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("update_trip error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{trip_id}/itinerary")
async def update_trip_itinerary(
    trip_id: str,
    data: ItineraryUpdate,
    current_user: Dict[str, Any] = Depends(get_optional_user),
):
    """Replace the itinerary JSON for a trip."""
    user_id = current_user["id"]
    try:
        if not db_service.supabase:
            raise HTTPException(status_code=503, detail="Database unavailable")
        result = db_service.supabase.table("trips") \
            .update({"itinerary": data.itinerary, "itinerary_generated_at": "now()"}) \
            .eq("id", trip_id) \
            .eq("user_id", user_id) \
            .execute()
        if result.data:
            return {"status": "updated", "trip_id": trip_id}
        raise HTTPException(status_code=404, detail="Trip not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("update_trip_itinerary error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{trip_id}/cancel")
async def cancel_trip(
    trip_id: str,
    data: CancelTrip = CancelTrip(),
    current_user: Dict[str, Any] = Depends(get_optional_user),
):
    """Cancel a trip and all pending bookings."""
    user_id = current_user["id"]
    try:
        if not db_service.supabase:
            raise HTTPException(status_code=503, detail="Database unavailable")
        # Cancel trip
        db_service.supabase.table("trips") \
            .update({"status": "cancelled"}) \
            .eq("id", trip_id) \
            .eq("user_id", user_id) \
            .execute()
        # Cancel pending bookings
        db_service.supabase.table("bookings") \
            .update({"status": "cancelled"}) \
            .eq("trip_id", trip_id) \
            .in_("status", ["pending", "confirmed"]) \
            .execute()
        return {"status": "cancelled", "trip_id": trip_id, "reason": data.reason}
    except Exception as e:
        logger.error("cancel_trip error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))
