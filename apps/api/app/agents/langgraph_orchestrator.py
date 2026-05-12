"""
LangGraph-based Multi-Agent Orchestrator
Uses StateGraph for agent orchestration with conditional routing.

7 Agents:
  Orchestrator → routes to → Flight / Hotel / Planner / Itinerary / Booking / Verifier
"""
import json
from typing import TypedDict, Annotated, Literal, Union
from typing_extensions import NotRequired

from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from langchain_core.runnables import RunnableConfig


def _extract_text(content: Union[str, list, None]) -> str:
    """
    Normalise an AIMessage.content value to a plain string.

    ChatGoogleGenerativeAI (langchain-google-genai) can return content as:
      - str  — simple text response
      - list — list of content-part dicts when tool calls are involved,
                e.g. [{"type": "text", "text": "Here are the flights..."}]

    Concatenating a list directly to a str causes:
        TypeError: can only concatenate str (not "list") to str
    This helper always returns a str.
    """
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for part in content:
            if isinstance(part, str):
                parts.append(part)
            elif isinstance(part, dict):
                # Standard content-part format: {"type": "text", "text": "..."}
                parts.append(part.get("text") or part.get("content") or "")
        return "".join(parts)
    return str(content)

from app.agents.base import AgentInput, AgentOutput
from app.services.gemini import GeminiService
from app.logging_config import get_logger, log_ai_interaction

