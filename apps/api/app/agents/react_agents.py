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
    # gemini-1.5-flash streams granularly (20-50 chunks per response) and is
    # stable/available. gemini-2.0-flash is deprecated for new API keys (404).
    # gemini-2.5-flash batches output into 3-14 large chunks — feels broken.
    return ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=settings.GOOGLE_API_KEY,
        temperature=temperature,
        convert_system_message_to_human=False,
        streaming=True,
        thinking_budget=0,
    )


def _base_prompt(user_id: Optional[str] = None) -> str:
    today = date.today().strftime("%B %d, %Y")
    uid_str = f"The current authenticated user_id is '{user_id}'. You MUST use this ID for all database tool calls (bookings, trips, etc.)." if user_id else "Assume the current user_id is 'demo_user' for any database operations if not explicitly provided."
    return (
        f"You are Orbis AI, an intelligent travel planning assistant.\n"
        f"Today's date is {today}. Use this as reference for all scheduling and planning.\n"
        f"CRITICAL: If the user provides partial dates (e.g., '14th' or 'next Friday'), you MUST automatically infer the full date based on today's date and format it as YYYY-MM-DD. Do NOT ask the user for the year or month if it naturally falls in the upcoming future.\n"
        f"{uid_str}\n"
        f"Always be concise, helpful, and accurate. Use the available tools when you need real data."
    )


# Tool sets per agent
_AGENT_TOOLS = {
    "planner":   DATABASE_TOOLS + TRIP_TOOLS[:2],        # search, prefs + create_trip, get_summary
    "flight":    FLIGHT_TOOLS + DATABASE_TOOLS[:3] + TRIP_TOOLS,       # search_flights + db lookup + booking
    "hotel":     HOTEL_TOOLS + DATABASE_TOOLS[:3] + TRIP_TOOLS,        # search_hotels + db lookup + booking
    "itinerary": DATABASE_TOOLS + TRIP_TOOLS[1:3],        # db + update_itinerary, get_summary
    "booking":   TRIP_TOOLS + DATABASE_TOOLS[:1] + HOTEL_TOOLS + FLIGHT_TOOLS[:1],  # trip + prefs + live hotel/flight booking search
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
        "If the user asks to book a flight, use create_trip (if no trip exists) and create_booking to save the booking to the database.\n"
        "CRITICAL: When returning flight search results, you must output VALID JSON EXACTLY as returned by the tool. Do NOT wrap the JSON in `search_flights_response`. Do NOT use Python variables like `None` or `True/False` - use valid JSON `null`, `true`, `false`. Your ENTIRE final response MUST be exactly the raw JSON array or object. Do NOT include ANY conversational text before or after it. Do NOT wrap it in markdown. Your response should just start with [ or {."
    ),
    "hotel": (
        "You are a hotel and accommodation specialist.\n"
        "Use search_hotels to find accommodation options matching user preferences.\n"
        "Use get_nearby_attractions to recommend things to do near suggested hotels.\n"
        "For real hotel booking via LiteAPI, use this sequence:\n"
        "1) search_hotels to obtain a concrete offer_id for the selected hotel and dates.\n"
        "2) prebook_hotel_rate with that offer_id.\n"
        "3) book_hotel_rate only after user confirms traveler details.\n"
        "If the selected hotel result has no offer_id, run search_hotels again with the same dates and guests and ask the user to select one of the returned bookable offers.\n"
        "After successful booking, use create_booking to persist the confirmed booking in our database.\n"
        "CRITICAL: When returning hotel search results, you must output VALID JSON EXACTLY as returned by the tool. Do NOT use Python variables like `None` or `True/False` - use valid JSON `null`, `true`, `false`. Your ENTIRE final response MUST be exactly the raw JSON object. Do NOT include ANY conversational text. Do NOT wrap it in markdown. Your response MUST begin exactly with {."
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
        "Use search_hotels, prebook_hotel_rate, and book_hotel_rate for real hotel booking via LiteAPI when users request hotel booking.\n"
        "Never claim hotel prebooking is unsupported when tools are available. If an offer_id is missing, run search_hotels again to retrieve a bookable offer and continue.\n"
        "Use search_flights for live flight options before creating flight bookings.\n"
        "Use create_booking to record confirmed bookings in our database.\n"
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

    system_prompt = f"{_base_prompt(user_id)}\n\n{instructions}"

    llm = _get_llm()
    agent = create_react_agent(
        model=llm,
        tools=tools,
        prompt=SystemMessage(content=system_prompt),
    )
    logger.info(f"Built ReAct agent", agent_type=agent_type, tool_count=len(tools))
    return agent
