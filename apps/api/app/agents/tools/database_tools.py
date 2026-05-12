"""
Database & RAG tools for agent use.

These tools let agents retrieve contextual information from Supabase:
  - User travel preferences
  - User travel history
  - Destination search (semantic RAG)
  - Attraction search
  - Airport lookup
"""

import json
from langchain_core.tools import tool
from app.agents.tools.base import log_tool_call
from app.services.database import db_service
from app.services.rag_service import RAGService
from app.logging_config import get_logger

logger = get_logger("agents.tools.database")
_rag = RAGService()


@tool
@log_tool_call
async def get_user_preferences(user_id: str) -> str:
    """
    Retrieve travel preferences for a given user from the database.

    Args:
        user_id: The UUID of the user.

    Returns:
        JSON string with the user's travel preferences (style, budget, interests, etc.)
    """
    try:
        if not db_service.supabase:
            return json.dumps({"error": "Database not available"})
        result = db_service.supabase.table("user_preferences").select("*").eq("user_id", user_id).single().execute()
        if result.data:
            prefs = result.data
            # Remove raw embedding from LLM output
            prefs.pop("preference_embedding", None)
            return json.dumps({"preferences": prefs})
        return json.dumps({"preferences": None, "note": "No preferences set for this user"})
    except Exception as e:
        logger.error("get_user_preferences error", error=str(e))
        return json.dumps({"error": str(e)})


@tool
@log_tool_call
async def get_travel_history(user_id: str) -> str:
    """
    Retrieve a user's past travel history entries.

    Args:
        user_id: The UUID of the user.

    Returns:
        JSON string listing past destinations, ratings, and tags.
    """
    try:
        if not db_service.supabase:
            return json.dumps({"error": "Database not available"})
        result = db_service.supabase.table("user_travel_history") \
            .select("destination, start_date, end_date, description, rating, tags") \
            .eq("user_id", user_id) \
            .order("start_date", desc=True) \
            .limit(10) \
            .execute()
        return json.dumps({"travel_history": result.data or []})
    except Exception as e:
        logger.error("get_travel_history error", error=str(e))
        return json.dumps({"error": str(e)})


@tool
@log_tool_call
async def search_destinations(query: str) -> str:
    """
    Semantically search travel guide knowledge base for destination info.

    Args:
        query: A natural language search query (e.g., "romantic city with good food in Europe").

    Returns:
        JSON string with matching travel guide excerpts and their destination names.
    """
    try:
        embedding = await _rag.embed_text(query)
        if not embedding:
            return json.dumps({"error": "Could not generate search embedding"})

        result = db_service.supabase.rpc("match_travel_guides", {
            "query_embedding": embedding,
            "match_threshold": 0.4,
            "match_count": 5,
        }).execute()

        guides = []
        for row in (result.data or []):
            guides.append({
                "destination": row.get("destination"),
                "title": row.get("title"),
                "content": row.get("content"),
                "category": row.get("category"),
                "similarity": round(row.get("similarity", 0), 3),
            })
        return json.dumps({"destinations": guides})
    except Exception as e:
        logger.error("search_destinations error", error=str(e))
        return json.dumps({"error": str(e)})


@tool
@log_tool_call
async def search_attractions(city: str, category: str = "") -> str:
    """
    Search for tourist attractions in a given city, optionally filtered by category.

    Args:
        city: City name (e.g., "Paris").
        category: Optional category filter (e.g., "museum", "park", "temple").

    Returns:
        JSON string with matching attractions including name, description, rating, and address.
    """
    try:
        if not db_service.supabase:
            return json.dumps({"error": "Database not available"})
        query = db_service.supabase.table("attractions") \
            .select("name, description, category, rating, address, ticket_price, opening_hours") \
            .ilike("city_name", f"%{city}%")
        if category:
            query = query.eq("category", category)
        result = query.order("rating", desc=True).limit(10).execute()
        return json.dumps({"attractions": result.data or []})
    except Exception as e:
        logger.error("search_attractions error", error=str(e))
        return json.dumps({"error": str(e)})


@tool
@log_tool_call
async def search_airports(query: str) -> str:
    """
    Search airports by name, city, or IATA code.

    Args:
        query: Search term (e.g., "Paris" or "CDG").

    Returns:
        JSON string with matching airports including IATA code, name, city, and country.
    """
    try:
        if not db_service.supabase:
            return json.dumps({"error": "Database not available"})
        result = db_service.supabase.table("airports") \
            .select("iata_code, name, city, country_code, timezone") \
            .or_(f"iata_code.ilike.%{query}%,name.ilike.%{query}%,city.ilike.%{query}%") \
            .limit(10) \
            .execute()
        return json.dumps({"airports": result.data or []})
    except Exception as e:
        logger.error("search_airports error", error=str(e))
        return json.dumps({"error": str(e)})


# Convenience list for import
DATABASE_TOOLS = [
    get_user_preferences,
    get_travel_history,
    search_destinations,
    search_attractions,
    search_airports,
]
