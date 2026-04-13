"""
Agent observability router — feedback and run logging.

Endpoints:
  POST /api/v1/agent-feedback  - submit thumbs up/down on a message
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, List, Optional

from app.api.dependencies.auth import get_optional_user
from app.services.database import db_service
from app.logging_config import get_logger

logger = get_logger("api.observability")
router = APIRouter(tags=["observability"])


class AgentFeedback(BaseModel):
    message_id: str
    feedback_type: str        # "thumbs_up" | "thumbs_down" | "rating"
    rating: Optional[int] = None     # 1-5
    comment: Optional[str] = None
    issues: Optional[List[str]] = None   # ["wrong_flights", "hallucinated_dates", ...]


@router.post("/agent-feedback")
async def submit_agent_feedback(
    data: AgentFeedback,
    current_user: Dict[str, Any] = Depends(get_optional_user),
):
    """Submit user feedback on an AI response for MARL training data collection."""
    user_id = current_user["id"]
    try:
        if not db_service.supabase:
            raise HTTPException(status_code=503, detail="Database unavailable")

        result = db_service.supabase.table("agent_feedback").insert({
            "user_id": user_id,
            "message_id": data.message_id,
            "feedback_type": data.feedback_type,
            "rating": data.rating,
            "comment": data.comment,
            "issues": data.issues or [],
        }).execute()

        if result.data:
            logger.info(
                "Agent feedback recorded",
                message_id=data.message_id,
                feedback_type=data.feedback_type,
                rating=data.rating,
            )
            return {"status": "recorded", "feedback_id": result.data[0]["id"]}
        raise HTTPException(status_code=500, detail="Failed to record feedback")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("submit_agent_feedback error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))
