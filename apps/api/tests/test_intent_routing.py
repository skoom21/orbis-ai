"""
Unit tests for LangGraphOrchestrator._map_intent_to_agent()

Verifies that every intent variant listed in the intent map routes to the
correct agent, and that unknown intents fall back to 'planner'.
No external I/O — the method is pure logic, no mocking needed.
"""

import pytest
from unittest.mock import MagicMock, patch


# ---------------------------------------------------------------------------
# Fixture: instantiate orchestrator with all heavy services mocked
# ---------------------------------------------------------------------------

@pytest.fixture
def orchestrator():
    with patch("app.agents.langgraph_orchestrator.GeminiService"), \
         patch("app.agents.langgraph_orchestrator.DATABASE_TOOLS", []), \
         patch("app.agents.langgraph_orchestrator.FLIGHT_TOOLS", []), \
         patch("app.agents.langgraph_orchestrator.HOTEL_TOOLS", []), \
         patch("app.agents.langgraph_orchestrator.TRIP_TOOLS", []):
        from app.agents.langgraph_orchestrator import LangGraphOrchestrator
        return LangGraphOrchestrator()


# ---------------------------------------------------------------------------
# Tests: known intents
# ---------------------------------------------------------------------------

class TestIntentToAgentMapping:

    # Flight intents
    @pytest.mark.parametrize("intent", ["flight_search", "flight_booking", "flights", "flight"])
    def test_flight_intents(self, orchestrator, intent):
        assert orchestrator._map_intent_to_agent(intent) == "flight"

    # Hotel intents
    @pytest.mark.parametrize("intent", ["hotel_search", "hotel_booking", "hotels", "hotel", "accommodation"])
    def test_hotel_intents(self, orchestrator, intent):
        assert orchestrator._map_intent_to_agent(intent) == "hotel"

    # Planner intents
    @pytest.mark.parametrize("intent", [
        "trip_planning", "itinerary_planning", "destination_search",
        "general_travel", "general", "travel_planning",
    ])
    def test_planner_intents(self, orchestrator, intent):
        assert orchestrator._map_intent_to_agent(intent) == "planner"

    # Itinerary intents
    @pytest.mark.parametrize("intent", ["itinerary_management", "itinerary", "schedule"])
    def test_itinerary_intents(self, orchestrator, intent):
        assert orchestrator._map_intent_to_agent(intent) == "itinerary"

    # Booking intents
    @pytest.mark.parametrize("intent", ["booking", "booking_coordination", "book"])
    def test_booking_intents(self, orchestrator, intent):
        assert orchestrator._map_intent_to_agent(intent) == "booking"

    # Verifier intents
    @pytest.mark.parametrize("intent", ["booking_verification", "verification"])
    def test_verifier_intents(self, orchestrator, intent):
        assert orchestrator._map_intent_to_agent(intent) == "verifier"

    # Unknown intent → falls back to planner
    @pytest.mark.parametrize("intent", ["unknown_thing", "", "random_xyz", "visa_info"])
    def test_unknown_intent_falls_back_to_planner(self, orchestrator, intent):
        assert orchestrator._map_intent_to_agent(intent) == "planner"


# ---------------------------------------------------------------------------
# Tests: routing function returns valid agent or 'end'
# ---------------------------------------------------------------------------

class TestRouteToAgent:

    VALID_AGENTS = {"flight", "hotel", "planner", "itinerary", "booking", "verifier"}

    @pytest.mark.parametrize("agent_type", ["flight", "hotel", "planner", "itinerary", "booking", "verifier"])
    def test_routes_valid_agent_types(self, orchestrator, agent_type):
        state = {"agent_type": agent_type, "messages": [], "intent": "test"}
        result = orchestrator._route_to_agent(state)
        assert result == agent_type
        assert result in self.VALID_AGENTS

    def test_routes_unknown_to_end(self, orchestrator):
        state = {"agent_type": "nonexistent", "messages": [], "intent": "test"}
        result = orchestrator._route_to_agent(state)
        assert result == "end"

    def test_routes_missing_agent_type_to_planner(self, orchestrator):
        # Missing agent_type → defaults to "planner"
        state = {"messages": [], "intent": "test"}
        result = orchestrator._route_to_agent(state)
        assert result == "planner"
