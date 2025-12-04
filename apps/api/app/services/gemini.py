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
        
        base_prompt = """You are Orbis AI, an intelligent travel planning assistant with access to multiple specialized agents. 
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
                logger.info(
                    "Generated response", 
                    agent_type=agent_type, 
                    model=model,
                    user_message_length=len(user_message)
                )
                return response.text.strip()
            else:
                logger.warning("Empty response from Gemini", agent_type=agent_type)
                return "I apologize, but I couldn't generate a proper response. Could you please rephrase your question?"
                
        except Exception as e:
            logger.error("Error generating response", agent_type=agent_type, error=str(e))
            return "I encountered an error while processing your request. Please try again."
    
    async def analyze_intent(self, user_message: str) -> Dict[str, Any]:
        """Analyze user intent for routing to appropriate agents."""
        try:
            if not self.client:
                return {"intent": "general", "entities": {}, "confidence": 0.0}
            
            intent_prompt = f"""
            Analyze this travel-related message and identify the user's intent and key entities.
            
            Message: "{user_message}"
            
            Classify the intent as one of:
            - flight_search: Looking for flights
            - hotel_search: Looking for hotels/accommodation
            - itinerary_planning: Planning activities or full trip
            - general_travel: General travel questions
            - booking: Want to make a reservation
            - budget_planning: Discussing costs/budget
            
            Extract entities like:
            - destinations (departure, arrival)
            - dates (departure, return, stay dates)
            - travelers (number of people, ages)
            - preferences (budget, class, amenities)
            
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
                    return {
                        "intent": result.get("intent", "general"),
                        "entities": result.get("entities", {}),
                        "confidence": result.get("confidence", 0.5)
                    }
                except json.JSONDecodeError:
                    logger.warning("Failed to parse intent JSON response")
                    return {"intent": "general", "entities": {}, "confidence": 0.0}
            
            return {"intent": "general", "entities": {}, "confidence": 0.0}
            
        except Exception as e:
            logger.error("Error analyzing intent", error=str(e))
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
    
    def close(self):
        """Close the client connection."""
        if self.client:
            self.client.close()


# Global Gemini service instance
gemini_service = GeminiService()