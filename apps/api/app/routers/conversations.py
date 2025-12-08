from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime

from app.services.database import db_service
from app.api.dependencies.auth import get_optional_user
from app.logging_config import get_logger

logger = get_logger("api.conversations")

router = APIRouter(prefix="/conversations", tags=["conversations"])

# Models
class CreateConversationRequest(BaseModel):
    title: Optional[str] = "New Conversation"

class ConversationResponse(BaseModel):
    id: str
    user_id: str
    title: Optional[str]
    created_at: Optional[str]
    updated_at: Optional[str]

class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    created_at: str
    parent_message_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

# Endpoints

@router.get("/", response_model=List[ConversationResponse])
async def list_conversations(
    limit: int = Query(20, ge=1, le=100),
    current_user: Dict[str, Any] = Depends(get_optional_user)
):
    """List user's conversations."""
    user_id = current_user["id"]
    conversations = await db_service.get_user_conversations(user_id, limit=limit)
    return conversations

@router.post("/", response_model=ConversationResponse)
async def create_conversation(
    request: CreateConversationRequest,
    current_user: Dict[str, Any] = Depends(get_optional_user)
):
    """Create a new conversation."""
    user_id = current_user["id"]
    conversation_id = await db_service.create_conversation(user_id, request.title)
    
    if not conversation_id:
        raise HTTPException(status_code=500, detail="Failed to create conversation")
        
    # Fetch the created conversation to return full object
    conversation = await db_service.get_conversation(conversation_id, user_id)
    if not conversation:
        raise HTTPException(status_code=500, detail="Failed to retrieve created conversation")
        
    return conversation

@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: str,
    current_user: Dict[str, Any] = Depends(get_optional_user)
):
    """Get conversation details."""
    user_id = current_user["id"]
    conversation = await db_service.get_conversation(conversation_id, user_id)
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    return conversation

@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    current_user: Dict[str, Any] = Depends(get_optional_user)
):
    """Delete a conversation."""
    user_id = current_user["id"]
    success = await db_service.delete_conversation(conversation_id, user_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found or could not be deleted")
        
    return {"message": "Conversation deleted successfully"}

@router.get("/{conversation_id}/messages", response_model=List[MessageResponse])
async def get_messages(
    conversation_id: str,
    limit: int = Query(50, ge=1, le=100),
    current_user: Dict[str, Any] = Depends(get_optional_user)
):
    """Get messages for a conversation."""
    user_id = current_user["id"]
    
    # Verify ownership first
    conversation = await db_service.get_conversation(conversation_id, user_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    messages = await db_service.get_conversation_messages(conversation_id, limit=limit)
    return messages
