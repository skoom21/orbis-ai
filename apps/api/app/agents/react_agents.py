"""
ReAct agent builders for each specialized agent type.

Each agent is a compiled LangGraph sub-graph created via `create_react_agent`.
The sub-graph uses ChatGoogleGenerativeAI (LangChain binding) so that tool-calling
works natively through the LangChain/LangGraph protocol.

Usage:
    agent = get_react_agent("flight", system_prompt, user_id)
    result = await agent.ainvoke({"messages": [HumanMessage(content=...)]})
    final_text = result["messages"][-1].content
"""

import os
from datetime import date
from functools import lru_cache
from typing import Optional

from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.prebuilt import create_react_agent
from langchain_core.messages import SystemMessage

from app.agents.tools.database_tools import DATABASE_TOOLS
from app.agents.tools.flight_tools import FLIGHT_TOOLS
from app.agents.tools.hotel_tools import HOTEL_TOOLS
from app.agents.tools.trip_tools import TRIP_TOOLS
from app.config import settings
from app.logging_config import get_logger

logger = get_logger("agents.react")


def _get_llm(temperature: float = 0.7) -> ChatGoogleGenerativeAI:
    """Return a LangChain ChatGoogleGenerativeAI model instance."""
    return ChatGoogleGenerativeAI(
        model=settings.GEMINI_MODEL,
        google_api_key=settings.GOOGLE_API_KEY,
        temperature=temperature,
        convert_system_message_to_human=False,
    )


def _base_prompt() -> str:
    today = date.today().strftime("%B %d, %Y")
    return (
        f"You are Orbis AI, an intelligent travel planning assistant.\n"
        f"Today's date is {today}. Use this as reference for all scheduling and planning.\n"
        f"Always be concise, helpful, and accurate. Use the available tools when you need real data."
    )


# Tool sets per agent
_AGENT_TOOLS = {
    "planner":   DATABASE_TOOLS + TRIP_TOOLS[:2],        # search, prefs + create_trip, get_summary
    "flight":    FLIGHT_TOOLS + DATABASE_TOOLS[:3],       # search_flights + db lookup
    "hotel":     HOTEL_TOOLS + DATABASE_TOOLS[:3],        # search_hotels + db lookup
    "itinerary": DATABASE_TOOLS + TRIP_TOOLS[1:3],        # db + update_itinerary, get_summary
    "booking":   TRIP_TOOLS + DATABASE_TOOLS[:1],         # all trip tools + prefs
    "verifier":  TRIP_TOOLS[1:2] + DATABASE_TOOLS[:1],   # get_summary + prefs
}

# Agent-specific instructions appended to base prompt
_AGENT_INSTRUCTIONS = {
    "planner": (
        "You are a travel planning specialist.\n"
        "Help users plan complete trips: destinations, budgets, activities.\n"
        "Use search_destinations to find relevant travel information.\n"
        "Use create_trip to persist a trip plan once the user confirms details."
    ),
    "flight": (
        "You are a flight search specialist.\n"
        "Use search_flights to find real flight options. Always include price, duration, and airline.\n"
        "If the user hasn't specified an IATA code, use get_airport_info to look it up first.\n"
        "Present results clearly with departure times and total price."
    ),
    "hotel": (
        "You are a hotel and accommodation specialist.\n"
        "Use search_hotels to find accommodation options matching user preferences.\n"
        "Use get_nearby_attractions to recommend things to do near suggested hotels.\n"
        "Present results with price per night, rating, and amenities."
    ),
    "itinerary": (
        "You are an itinerary management specialist.\n"
        "Help users organize their day-by-day travel schedule.\n"
        "Use search_attractions to find activities and points of interest.\n"
        "Use update_itinerary to persist the itinerary once confirmed."
    ),
    "booking": (
        "You are a booking coordination specialist.\n"
        "Help users create and manage bookings for flights, hotels, and activities.\n"
        "Use create_booking to record confirmed bookings.\n"
        "Always confirm details with the user before creating a booking."
    ),
    "verifier": (
        "You are a trip verification specialist.\n"
        "Review trip plans for logical consistency: dates, connections, budget.\n"
        "Use get_trip_summary to review existing plans.\n"
        "Flag any issues and suggest corrections clearly."
    ),
}


def build_react_agent(agent_type: str, user_id: Optional[str] = None):
    """
    Build and return a compiled ReAct agent for the given agent type.

    Args:
        agent_type: One of planner, flight, hotel, itinerary, booking, verifier.
        user_id: Optional user ID for context (future: personalize tools).

    Returns:
        A compiled LangGraph CompiledStateGraph ready for .ainvoke().
    """
    tools = _AGENT_TOOLS.get(agent_type, DATABASE_TOOLS)
    instructions = _AGENT_INSTRUCTIONS.get(agent_type, "You are a travel assistant.")

    system_prompt = f"{_base_prompt()}\n\n{instructions}"

    llm = _get_llm()
    agent = create_react_agent(
        model=llm,
        tools=tools,
        prompt=SystemMessage(content=system_prompt),
    )
    logger.info(f"Built ReAct agent", agent_type=agent_type, tool_count=len(tools))
    return agent
