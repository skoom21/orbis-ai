from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from sse_starlette.sse import EventSourceResponse
import json
import asyncio

from app.api.dependencies.auth import get_optional_user
from app.services.database import db_service
from app.services.gemini import gemini_service
from app.agents.langgraph_orchestrator import LangGraphOrchestrator
from app.config import settings
from app.logging_config import get_logger

logger = get_logger("api.chat_stream")

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatStreamRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    parent_message_id: Optional[str] = None
    model: Optional[str] = None

@router.post("/stream")
async def stream_chat(
    request: ChatStreamRequest,
    current_user: Dict[str, Any] = Depends(get_optional_user)
):
    """Stream chat response using multi-agent orchestrator with SSE"""
    user_id = current_user["id"]
    conversation_id = request.conversation_id
    
    logger.info(
        "Chat stream request received",
        user_id=user_id,
        conversation_id=conversation_id,
        message_length=len(request.message),
        model=request.model
    )
    
    # Create conversation if not exists
    if not conversation_id:
        logger.info("Creating new conversation", user_id=user_id)
        conversation_id = await db_service.create_conversation(user_id, title=request.message[:50])
        if not conversation_id:
            logger.error("Failed to create conversation", user_id=user_id)
            raise HTTPException(status_code=500, detail="Failed to create conversation")
        logger.info("New conversation created", conversation_id=conversation_id)
    
    # Save user message
    user_message_id = await db_service.add_message(
        conversation_id=conversation_id,
        content=request.message,
        role="user",
        parent_message_id=request.parent_message_id
    )
    
    # Get conversation history
    history = await db_service.get_conversation_messages(conversation_id, limit=10)
    
    # Convert history to context dict
    context = {
        "conversation_id": conversation_id,
        "history": history,
    }
    
    # Initialize LangGraph orchestrator
    orchestrator = LangGraphOrchestrator()
    
    async def event_generator():
        try:
            logger.info("Starting event generator", conversation_id=conversation_id)
            # Track full response and agent metadata
            full_response = ""
            agent_type = None
            token_count = 0
            
            # Stream response using LangGraph orchestrator
            async for event in orchestrator.stream_response(
                user_message=request.message,
                context=context,
                conversation_id=conversation_id,
            ):
                event_type = event.get("type")
                
                if event_type == "agent_start":
                    # Agent started processing
                    agent_type = event.get("agent_type")
                    logger.info(f"Agent started: {agent_type}", agent_type=agent_type, conversation_id=conversation_id)
                    yield {
                        "event": "agent",
                        "data": json.dumps({
                            "agent_type": agent_type,
                            "conversation_id": conversation_id
                        })
                    }
                
                elif event_type == "content":
                    # Content token from LLM
                    content = event.get("content", "")
                    full_response += content
                    token_count += 1
                    yield {
                        "event": "token",
                        "data": json.dumps({
                            "content": content,
                            "conversation_id": conversation_id
                        })
                    }
                
                elif event_type == "agent_end":
                    # Agent finished processing
                    pass
                
                elif event_type == "done":
                    # All processing complete
                    break
            
            # Save assistant message with agent metadata
            logger.info(
                "Stream complete - saving message",
                conversation_id=conversation_id,
                agent_type=agent_type,
                response_length=len(full_response),
                token_count=token_count
            )
            
            await db_service.add_message(
                conversation_id=conversation_id,
                content=full_response,
                role="assistant",
                parent_message_id=user_message_id,
                metadata={
                    "model": request.model or settings.GEMINI_MODEL,
                    "agent_type": agent_type,
                    "token_count": token_count
                }
            )
            
            logger.info(
                "Chat stream completed successfully",
                conversation_id=conversation_id,
                agent_type=agent_type,
                tokens_streamed=token_count
            )
            
            yield {
                "event": "done",
                "data": json.dumps({
                    "conversation_id": conversation_id,
                    "agent_type": agent_type,
                    "status": "completed"
                })
            }
            
        except Exception as e:
            logger.error("Error in chat stream", error=str(e))
            yield {
                "event": "error",
                "data": json.dumps({"error": str(e)})
            }

    return EventSourceResponse(event_generator())