# Import tool lists for each agent
from app.agents.tools.database_tools import DATABASE_TOOLS
from app.agents.tools.flight_tools import FLIGHT_TOOLS
from app.agents.tools.hotel_tools import HOTEL_TOOLS
from app.agents.tools.trip_tools import TRIP_TOOLS

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
    
    # Tool assignments per agent
    AGENT_TOOLS = {
        "planner": DATABASE_TOOLS + TRIP_TOOLS,
        "flight": FLIGHT_TOOLS + DATABASE_TOOLS[:2],  # flight + get_user_prefs, history
        "hotel": HOTEL_TOOLS + DATABASE_TOOLS[:2],
        "itinerary": DATABASE_TOOLS + TRIP_TOOLS[:2],  # db tools + create_trip, get_summary
        "booking": TRIP_TOOLS + DATABASE_TOOLS[:1],  # trip tools + get_user_prefs
        "verifier": DATABASE_TOOLS[:1] + TRIP_TOOLS[1:2],  # get_user_prefs + get_trip_summary
    }

    def __init__(self):
        self.gemini_service = GeminiService()
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
        workflow.add_node("verifier", self._verifier_node)

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
                "verifier": "verifier",
                "end": END,
            }
        )

        # All agents route to END; booking also passes through verifier
        for agent_name in ["flight", "hotel", "planner", "itinerary", "verifier"]:
            workflow.add_edge(agent_name, END)
        workflow.add_edge("booking", "verifier")

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
        
        # Analyze intent using conversation history for context
        db_history = state.get("context", {}).get("history", [])
        intent_data = await self.gemini_service.analyze_intent(user_message, conversation_history=db_history)
        
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
        """Map intent to agent type. Handles all intents Gemini might return."""
        intent_map = {
            # Flight intents
            "flight_search": "flight",
            "flight_booking": "flight",
            "flights": "flight",
            "flight": "flight",
            # Hotel intents
            "hotel_search": "hotel",
            "hotel_booking": "hotel",
            "hotels": "hotel",
            "hotel": "hotel",
            "accommodation": "hotel",
            # Planning intents
            "trip_planning": "planner",
            "itinerary_planning": "planner",
            "destination_search": "planner",
            "general_travel": "planner",
            "general": "planner",
            "travel_planning": "planner",
            # Itinerary intents
            "itinerary_management": "itinerary",
            "itinerary": "itinerary",
            "schedule": "itinerary",
            # Booking intents
            "booking": "booking",
            "booking_coordination": "booking",
            "book": "booking",
            # Verifier intents
            "booking_verification": "verifier",
            "verification": "verifier",
        }
        mapped = intent_map.get(intent, "planner")
        logger.info(f"Intent mapped", intent=intent, agent_type=mapped)
        return mapped

    def _route_to_agent(self, state: AgentState) -> Literal["flight", "hotel", "planner", "itinerary", "booking", "verifier", "end"]:
        """Conditional routing function for LangGraph"""
        agent_type = state.get("agent_type", "planner")
        valid = {"flight", "hotel", "planner", "itinerary", "booking", "verifier"}
        if agent_type in valid:
            logger.info(f"Routing to {agent_type} agent", agent_type=agent_type, intent=state.get("intent"))
            return agent_type
        logger.warning(f"Unknown agent type, routing to end", agent_type=agent_type)
        return "end"
    
    async def _flight_node(self, state: AgentState, config: RunnableConfig) -> AgentState:
        """Flight agent node"""
        return await self._agent_node(state, config, "flight")
    
    async def _hotel_node(self, state: AgentState, config: RunnableConfig) -> AgentState:
        """Hotel agent node"""
        return await self._agent_node(state, config, "hotel")
    
    async def _planner_node(self, state: AgentState, config: RunnableConfig) -> AgentState:
        """Planner agent node"""
        return await self._agent_node(state, config, "planner")
    
    async def _itinerary_node(self, state: AgentState, config: RunnableConfig) -> AgentState:
        """Itinerary agent node"""
        return await self._agent_node(state, config, "itinerary")
    
    async def _booking_node(self, state: AgentState, config: RunnableConfig) -> AgentState:
        """Booking agent node"""
        return await self._agent_node(state, config, "booking")

    async def _verifier_node(self, state: AgentState, config: RunnableConfig) -> AgentState:
        """Verifier agent — validates trip plans, checks date consistency, budget compliance."""
        return await self._agent_node(state, config, "verifier")
    
    async def _agent_node(self, state: AgentState, config: RunnableConfig, agent_type: str) -> AgentState:
        """
        Generic agent node executor using ReAct (tool-calling) agents.

        Each call builds a ReAct sub-graph for the given agent_type, injects
        the conversation history + RAG context, then invokes it.  The final
        AIMessage content (after all tool calls) is appended to state.
        """
        import time
        from app.agents.react_agents import build_react_agent
        from langchain_core.messages import HumanMessage as LCHuman, AIMessage as LCAi

        logger.info(f"Executing {agent_type} agent node (ReAct)", agent_type=agent_type)

        # Get current user message
        user_message = None
        for msg in reversed(state["messages"]):
            if isinstance(msg, HumanMessage):
                user_message = msg.content
                break

        if not user_message:
            logger.warning(f"No user message in {agent_type} agent node")
            return state

        # Build conversation history from DB context (not state["messages"])
        db_history = state.get("context", {}).get("history", [])
        lc_messages = []
        for msg in db_history:
            role = msg.get("role", "")
            content = msg.get("content", "")
            if not content:
                continue
            if role == "user":
                lc_messages.append(LCHuman(content=content))
            elif role == "assistant":
                lc_messages.append(LCAi(content=content))

        # Inject RAG context into the current message
        rag_context = state.get("context", {}).get("rag_context", "")
        augmented_message = user_message
        if rag_context:
            augmented_message = (
                f"{user_message}\n\n"
                f"---\n[Context from knowledge base]\n{rag_context}\n---"
            )
            logger.info(f"RAG context injected into {agent_type} prompt", rag_length=len(rag_context))

        # Append the current (augmented) message
        lc_messages.append(LCHuman(content=augmented_message))

        agent_run_id = None
        start_time = time.time()
        try:
            from app.services.database import db_service as _db
            if _db.supabase:
                run_result = _db.supabase.table("agent_runs").insert({
                    "conversation_id": state.get("conversation_id"),
                    "agent_type": agent_type,
                    "execution_status": "running",
                    "input": {"user_message": user_message[:500]},
                }).execute()
                if run_result.data:
                    agent_run_id = run_result.data[0].get("id")
        except Exception:
            pass  # Don't fail the request if logging fails

        try:
            user_id = state.get("context", {}).get("user_id")
            react_agent = build_react_agent(agent_type, user_id=user_id)
            result = await react_agent.ainvoke({"messages": lc_messages}, config=config)
            duration = time.time() - start_time

            # Extract final AI response (last AIMessage in result).
            # Use _extract_text() because content may be a list of parts
            # when the model performed tool calls (ChatGoogleGenerativeAI quirk).
            response = ""
            for msg in reversed(result.get("messages", [])):
                if isinstance(msg, LCAi) and msg.content:
                    response = _extract_text(msg.content)
                    break

            if not response:
                # Fallback: join all AI message texts
                response = " ".join(
                    _extract_text(m.content)
                    for m in result.get("messages", [])
                    if isinstance(m, LCAi) and m.content
                )

            state["messages"].append(AIMessage(content=response))
            # Update agent_run as completed
            try:
                if agent_run_id and _db.supabase:
                    _db.supabase.table("agent_runs").update({
                        "execution_status": "completed",
                        "duration_ms": round(duration * 1000, 2),
                        "output": {"response_length": len(response)},
                    }).eq("id", agent_run_id).execute()
            except Exception:
                pass

            logger.info(
                f"{agent_type} ReAct agent completed",
                agent_type=agent_type,
                response_length=len(response),
                duration_ms=round(duration * 1000, 2),
            )
            log_ai_interaction(
                agent_type=agent_type,
                user_message=user_message,
                ai_response=response,
                duration=duration,
                metadata={"conversation_id": state.get("conversation_id")},
            )

        except Exception as e:
            duration = time.time() - start_time
            logger.error(
                f"ReAct agent error in {agent_type}",
                agent_type=agent_type,
                error=str(e),
                duration_ms=round(duration * 1000, 2),
            )
            # Graceful fallback to raw Gemini if ReAct fails
            try:
                logger.info(f"Falling back to raw Gemini for {agent_type}")
                db_history = state.get("context", {}).get("history", [])
                conversation_history = [
                    {"role": m.get("role", "user"), "content": m.get("content", "")}
                    for m in db_history if m.get("content")
                ]
                response = await self.gemini_service.generate_response(
                    user_message=augmented_message,
                    conversation_history=conversation_history,
                    agent_type=agent_type,
                )
                state["messages"].append(AIMessage(content=response))
                logger.info(f"Fallback response generated", agent_type=agent_type, response_length=len(response))
            except Exception as fallback_err:
                state["messages"].append(AIMessage(content=f"I encountered an error. Please try again."))
                logger.error(f"Fallback also failed", error=str(fallback_err))

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

            "verifier": """You are a trip verification and quality assurance specialist.
Your role is to:
- Verify that trip plans are logically consistent (dates, destinations, travel times)
- Check that budgets are realistic for the chosen destinations and duration
- Confirm that all bookings align with the trip itinerary
- Flag any potential issues (e.g., impossible connections, missing hotel for a night)
- Suggest corrections or improvements when problems are detected

Be thorough, precise, and constructive. Always explain any issues found clearly.""",
        }

        return prompts.get(agent_type, prompts["planner"])
    
    async def stream_response(
        self,
        user_message: str,
        context: dict,
        conversation_id: str,
    ):
        """
        Stream responses using LangGraph graph execution.
        """
        import time as _t
        AGENT_NODES = {"flight", "hotel", "planner", "itinerary", "booking", "verifier"}

        initial_state = AgentState(
            messages=[HumanMessage(content=user_message)],
            context=context,
            conversation_id=conversation_id,
        )

        started_agents = set()
        _token_n = 0
        _t0 = _t.time()

        async for event in self.graph.astream_events(initial_state, version="v2"):
            kind = event["event"]
            name = event["name"]

            # Detect agent start
            if kind == "on_chain_start" and name in AGENT_NODES and name not in started_agents:
                started_agents.add(name)
                yield {"type": "agent_start", "agent_type": name}

            # Detect content streaming
            elif kind == "on_chat_model_stream":
                chunk = event["data"]["chunk"]
                if chunk.content:
                    content = _extract_text(chunk.content)
                    if content:
                        _token_n += 1
                        logger.info(
                            "stream_token",
                            n=_token_n,
                            ms=round((_t.time() - _t0) * 1000),
                            chars=len(content),
                            preview=repr(content[:50]),
                            conversation_id=conversation_id,
                        )
                        yield {"type": "content", "content": content}

            # Detect agent end — also rescue fallback responses.
            # When the ReAct agent fails and the non-streaming Gemini fallback
            # fires, no on_chat_model_stream events are emitted. The response
            # still lands in state["messages"] so we extract it here to avoid
            # sending an empty reply to the client.
            elif kind == "on_chain_end" and name in AGENT_NODES:
                if _token_n == 0:
                    output = event.get("data", {}).get("output", {})
                    output_msgs = output.get("messages", []) if isinstance(output, dict) else []
                    for msg in reversed(output_msgs):
                        if isinstance(msg, AIMessage) and msg.content:
                            fallback_text = _extract_text(msg.content)
                            if fallback_text:
                                _token_n += 1
                                logger.info(
                                    "stream_token_fallback",
                                    chars=len(fallback_text),
                                    conversation_id=conversation_id,
                                )
                                yield {"type": "content", "content": fallback_text}
                            break
                yield {"type": "agent_end", "agent_type": name}

        logger.info(
            "stream_response_done",
            total_tokens=_token_n,
            total_ms=round((_t.time() - _t0) * 1000),
            conversation_id=conversation_id,
        )
        yield {"type": "done"}
