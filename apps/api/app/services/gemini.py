"""Google Gemini LLM service for travel planning conversations."""

from typing import Optional, List, Dict, Any
from google import genai
from google.genai import types
from app.config import settings

from app.logging_config import get_logger, log_ai_interaction

logger = get_logger("gemini")


class GeminiService:
    """Handles interactions with Google Gemini LLM using the new google-genai SDK."""
    
    def __init__(self):
        self.client = None
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize Gemini client with the new SDK."""
        try:
            if settings.GOOGLE_API_KEY:
                # The new SDK uses a Client object as the central entry point
                self.client = genai.Client(api_key=settings.GOOGLE_API_KEY)
                logger.info("Gemini client initialized successfully with new SDK")
            else:
                logger.warning("Google API key not configured")
        except Exception as e:
            logger.error("Failed to initialize Gemini client", error=str(e))
    
    def _build_system_prompt(self, agent_type: str = "orchestrator") -> str:
        """Build system prompt based on agent type."""
        from datetime import date
        today = date.today().strftime("%B %d, %Y")

        base_prompt = f"""You are Orbis AI, an intelligent travel planning assistant.
        Today's date is {today}. Always use this date as your reference for all scheduling, departure dates, and travel planning.
        You help users plan comprehensive trips by coordinating between different services.

        Your capabilities include:
        - Flight search and booking assistance
        - Hotel recommendations and reservations
        - Itinerary planning and optimization
        - Travel advice and recommendations
        - Budget planning and cost estimation

        Always be helpful, accurate, and provide detailed explanations for your recommendations.
        """
        
        agent_prompts = {
            "orchestrator": base_prompt + """
            As the orchestrator, your role is to:
            1. Understand user travel intentions
            2. Coordinate with specialized agents (flight, hotel, itinerary)
            3. Provide comprehensive travel solutions
            4. Handle complex multi-step travel planning
            """,
            
            "flight": base_prompt + """
            As the flight specialist, focus on:
            - Flight search and comparison
            - Route optimization
            - Pricing analysis
            - Airline recommendations
            - Travel time considerations
            """,
            
            "hotel": base_prompt + """
            As the hotel specialist, focus on:
            - Accommodation recommendations
            - Location analysis
            - Amenity matching
            - Price comparison
            - Availability checking
            """,
            
            "itinerary": base_prompt + """
            As the itinerary planner, focus on:
            - Day-by-day activity planning
            - Attraction recommendations
            - Time optimization
            - Local insights and tips
            - Cultural considerations
            """
        }
        
        return agent_prompts.get(agent_type, base_prompt)
    
    def _build_contents(
        self, 
        user_message: str, 
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> List[types.Content]:
        """Build contents list for the new SDK format."""
        contents = []
        
        # Add conversation history
        if conversation_history:
            for message in conversation_history[-10:]:  # Last 10 messages for context
                role = message.get("role", "user")
                content = message.get("content", "")
                
                # Map roles to new SDK format
                if role == "assistant":
                    role = "model"
                
                contents.append(
                    types.Content(
                        role=role,
                        parts=[types.Part(text=content)]
                    )
                )
        
        # Add current user message
        contents.append(
            types.Content(
                role="user",
                parts=[types.Part(text=user_message)]
            )
        )
        
        return contents
    
    async def generate_response(
        self, 
        user_message: str, 
        conversation_history: Optional[List[Dict[str, str]]] = None,
        agent_type: str = "orchestrator",
        model: str = "gemini-2.5-flash"
    ) -> Optional[str]:
        """Generate response using Gemini with the new SDK.
        
        Args:
            user_message: The user's message
            conversation_history: Previous conversation messages
            agent_type: Type of agent (orchestrator, flight, hotel, itinerary)
            model: Model to use (gemini-2.5-flash, gemini-2.5-flash-lite, gemini-3-pro)
        """
        import time
        start_time = time.time()
        
        logger.info(
            "Starting Gemini response generation",
            agent_type=agent_type,
            model=model,
            message_length=len(user_message),
            history_length=len(conversation_history) if conversation_history else 0
        )
        
        try:
            if not self.client:
                logger.error("Gemini client not available")
                return "I'm sorry, but I'm currently unable to process your request. Please try again later."
            
            # Build system instruction and contents
            system_instruction = self._build_system_prompt(agent_type)
            contents = self._build_contents(user_message, conversation_history)
            
            # Generate response using the new SDK
            response = self.client.models.generate_content(
                model=model,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.7,
                    max_output_tokens=2048,
                )
            )
            
            if response and response.text:
                duration = time.time() - start_time
                response_text = response.text.strip()
                
                logger.info(
                    "Generated response successfully", 
                    agent_type=agent_type, 
                    model=model,
                    user_message_length=len(user_message),
                    response_length=len(response_text),
                    duration_ms=round(duration * 1000, 2)
                )
                
                # Log AI interaction
                log_ai_interaction(
                    agent_type=agent_type,
                    user_message=user_message,
                    ai_response=response_text,
                    duration=duration,
                    metadata={"model": model}
                )
                
                return response_text
            else:
                duration = time.time() - start_time
                logger.warning(
                    "Empty response from Gemini", 
                    agent_type=agent_type,
                    model=model,
                    duration_ms=round(duration * 1000, 2)
                )
                return "I apologize, but I couldn't generate a proper response. Could you please rephrase your question?"
                
        except Exception as e:
            duration = time.time() - start_time
            logger.error(
                "Error generating response", 
                agent_type=agent_type, 
                model=model,
                error=str(e),
                error_type=type(e).__name__,
                duration_ms=round(duration * 1000, 2)
            )
            return "I encountered an error while processing your request. Please try again."
    
    async def analyze_intent(self, user_message: str, conversation_history: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
        """Analyze user intent for routing to appropriate agents."""
        import time
        start_time = time.time()
        
        logger.info(
            "Starting intent analysis",
            message_length=len(user_message),
            message_preview=user_message[:100]
        )
        
        try:
            if not self.client:
                logger.warning("Gemini client not available for intent analysis")
                return {"intent": "general", "entities": {}, "confidence": 0.0}
            
            from datetime import date
            today_str = date.today().strftime("%B %d, %Y")

            history_text = ""
            if conversation_history:
                history_text = "Recent conversation history for context:\n"
                for msg in conversation_history[-4:]:  # Last 4 messages
                    role = msg.get("role", "user")
                    content = msg.get("content", "")
                    if content:
                        # Truncate long JSON/RAG outputs so they don't drown out intent
                        if len(content) > 300:
                            content = content[:300] + "... [truncated]"
                        history_text += f"{role}: {content}\n"

            intent_prompt = f"""
            Today's date is {today_str}. Use this as reference when interpreting relative dates like "next Wednesday" or "in 3 days".

            Analyze this travel-related message and identify the user's intent and key entities.
            
            {history_text}

            Current User Message: "{user_message}"

            Classify the intent as EXACTLY one of these strings:
            - flight_search: Looking for flights or asking about departure dates
            - hotel_search: Looking for hotels, hostels, or accommodation
            - itinerary_planning: Planning activities or a full trip itinerary
            - general_travel: General travel questions or greetings
            - booking: Want to make or confirm a reservation
            - budget_planning: Discussing costs or budget

            Extract entities like:
            - destinations (departure city, arrival city)
            - dates (departure date as YYYY-MM-DD if determinable, return date, duration)
            - travelers (number of people)
            - preferences (budget level, accommodation type, travel class)

            Respond in this exact JSON format:
            {{
                "intent": "intent_type",
                "confidence": 0.0-1.0,
                "entities": {{}}
            }}
            """
            
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=intent_prompt,
                config=types.GenerateContentConfig(
                    temperature=0.3,  # Lower temperature for more consistent parsing
                    response_mime_type="application/json"  # Request JSON response
                )
            )
            
            if response and response.text:
                # Parse JSON response
                import json
                try:
                    result = json.loads(response.text)
                    duration = time.time() - start_time
                    
                    intent_result = {
                        "intent": result.get("intent", "general"),
                        "entities": result.get("entities", {}),
                        "confidence": result.get("confidence", 0.5)
                    }
                    
                    logger.info(
                        "Intent analysis complete",
                        intent=intent_result["intent"],
                        confidence=intent_result["confidence"],
                        entities_count=len(intent_result["entities"]),
                        duration_ms=round(duration * 1000, 2)
                    )
                    
                    return intent_result
                except json.JSONDecodeError as e:
                    duration = time.time() - start_time
                    logger.warning(
                        "Failed to parse intent JSON response",
                        error=str(e),
                        response_text=response.text[:200],
                        duration_ms=round(duration * 1000, 2)
                    )
                    return {"intent": "general", "entities": {}, "confidence": 0.0}
            
            return {"intent": "general", "entities": {}, "confidence": 0.0}
            
        except Exception as e:
            duration = time.time() - start_time
            logger.error(
                "Error analyzing intent", 
                error=str(e),
                error_type=type(e).__name__,
                duration_ms=round(duration * 1000, 2)
            )
            return {"intent": "general", "entities": {}, "confidence": 0.0}
    
    async def generate_conversation_title(
        self, 
        messages: List[Dict[str, str]]
    ) -> str:
        """Generate a conversation title based on the messages."""
        try:
            if not self.client or not messages:
                return "New Conversation"
            
            # Get first few user messages
            user_messages = [
                msg.get("content", "") 
                for msg in messages 
                if msg.get("role") == "user"
            ][:3]
            
            if not user_messages:
                return "New Conversation"
            
            title_prompt = f"""
            Generate a concise 3-5 word title for this travel conversation based on these messages:
            
            {' | '.join(user_messages)}
            
            Focus on the main travel intent (destination, activity, etc.).
            Examples: "Paris Hotel Search", "Tokyo Itinerary Planning", "Flight to NYC"
            
            Return only the title, nothing else.
            """
            
            response = self.client.models.generate_content(
                model="gemini-2.5-flash-lite",  # Use lighter model for simple task
                contents=title_prompt,
                config=types.GenerateContentConfig(
                    temperature=0.5,
                    max_output_tokens=20
                )
            )
            
            if response and response.text:
                title = response.text.strip()
                return title[:50] if title else "Travel Planning"
            
            return "Travel Planning"
            
        except Exception as e:
            logger.error("Error generating conversation title", error=str(e))
            return "Travel Conversation"
    
    async def get_embedding(self, text: str) -> Optional[List[float]]:
        """Generate an embedding vector for the given text using Gemini embedding model.

        Uses output_dimensionality=768 to stay within pgvector IVFFlat index limit.
        The underlying SDK call is synchronous, so we offload it to a thread executor
        to avoid blocking the asyncio event loop.
        """
        import asyncio
        from google.genai import types as genai_types

        if not self.client:
            logger.warning("Gemini client not initialized, cannot generate embedding")
            return None

        cleaned = text.replace("\n", " ").strip()
        if not cleaned:
            return None

        def _sync_embed() -> Optional[List[float]]:
            try:
                response = self.client.models.embed_content(
                    model=settings.GEMINI_EMBEDDING_MODEL,
                    contents=cleaned,
                    config=genai_types.EmbedContentConfig(output_dimensionality=768),
                )
                if response and response.embeddings:
                    return list(response.embeddings[0].values)
                logger.warning("Empty embedding response from Gemini")
                return None
            except Exception as e:
                logger.error("Error generating embedding", error=str(e))
                return None

        return await asyncio.to_thread(_sync_embed)

    def close(self):
        """Close the client connection."""
        # The genai.Client doesn't have a close() method
        # Resources are automatically cleaned up
        if self.client:
            logger.info("Gemini service cleanup called (client auto-managed)")
            self.client = None


# Global Gemini service instance
gemini_service = GeminiService()