"""Enhanced orchestrator agent with real AI capabilities."""

from typing import Dict, Any, List, Optional
import uuid
import time
from app.services.gemini import gemini_service
from app.services.database import db_service
from app.services.redis import redis_service

from app.logging_config import get_logger, log_ai_interaction

logger = get_logger("orchestrator")

class OrchestratorAgent:
    """
    Enhanced orchestrator that integrates with Gemini AI, database, and caching.
    Handles real travel planning conversations with intelligent responses.
    """
    
    def __init__(self):
        self.agent_type = "orchestrator"
        self.name = "Enhanced Orchestrator"
        self.version = "2.0"
        
    async def process_message(self, message_data: Any) -> Dict[str, Any]:
        """Process message (compatibility method for chat router)"""
        start_time = time.time()
        
        try:
            # Extract message content
            message_content = message_data.message if hasattr(message_data, 'message') else str(message_data)
            
            logger.info("Processing message with enhanced orchestrator", 
                       message_length=len(message_content))
            
            # For now, use a simple user ID (in production, extract from JWT token)
            user_id = "demo_user"
            conversation_id = getattr(message_data, 'conversation_id', None)
            
            # Create demo user if doesn't exist
            if not conversation_id:
                user = await db_service.get_user_by_email("demo@orbis.ai")
                if not user:
                    user_id = await db_service.create_user(
                        email="demo@orbis.ai", 
                        full_name="Demo User"
                    )
                else:
                    user_id = user["id"]
                
                # Create new conversation
                conversation_id = await db_service.create_conversation(
                    user_id=user_id,
                    title="New Travel Chat"
                )
            
            # Get conversation history
            conversation_history = []
            if conversation_id:
                # Try cache first
                cached_history = await redis_service.get_cached_conversation(conversation_id)
                if cached_history:
                    conversation_history = cached_history[-10:]  # Last 10 messages
                else:
                    # Get from database
                    messages = await db_service.get_conversation_messages(conversation_id, limit=10)
                    conversation_history = [
                        {"role": msg["role"], "content": msg["content"]} 
                        for msg in messages
                    ]
                    # Cache for future use
                    await redis_service.cache_conversation(conversation_id, conversation_history)
            
            # Analyze user intent
            intent_analysis = await gemini_service.analyze_intent(message_content)
            
            # Generate AI response
            ai_response = await gemini_service.generate_response(
                user_message=message_content,
                conversation_history=conversation_history,
                agent_type="orchestrator"
            )
            
            # Store messages in database
            if conversation_id and user_id:
                await db_service.add_message(
                    conversation_id=conversation_id,
                    content=message_content,
                    role="user",
                    metadata=intent_analysis
                )
                
                await db_service.add_message(
                    conversation_id=conversation_id,
                    content=ai_response,
                    role="assistant",
                    metadata={"agent": "orchestrator"}
                )
                
                # Update cached conversation
                updated_history = conversation_history + [
                    {"role": "user", "content": message_content},
                    {"role": "assistant", "content": ai_response}
                ]
                await redis_service.cache_conversation(conversation_id, updated_history)
                
                # Update conversation title if it's a new conversation
                if len(conversation_history) <= 2:
                    title = await gemini_service.generate_conversation_title(updated_history)
                    await db_service.update_conversation_title(conversation_id, title)
            
            execution_time = time.time() - start_time
            
            return {
                "response": ai_response or "I'm here to help with your travel planning! What can I assist you with today?",
                "agent_type": intent_analysis.get("intent", "general"),
                "confidence": intent_analysis.get("confidence", 0.8),
                "execution_time": execution_time,
                "next_actions": [],
                "conversation_id": conversation_id,
                "metadata": {
                    "intent_analysis": intent_analysis,
                    "cached_history_used": bool(cached_history if 'cached_history' in locals() else False)
                }
            }
            
        except Exception as e:
            logger.error("Error in enhanced orchestrator", error=str(e))
            execution_time = time.time() - start_time
            
            # Fallback to simple responses
            message_content = message_data.message if hasattr(message_data, 'message') else str(message_data)
            
            if any(word in message_content.lower() for word in ['flight', 'fly', 'plane', 'airport']):
                response = "I can help you find flights! What's your departure city and destination?"
                agent_type = "flight"
            elif any(word in message_content.lower() for word in ['hotel', 'stay', 'accommodation', 'room']):
                response = "I'll help you find great accommodations! Where are you planning to stay?"
                agent_type = "hotel"
            elif any(word in message_content.lower() for word in ['plan', 'trip', 'travel', 'vacation']):
                response = "Let's plan your perfect trip! Tell me about your destination, dates, and preferences."
                agent_type = "planner"
            else:
                response = "Hello! I'm your Orbis AI travel assistant. I can help you plan trips, find flights, book hotels, and create amazing itineraries. What would you like to do?"
                agent_type = "orchestrator"
            
            return {
                "response": response,
                "agent_type": agent_type,
                "confidence": 0.5,
                "execution_time": execution_time,
                "next_actions": [],
                "metadata": {"fallback_used": True, "error": str(e)}
            }
    
    async def health_check(self) -> Dict[str, Any]:
        """Check health of all integrated services."""
        try:
            health_status = {
                "orchestrator": "healthy",
                "services": {}
            }
            
            # Check Gemini service
            try:
                test_response = await gemini_service.generate_response("Test")
                health_status["services"]["gemini"] = "healthy" if test_response else "degraded"
            except Exception as e:
                health_status["services"]["gemini"] = f"unhealthy: {str(e)[:50]}"
            
            # Check Redis service
            try:
                redis_ping = await redis_service.ping()
                health_status["services"]["redis"] = "healthy" if redis_ping else "unhealthy"
            except Exception as e:
                health_status["services"]["redis"] = f"unhealthy: {str(e)[:50]}"
            
            # Check Database service
            try:
                await db_service.get_user_by_email("health_check_test@example.com")
                health_status["services"]["database"] = "healthy"
            except Exception as e:
                health_status["services"]["database"] = f"unhealthy: {str(e)[:50]}"
            
            return health_status
            
        except Exception as e:
            logger.error("Error in health check", error=str(e))
            return {
                "orchestrator": "unhealthy",
                "error": str(e),
                "services": {}
            }