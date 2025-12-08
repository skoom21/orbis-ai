"""Enhanced orchestrator agent with multi-agent routing and streaming support."""

from typing import Dict, Any, List, Optional, AsyncGenerator
import uuid
import time
from app.services.gemini import gemini_service
from app.services.database import db_service
from app.services.redis import redis_service

from app.logging_config import get_logger, log_ai_interaction

logger = get_logger("orchestrator")

class OrchestratorAgent:
    """
    Multi-agent orchestrator with LangGraph-style routing.
    Analyzes user intent and routes to specialized agents (flight, hotel, planner, itinerary).
    Supports streaming responses for real-time UX.
    """
    
    def __init__(self):
        self.agent_type = "orchestrator"
        self.name = "Multi-Agent Orchestrator"
        self.version = "3.0"
        
        # Agent routing map based on intent
        self.agent_map = {
            "flight_search": "flight",
            "hotel_search": "hotel",
            "itinerary_planning": "itinerary",
            "general_travel": "planner",
            "booking": "booking",
            "budget_planning": "planner",
            "general": "orchestrator"
        }
        
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
    
    async def stream_response(
        self,
        message: str,
        conversation_history: List[Dict[str, str]],
        agent_type: str = "orchestrator",
        model: str = "gemini-2.0-flash-exp"
    ) -> AsyncGenerator[str, None]:
        """
        Stream response tokens using the appropriate specialized agent.
        This integrates with the multi-agent architecture.
        """
        try:
            # Route to specialized agent based on intent
            routed_agent = self.agent_map.get(agent_type, "orchestrator")
            
            logger.info(
                "Streaming with agent routing",
                intent=agent_type,
                routed_agent=routed_agent,
                message_length=len(message)
            )
            
            # Stream response using Gemini with agent-specific system prompt
            from app.llm.gemini_client import GeminiClient
            
            client = GeminiClient()
            
            # Build agent-specific system instruction
            system_instructions = self._get_agent_system_prompt(routed_agent)
            
            # Add system context to history
            enhanced_history = conversation_history.copy()
            if system_instructions:
                # Prepend system context as first message
                enhanced_history.insert(0, {
                    "role": "assistant",
                    "content": system_instructions
                })
            
            # Stream from Gemini with agent context
            async for chunk in client.stream_response(
                message=message,
                conversation_history=enhanced_history,
                model=model
            ):
                yield chunk
                
        except Exception as e:
            logger.error("Error in orchestrator streaming", error=str(e), agent_type=agent_type)
            yield f"I encountered an error while processing your request. Please try again."
    
    def _get_agent_system_prompt(self, agent_type: str) -> str:
        """Get system prompt for specialized agent."""
        prompts = {
            "flight": """You are a Flight Specialist Agent for Orbis AI. Your expertise:
- Search and compare flight options
- Analyze routes and connections
- Optimize for cost, time, or convenience
- Provide airline recommendations
- Consider travel dates and flexibility
Always provide specific, actionable flight recommendations.""",
            
            "hotel": """You are a Hotel Specialist Agent for Orbis AI. Your expertise:
- Recommend accommodations based on location, budget, amenities
- Analyze hotel ratings and reviews
- Consider proximity to attractions
- Compare pricing across properties
- Suggest booking strategies
Provide detailed hotel recommendations with reasoning.""",
            
            "itinerary": """You are an Itinerary Planning Agent for Orbis AI. Your expertise:
- Create day-by-day activity schedules
- Optimize routes and timing
- Recommend attractions and experiences
- Balance activities with rest
- Provide local tips and insights
Build comprehensive, realistic itineraries.""",
            
            "planner": """You are a Travel Planning Agent for Orbis AI. Your expertise:
- Understand travel goals and preferences
- Suggest destinations
- Plan trip structure and duration
- Budget estimation and optimization
- Coordinate multiple travel components
Help users plan complete, well-rounded trips.""",
            
            "booking": """You are a Booking Agent for Orbis AI. Your expertise:
- Guide through booking processes
- Explain cancellation policies
- Compare booking platforms
- Verify reservation details
- Handle booking-related questions
Assist with all booking-related needs.""",
            
            "orchestrator": """You are Orbis AI, an intelligent travel planning assistant.
You coordinate with specialized agents to provide comprehensive travel solutions.
Help users with all aspects of trip planning: flights, hotels, activities, and more."""
        }
        
        return prompts.get(agent_type, prompts["orchestrator"])