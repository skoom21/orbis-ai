"""
Notifications router.

Endpoints:
  GET  /api/v1/notifications              - list notifications (filter by is_read)
  POST /api/v1/notifications/{id}/read    - mark one as read
  POST /api/v1/notifications/read-all     - mark all as read
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Any, Dict, Optional

from app.api.dependencies.auth import get_optional_user
from app.services.database import db_service
from app.logging_config import get_logger

logger = get_logger("api.notifications")
router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
async def list_notifications(
    is_read: Optional[bool] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    current_user: Dict[str, Any] = Depends(get_optional_user),
):
    """Get notifications for the current user."""
    user_id = current_user["id"]
    try:
        if not db_service.supabase:
            raise HTTPException(status_code=503, detail="Database unavailable")
        query = db_service.supabase.table("notifications") \
            .select("*") \
            .eq("user_id", user_id) \
            .order("created_at", desc=True) \
            .limit(limit)
        if is_read is not None:
            query = query.eq("is_read", is_read)
        result = query.execute()

        # Get unread count
        unread = db_service.supabase.table("notifications") \
            .select("id", count="exact") \
            .eq("user_id", user_id) \
            .eq("is_read", False) \
            .execute()

        return {
            "notifications": result.data or [],
            "unread_count": unread.count or 0,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: Dict[str, Any] = Depends(get_optional_user),
):
    """Mark a single notification as read."""
    user_id = current_user["id"]
    try:
        if not db_service.supabase:
            raise HTTPException(status_code=503, detail="Database unavailable")
        result = db_service.supabase.table("notifications") \
            .update({"is_read": True}) \
            .eq("id", notification_id) \
            .eq("user_id", user_id) \
            .execute()
        if result.data:
            return result.data[0]
        raise HTTPException(status_code=404, detail="Notification not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/read-all")
async def mark_all_read(
    current_user: Dict[str, Any] = Depends(get_optional_user),
):
    """Mark all unread notifications as read."""
    user_id = current_user["id"]
    try:
        if not db_service.supabase:
            raise HTTPException(status_code=503, detail="Database unavailable")
        db_service.supabase.table("notifications") \
            .update({"is_read": True}) \
            .eq("user_id", user_id) \
            .eq("is_read", False) \
            .execute()
        return {"status": "all_read"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
