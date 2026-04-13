"""
User management router.

Endpoints:
  GET  /api/v1/users/me             - current user profile
  PATCH /api/v1/users/me            - update profile
  GET  /api/v1/users/me/preferences - travel preferences
  PUT  /api/v1/users/me/preferences - update preferences (+ embed)
  GET  /api/v1/users/me/travel-history - past trip history
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Any, Dict, List, Optional

from app.api.dependencies.auth import get_optional_user
from app.services.database import db_service
from app.services.gemini import gemini_service
from app.logging_config import get_logger

logger = get_logger("api.users")
router = APIRouter(prefix="/users", tags=["users"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None


class UserPreferencesUpdate(BaseModel):
    travel_style: Optional[List[str]] = None
    travel_pace: Optional[str] = None
    accommodation_preference: Optional[str] = None
    interests: Optional[List[str]] = None
    dietary_preferences: Optional[List[str]] = None
    typical_daily_budget_min: Optional[float] = None
    typical_daily_budget_max: Optional[float] = None
    preferred_airlines: Optional[List[str]] = None
    seat_preference: Optional[str] = None
    preferred_flight_class: Optional[str] = None
    max_layovers: Optional[int] = None
    preferred_destinations: Optional[List[str]] = None
    avoided_destinations: Optional[List[str]] = None
    preference_text: Optional[str] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_preference_summary(prefs: Dict[str, Any]) -> str:
    """Convert a preferences dict into a natural language summary for embedding."""
    parts = []
    if prefs.get("travel_style"):
        parts.append(f"Travel style: {', '.join(prefs['travel_style'])}")
    if prefs.get("travel_pace"):
        parts.append(f"Pace: {prefs['travel_pace']}")
    if prefs.get("interests"):
        parts.append(f"Interests: {', '.join(prefs['interests'])}")
    if prefs.get("accommodation_preference"):
        parts.append(f"Accommodation: {prefs['accommodation_preference']}")
    if prefs.get("dietary_preferences"):
        parts.append(f"Diet: {', '.join(prefs['dietary_preferences'])}")
    if prefs.get("preferred_destinations"):
        parts.append(f"Favourite destinations: {', '.join(prefs['preferred_destinations'])}")
    if prefs.get("avoided_destinations"):
        parts.append(f"Avoided destinations: {', '.join(prefs['avoided_destinations'])}")
    if prefs.get("preference_text"):
        parts.append(prefs["preference_text"])
    return ". ".join(parts) if parts else "General traveller with no specific preferences."


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/me")
async def get_my_profile(current_user: Dict[str, Any] = Depends(get_optional_user)):
    """Get the current authenticated user's profile."""
    user_id = current_user["id"]
    user = await db_service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found")
    user.pop("password_hash", None)
    return user


@router.patch("/me")
async def update_my_profile(
    data: UserProfileUpdate,
    current_user: Dict[str, Any] = Depends(get_optional_user),
):
    """Update the current user's profile fields."""
    user_id = current_user["id"]
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    updated = await db_service.update_user(user_id, update_data)
    if not updated:
        raise HTTPException(status_code=404, detail="User not found or update failed")
    updated.pop("password_hash", None)
    return updated


@router.get("/me/preferences")
async def get_my_preferences(current_user: Dict[str, Any] = Depends(get_optional_user)):
    """Get the current user's travel preferences."""
    user_id = current_user["id"]
    try:
        if not db_service.supabase:
            raise HTTPException(status_code=503, detail="Database unavailable")
        result = db_service.supabase.table("user_preferences") \
            .select("*") \
            .eq("user_id", user_id) \
            .execute()
        if result.data:
            prefs = result.data[0]
            prefs.pop("preference_embedding", None)
            return prefs
        return {"user_id": user_id, "preferences": None}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_my_preferences error", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve preferences")


@router.put("/me/preferences")
async def update_my_preferences(
    data: UserPreferencesUpdate,
    current_user: Dict[str, Any] = Depends(get_optional_user),
):
    """
    Upsert the current user's travel preferences.
    Automatically generates and stores a preference embedding for RAG.
    """
    user_id = current_user["id"]
    try:
        if not db_service.supabase:
            raise HTTPException(status_code=503, detail="Database unavailable")

        update_fields = {k: v for k, v in data.model_dump().items() if v is not None}
        update_fields["user_id"] = user_id

        # Generate preference text if not provided
        if not update_fields.get("preference_text") and len(update_fields) > 1:
            update_fields["preference_text"] = _build_preference_summary(update_fields)

        # Generate embedding for RAG
        summary_text = update_fields.get("preference_text", "")
        if summary_text:
            embedding = await gemini_service.get_embedding(summary_text)
            if embedding:
                update_fields["preference_embedding"] = embedding

        result = db_service.supabase.table("user_preferences") \
            .upsert(update_fields, on_conflict="user_id") \
            .execute()

        if result.data:
            prefs = result.data[0]
            prefs.pop("preference_embedding", None)
            return prefs
        raise HTTPException(status_code=500, detail="Failed to update preferences")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("update_my_preferences error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/me/travel-history")
async def get_my_travel_history(
    limit: int = 10,
    offset: int = 0,
    current_user: Dict[str, Any] = Depends(get_optional_user),
):
    """Get the current user's past travel history entries."""
    user_id = current_user["id"]
    try:
        if not db_service.supabase:
            raise HTTPException(status_code=503, detail="Database unavailable")
        result = db_service.supabase.table("user_travel_history") \
            .select("id, destination, start_date, end_date, description, rating, tags, created_at") \
            .eq("user_id", user_id) \
            .order("start_date", desc=True) \
            .range(offset, offset + limit - 1) \
            .execute()
        return {"items": result.data or [], "limit": limit, "offset": offset}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_my_travel_history error", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve travel history")
