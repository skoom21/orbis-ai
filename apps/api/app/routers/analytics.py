"""
Analytics router — user stats and popular destinations.

Endpoints:
  GET /api/v1/analytics/user-stats            - stats for current user
  GET /api/v1/analytics/popular-destinations  - global popular destinations
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Any, Dict

from app.api.dependencies.auth import get_optional_user
from app.services.database import db_service
from app.logging_config import get_logger

logger = get_logger("api.analytics")
router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/user-stats")
async def get_user_stats(
    current_user: Dict[str, Any] = Depends(get_optional_user),
):
    """Return aggregate stats for the current user (trips, spending, messages)."""
    user_id = current_user["id"]
    try:
        if not db_service.supabase:
            raise HTTPException(status_code=503, detail="Database unavailable")

        trips = db_service.supabase.table("trips").select("id, status, actual_cost, created_at") \
            .eq("user_id", user_id).execute()
        messages = db_service.supabase.table("messages") \
            .select("id", count="exact") \
            .eq("role", "user") \
            .execute()
        conversations = db_service.supabase.table("conversations") \
            .select("id", count="exact") \
            .eq("user_id", user_id) \
            .execute()

        trip_list = trips.data or []
        total_trips = len(trip_list)
        completed = sum(1 for t in trip_list if t.get("status") == "completed")
        total_spent = sum(float(t.get("actual_cost") or 0) for t in trip_list)

        return {
            "user_id": user_id,
            "total_trips": total_trips,
            "completed_trips": completed,
            "total_spent_usd": round(total_spent, 2),
            "total_conversations": conversations.count or 0,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_user_stats error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/popular-destinations")
async def get_popular_destinations(
    limit: int = Query(10, ge=1, le=50),
):
    """Return top destinations by trip count (public endpoint)."""
    try:
        if not db_service.supabase:
            raise HTTPException(status_code=503, detail="Database unavailable")

        result = db_service.supabase.table("cities") \
            .select("id, name, country_code, popularity_score, tourist_rating") \
            .order("popularity_score", desc=True) \
            .limit(limit) \
            .execute()
        return {"destinations": result.data or []}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
