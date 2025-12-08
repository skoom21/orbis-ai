from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import uuid
from datetime import datetime

from app.services.chat_service import chat_service
from app.agents.orchestrator_simple import OrchestratorAgent

from app.logging_config import get_logger

logger = get_logger("api.chat")

router = APIRouter()

# Pydantic models for request/response
class ChatMessage(BaseModel):
    conversation_id: str
    user_id: str
    message: str
    context: Dict[str, Any] = {}

class ChatResponse(BaseModel):
    conversation_id: str
    response: str
    agent_type: str = "orchestrator"
    confidence: float = 1.0
    execution_time: float = 0.0
    context_length: int = 0
    user_message_id: Optional[str] = None
    assistant_message_id: Optional[str] = None
    next_actions: list = []
    error: Optional[str] = None

class CreateConversationRequest(BaseModel):
    user_id: str
    title: Optional[str] = "New Chat"

class ConversationResponse(BaseModel):
    conversation_id: str
    user_id: str
    title: str
    created_at: str

class HealthResponse(BaseModel):
    status: str
    database: Dict[str, Any]
    redis_ping: bool
    timestamp: str
    message: Optional[str] = None



@router.post("/message", response_model=ChatResponse)
async def send_message(message: ChatMessage):
    """Send a message to the AI chat system with resilient processing"""
    try:
        logger.info("Processing chat message", 
                   conversation_id=message.conversation_id,
                   user_id=message.user_id)
        
        # Use the resilient chat service directly for better error handling
        result = await chat_service.process_message(
            message.conversation_id, 
            message.user_id, 
            message.message
        )
        
        return ChatResponse(
            conversation_id=message.conversation_id,
            response=result.get("response", "I'm processing your request..."),
            agent_type=result.get("agent_type", "orchestrator"),
            confidence=result.get("confidence", 1.0),
            execution_time=result.get("execution_time", 0.0),
            context_length=result.get("context_length", 0),
            user_message_id=result.get("user_message_id"),
            assistant_message_id=result.get("assistant_message_id"),
            next_actions=result.get("next_actions", []),
            error=result.get("error")
        )
        
    except Exception as e:
        logger.error("Chat message processing failed", 
                    error=str(e),
                    conversation_id=message.conversation_id)
        
        # Return a graceful error response instead of HTTP exception
        return ChatResponse(
            conversation_id=message.conversation_id,
            response="I'm experiencing technical difficulties. Please try again in a moment.",
            agent_type="fallback",
            confidence=0.0,
            execution_time=0.0,
            context_length=0,
            error="Service temporarily unavailable",
            next_actions=[]
        )

@router.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str, limit: int = 50):
    """Get conversation history with resilient handling"""
    try:
        history = await chat_service.get_conversation_history(conversation_id, limit)
        return {
            "conversation_id": conversation_id, 
            "messages": history,
            "total_messages": len(history),
            "limit": limit
        }
    except Exception as e:
        logger.error("Failed to get conversation", conversation_id=conversation_id, error=str(e))
        # Return empty conversation instead of error
        return {
            "conversation_id": conversation_id, 
            "messages": [],
            "total_messages": 0,
            "error": "Conversation not accessible"
        }

@router.post("/conversations/new", response_model=ConversationResponse)
async def create_conversation(request: CreateConversationRequest):
    """Create a new conversation with resilient handling"""
    try:
        conversation_id = await chat_service.create_conversation(request.user_id, request.title)
        
        if not conversation_id:
            # Fallback: create with UUID
            conversation_id = str(uuid.uuid4())
            logger.warning("Using fallback conversation ID", conversation_id=conversation_id, user_id=request.user_id)
        
        return ConversationResponse(
            conversation_id=conversation_id,
            user_id=request.user_id,
            title=request.title,
            created_at=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        logger.error("Failed to create conversation", user_id=request.user_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to create conversation")

@router.get("/conversations/{conversation_id}/context")
async def get_conversation_context(conversation_id: str, max_messages: int = 10):
    """Get conversation context for AI processing"""
    try:
        context = await chat_service.get_conversation_context(conversation_id, max_messages)
        return {
            "conversation_id": conversation_id,
            "context": context,
            "context_length": len(context),
            "max_messages": max_messages
        }
    except Exception as e:
        logger.error("Failed to get conversation context", conversation_id=conversation_id, error=str(e))
        return {
            "conversation_id": conversation_id,
            "context": [],
            "context_length": 0,
            "error": "Context not available"
        }

@router.get("/health", response_model=HealthResponse)
async def chat_health():
    """Get chat service health status"""
    try:
        health = await chat_service.health_check()
        return HealthResponse(**health)
    except Exception as e:
        logger.error("Chat health check failed", error=str(e))
        return HealthResponse(
            status="unhealthy",
            database={"status": "unknown"},
            redis_ping=False,
            timestamp=datetime.utcnow().isoformat(),
            message=f"Health check failed: {str(e)[:50]}"
        )

@router.post("/test-storage/{conversation_id}")
async def test_message_storage(conversation_id: str, content: str, role: str = "test"):
    """Test endpoint for verifying message storage functionality"""
    try:
        message_id = await chat_service.store_message(conversation_id, content, role, {"test": True})
        
        return {
            "success": bool(message_id),
            "message_id": message_id,
            "conversation_id": conversation_id,
            "content": content,
            "role": role,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error("Test message storage failed", conversation_id=conversation_id, error=str(e))
        return {
            "success": False,
            "error": str(e),
            "conversation_id": conversation_id,
            "timestamp": datetime.utcnow().isoformat()
        }