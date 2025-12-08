"""
LangGraph-based Multi-Agent Orchestrator
Uses StateGraph for agent orchestration with conditional routing
"""
import json
from typing import TypedDict, Annotated, Literal
from typing_extensions import NotRequired

from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage

from app.agents.base import AgentInput, AgentOutput
from app.services.gemini import GeminiService
from app.logging_config import get_logger, log_ai_interaction

logger = get_logger("agents.langgraph")


class AgentState(TypedDict):
    """State schema for LangGraph orchestration"""
    messages: Annotated[list[BaseMessage], add_messages]
    intent: NotRequired[str]
    agent_type: NotRequired[str]
    entities: NotRequired[dict]
    context: NotRequired[dict]
    conversation_id: NotRequired[str]


class LangGraphOrchestrator:
    """
    LangGraph-based multi-agent orchestrator
    
    Uses StateGraph to route user queries to specialized agents:
    - Flight Agent: Flight search, booking
    - Hotel Agent: Hotel search, booking
    - Planner Agent: Trip planning
    - Itinerary Agent: Itinerary management
    - Booking Agent: Booking coordination
    """
    
    def __init__(self):
        self.gemini_service = GeminiService()
        # Agents will be implemented in Phase 3
        self.agents = {}
        self.graph = self._build_graph()
    
    def _build_graph(self) -> StateGraph:
        """Build the LangGraph StateGraph with nodes and edges"""
        logger.info("Building LangGraph StateGraph with multi-agent nodes")
        workflow = StateGraph(AgentState)
        
        # Add nodes
        workflow.add_node("orchestrator", self._orchestrator_node)
        workflow.add_node("flight", self._flight_node)
        workflow.add_node("hotel", self._hotel_node)
        workflow.add_node("planner", self._planner_node)
        workflow.add_node("itinerary", self._itinerary_node)
        workflow.add_node("booking", self._booking_node)
        
        # Set entry point
        workflow.set_entry_point("orchestrator")
        
        # Add conditional routing from orchestrator
        workflow.add_conditional_edges(
            "orchestrator",
            self._route_to_agent,
            {
                "flight": "flight",
                "hotel": "hotel",
                "planner": "planner",
                "itinerary": "itinerary",
                "booking": "booking",
                "end": END,
            }
        )
        
        # All agents route to END
        for agent_name in ["flight", "hotel", "planner", "itinerary", "booking"]:
            workflow.add_edge(agent_name, END)
        
        return workflow.compile()
    
    async def _orchestrator_node(self, state: AgentState) -> AgentState:
        """
        Orchestrator node: Analyzes intent and sets routing
        """
        logger.info("Orchestrator node: Analyzing intent for routing")
        
        # Get last user message
        user_message = None
        for msg in reversed(state["messages"]):
            if isinstance(msg, HumanMessage):
                user_message = msg.content
                break
        
        if not user_message:
            logger.warning("No user message found in state")
            return state
        
        # Analyze intent
        intent_data = await self.gemini_service.analyze_intent(user_message)
        
        state["intent"] = intent_data.get("intent", "general")
        state["entities"] = intent_data.get("entities", {})
        state["agent_type"] = self._map_intent_to_agent(intent_data.get("intent", "general"))
        
        logger.info(
            "Intent analysis complete",
            intent=state["intent"],
            agent_type=state["agent_type"],
            entities_count=len(state["entities"]),
            conversation_id=state.get("conversation_id")
        )
        
        return state
    
    def _map_intent_to_agent(self, intent: str) -> str:
        """Map intent to agent type"""
        intent_map = {
            "flight_search": "flight",
            "flight_booking": "flight",
            "hotel_search": "hotel",
            "hotel_booking": "hotel",
            "trip_planning": "planner",
            "itinerary_management": "itinerary",
            "booking_coordination": "booking",
            "general": "planner",  # Default to planner
        }
        return intent_map.get(intent, "planner")
    
    def _route_to_agent(self, state: AgentState) -> Literal["flight", "hotel", "planner", "itinerary", "booking", "end"]:
        """Conditional routing function for LangGraph"""
        agent_type = state.get("agent_type", "planner")
        
        if agent_type in ["flight", "hotel", "planner", "itinerary", "booking"]:
            logger.info(f"Routing to {agent_type} agent", agent_type=agent_type, intent=state.get("intent"))
            return agent_type
        
        logger.warning(f"Unknown agent type, routing to end", agent_type=agent_type)
        return "end"
    
    async def _flight_node(self, state: AgentState) -> AgentState:
        """Flight agent node"""
        return await self._agent_node(state, "flight")
    
    async def _hotel_node(self, state: AgentState) -> AgentState:
        """Hotel agent node"""
        return await self._agent_node(state, "hotel")
    
    async def _planner_node(self, state: AgentState) -> AgentState:
        """Planner agent node"""
        return await self._agent_node(state, "planner")
    
    async def _itinerary_node(self, state: AgentState) -> AgentState:
        """Itinerary agent node"""
        return await self._agent_node(state, "itinerary")
    
    async def _booking_node(self, state: AgentState) -> AgentState:
        """Booking agent node"""
        return await self._agent_node(state, "booking")
    
    async def _agent_node(self, state: AgentState, agent_type: str) -> AgentState:
        """Generic agent node executor"""
        logger.info(f"Executing {agent_type} agent node", agent_type=agent_type)
        
        # Get user message
        user_message = None
        for msg in reversed(state["messages"]):
            if isinstance(msg, HumanMessage):
                user_message = msg.content
                break
        
        if not user_message:
            logger.warning(f"No user message in {agent_type} agent node")
            return state
        
        # Build conversation history from state messages
        conversation_history = []
        for msg in state["messages"][:-1]:  # Exclude the current message
            if isinstance(msg, HumanMessage):
                conversation_history.append({"role": "user", "content": msg.content})
            elif isinstance(msg, AIMessage):
                conversation_history.append({"role": "assistant", "content": msg.content})
        
        # Generate response using Gemini
        import time
        start_time = time.time()
        try:
            response = await self.gemini_service.generate_response(
                user_message=user_message,
                conversation_history=conversation_history,
                agent_type=agent_type,
            )
            duration = time.time() - start_time
            
            state["messages"].append(AIMessage(content=response))
            
            logger.info(
                f"{agent_type} agent response generated",
                agent_type=agent_type,
                response_length=len(response),
                duration_ms=round(duration * 1000, 2)
            )
            
            # Log AI interaction
            log_ai_interaction(
                agent_type=agent_type,
                user_message=user_message,
                ai_response=response,
                duration=duration,
                metadata={"conversation_id": state.get("conversation_id")}
            )
            
        except Exception as e:
            duration = time.time() - start_time
            error_msg = f"Error in {agent_type} agent: {str(e)}"
            state["messages"].append(AIMessage(content=error_msg))
            logger.error(
                f"Error in {agent_type} agent",
                agent_type=agent_type,
                error=str(e),
                duration_ms=round(duration * 1000, 2)
            )
        
        return state
    
    def _get_agent_system_prompt(self, agent_type: str) -> str:
        """Get system prompt for specific agent type"""
        prompts = {
            "flight": """You are a flight search and booking specialist.
Your role is to:
- Help users search for flights based on their requirements
- Provide flight options with pricing and availability
- Assist with flight bookings
- Handle flight-related queries

Always be helpful, accurate, and provide clear information about flights.""",
            
            "hotel": """You are a hotel search and booking specialist.
Your role is to:
- Help users find hotels matching their preferences
- Provide hotel details including amenities, pricing, and location
- Assist with hotel reservations
- Answer hotel-related questions

Focus on providing personalized hotel recommendations.""",
            
            "planner": """You are a travel planning specialist.
Your role is to:
- Help users plan complete travel itineraries
- Provide destination recommendations
- Suggest activities and attractions
- Create personalized travel plans

Be creative and considerate of user preferences.""",
            
            "itinerary": """You are an itinerary management specialist.
Your role is to:
- Help users organize their travel schedules
- Manage trip timelines and activities
- Coordinate different aspects of trips
- Provide itinerary modifications

Keep itineraries clear, organized, and flexible.""",
            
            "booking": """You are a booking coordination specialist.
Your role is to:
- Coordinate multiple bookings (flights, hotels, activities)
- Handle booking confirmations and modifications
- Manage booking-related issues
- Provide booking status updates

Ensure smooth coordination across all bookings.""",
        }
        
        return prompts.get(agent_type, prompts["planner"])
    
    async def stream_response(
        self,
        user_message: str,
        context: dict,
        conversation_id: str,
    ):
        """
        Stream responses using LangGraph graph execution
        
        Yields:
            dict: Event data with type, content, agent_type, etc.
        """
        # Initialize state
        initial_state = AgentState(
            messages=[HumanMessage(content=user_message)],
            context=context,
            conversation_id=conversation_id,
        )
        
        # Track which agent is being used
        current_agent = None
        
        # Execute the graph and stream results
        async for chunk in self.graph.astream(initial_state):
            # chunk is a dict with node name as key and state as value
            for node_name, node_output in chunk.items():
                if node_name in ["flight", "hotel", "planner", "itinerary", "booking"]:
                    # Agent node completed
                    current_agent = node_name
                    
                    # Emit agent start
                    yield {
                        "type": "agent_start",
                        "agent_type": node_name,
                    }
                    
                    # Get the last AI message from the state
                    messages = node_output.get("messages", [])
                    if messages:
                        last_message = messages[-1]
                        if isinstance(last_message, AIMessage):
                            content = last_message.content
                            
                            # Stream the content in chunks (simulate token streaming)
                            chunk_size = 10  # characters per chunk
                            for i in range(0, len(content), chunk_size):
                                chunk_text = content[i:i+chunk_size]
                                yield {
                                    "type": "content",
                                    "content": chunk_text,
                                }
                                # Small delay to simulate streaming
                                import asyncio
                                await asyncio.sleep(0.01)
                    
                    # Emit agent end
                    yield {
                        "type": "agent_end",
                        "agent_type": node_name,
                    }
        
        yield {"type": "done"}
