from typing import Dict, Any, List, Optional
from datetime import datetime
import uuid

from app.logging_config import get_logger
from app.services.database import db_service
from app.services.redis import redis_service
from app.services.memory_fallback import memory_service

logger = get_logger("chat")

class ChatService:
    """Service for managing chat conversations and message persistence with resilience"""
    
    def __init__(self):
        logger.info("ChatService initialized with resilient backends")
    
    async def process_message(self, conversation_id: str, user_id: str, message: str) -> Dict[str, Any]:
        """Process a chat message and return response with context awareness"""
        try:
            logger.info("Processing chat message", conversation_id=conversation_id, user_id=user_id)
            
            # Ensure conversation exists
            await self.ensure_conversation_exists(conversation_id, user_id)
            
            # Store user message
            user_message_id = await self.store_message(conversation_id, message, "user")
            if not user_message_id:
                logger.warning("Failed to store user message but continuing")
            
            # Get conversation context for better responses
            context = await self.get_conversation_context(conversation_id)
            
            # Use Gemini AI to generate intelligent responses
            try:
                from app.services.gemini import gemini_service
                
                # Generate AI response using context
                response = await gemini_service.generate_response(
                    user_message=message,
                    conversation_history=context,
                    agent_type="orchestrator"
                )
                
                if not response:
                    raise Exception("Empty response from AI")
                
            except Exception as e:
                logger.error("Error with AI generation, using fallback", error=str(e))
                # Fallback response if AI fails
                if len(context) <= 1:  # First message
                    response = f"Hello! I'm your AI travel assistant. How can I help you plan your trip?"
                else:
                    response = f"I'm here to help with your travel planning. What would you like to know about your trip?"
            
            # Store assistant response
            assistant_message_id = await self.store_message(conversation_id, response, "assistant")
            if not assistant_message_id:
                logger.warning("Failed to store assistant message")
            
            # Cache conversation for quick access
            await self.cache_conversation_context(conversation_id)
            
            return {
                "response": response,
                "agent_type": "orchestrator",
                "confidence": 1.0,
                "execution_time": 0.1,
                "context_length": len(context),
                "user_message_id": user_message_id,
                "assistant_message_id": assistant_message_id,
                "next_actions": []
            }
            
        except Exception as e:
            logger.error("Failed to process message", conversation_id=conversation_id, error=str(e))
            # Return a fallback response to maintain user experience
            return {
                "response": "I'm experiencing some technical difficulties, but I'm still here to help with your travel planning. Could you please repeat your request?",
                "agent_type": "fallback",
                "confidence": 0.5,
                "execution_time": 0.0,
                "error": "Service degraded",
                "next_actions": []
            }
    
    async def store_message(self, conversation_id: str, content: str, role: str, metadata: Dict[str, Any] = None) -> Optional[str]:
        """Store a message in the conversation with database persistence"""
        try:
            message_id = await db_service.add_message(conversation_id, content, role, metadata)
            
            if message_id:
                logger.info("Message stored successfully", conversation_id=conversation_id, role=role, message_id=message_id)
            else:
                logger.warning("Message storage failed but system continuing", conversation_id=conversation_id, role=role)
            
            return message_id
            
        except Exception as e:
            logger.error("Error storing message", conversation_id=conversation_id, role=role, error=str(e))
            return None
    
    async def get_conversation_history(self, conversation_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get conversation message history with database integration"""
        try:
            messages = await db_service.get_conversation_messages(conversation_id, limit)
            logger.debug("Retrieved conversation history", conversation_id=conversation_id, message_count=len(messages))
            return messages
        except Exception as e:
            logger.error("Error retrieving conversation history", conversation_id=conversation_id, error=str(e))
            return []
    
    async def create_conversation(self, user_id: str, title: str = "New Chat") -> Optional[str]:
        """Create a new conversation with database persistence"""
        try:
            conversation_id = await db_service.create_conversation(user_id, title)
            
            if conversation_id:
                logger.info("Conversation created successfully", conversation_id=conversation_id, user_id=user_id)
            else:
                logger.warning("Conversation creation failed", user_id=user_id)
            
            return conversation_id
            
        except Exception as e:
            logger.error("Error creating conversation", user_id=user_id, error=str(e))
            return None
    
    async def ensure_conversation_exists(self, conversation_id: str, user_id: str) -> bool:
        """Ensure conversation exists in the system"""
        try:
            # Check if conversation has any messages (indicates it exists)
            messages = await self.get_conversation_history(conversation_id, limit=1)
            if messages:
                return True
            
            # If no messages found, this might be a new conversation from memory fallback
            # Try to create it in memory service if it doesn't exist there either
            context = memory_service.get_conversation_context(conversation_id)
            if not context:
                # Create new conversation with the specific ID in memory fallback
                memory_service.create_conversation_with_id(conversation_id, user_id, "New Chat")
                logger.info("Created conversation in memory fallback", conversation_id=conversation_id, user_id=user_id)
            
            return True
            
        except Exception as e:
            logger.error("Error ensuring conversation exists", conversation_id=conversation_id, error=str(e))
            return False
    
    async def log_conversation(self, message_data: Any, response_data: Dict[str, Any]):
        """Log conversation for analytics"""
        logger.info("Conversation logged",
                   conversation_id=getattr(message_data, 'conversation_id', None),
                   response_time=response_data.get('execution_time', 0))
    
    async def get_conversation_context(self, conversation_id: str, max_messages: int = 10) -> List[Dict[str, str]]:
        """Get conversation context for AI processing"""
        try:
            # First try to get from Redis cache
            cache_key = f"context:{conversation_id}"
            cached_context = await redis_service.get_cache(cache_key)
            
            if cached_context:
                logger.debug("Retrieved context from cache", conversation_id=conversation_id)
                return cached_context
            
            # Get from database with fallback to memory
            context = db_service.get_conversation_context(conversation_id, max_messages)
            
            # Cache the context for future use
            if context:
                await redis_service.set_cache(cache_key, context, expiry_seconds=300)  # 5 minutes
                logger.debug("Cached conversation context", conversation_id=conversation_id, messages=len(context))
            
            return context
            
        except Exception as e:
            logger.error("Error getting conversation context", conversation_id=conversation_id, error=str(e))
            return []
    
    async def _update_conversation_context(self, conversation_id: str):
        """Update conversation context in memory after new messages."""
        try:
            # Get latest messages from database or memory
            messages = await self.db_service.get_conversation_messages(conversation_id)
            
            if messages:
                # Cache the conversation context
                context = [{"role": msg["role"], "content": msg["content"]} for msg in messages[-10:]]
                await self.redis_service.cache_conversation(conversation_id, context, 3600)
                logger.debug("Updated conversation context in cache", conversation_id=conversation_id, message_count=len(context))
                
        except Exception as e:
            logger.warning("Failed to update conversation context", conversation_id=conversation_id, error=str(e))
    
    async def cache_conversation_context(self, conversation_id: str) -> bool:
        """Cache conversation messages for quick AI access"""
        try:
            messages = await self.get_conversation_history(conversation_id, limit=20)
            
            if messages:
                # Cache in Redis for quick access
                success = await redis_service.cache_conversation(conversation_id, messages, expiry_seconds=1800)  # 30 minutes
                
                if success:
                    logger.debug("Cached conversation for quick access", conversation_id=conversation_id, message_count=len(messages))
                    return True
            
            return False
            
        except Exception as e:
            logger.error("Error caching conversation", conversation_id=conversation_id, error=str(e))
            return False
    
    async def health_check(self) -> Dict[str, Any]:
        """Comprehensive health check for the chat service"""
        try:
            health = {
                "status": "healthy",
                "database": db_service.health_check(),
                "redis_ping": await redis_service.ping(),
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Determine overall health
            if not health["redis_ping"] and health["database"]["circuit_breaker_state"] == "open":
                health["status"] = "degraded"
                health["message"] = "Running on memory fallback only"
            elif not health["redis_ping"] or health["database"]["circuit_breaker_state"] == "open":
                health["status"] = "partial"
                health["message"] = "Some services degraded but functional"
            
            return health
            
        except Exception as e:
            logger.error("Chat service health check failed", error=str(e))
            return {
                "status": "unhealthy",
                "error": str(e)[:100],
                "timestamp": datetime.utcnow().isoformat()
            }

# Global chat service instance
chat_service = ChatService()