# LangGraph Implementation

## Overview

The Orbis AI backend now uses **LangGraph** for multi-agent orchestration. This replaces the previous manual routing logic with a proper StateGraph-based architecture.

## Architecture

### State Management

```python
class AgentState(TypedDict):
    """State schema for LangGraph orchestration"""
    messages: Annotated[list[BaseMessage], add_messages]
    intent: NotRequired[str]
    agent_type: NotRequired[str]
    entities: NotRequired[dict]
    context: NotRequired[dict]
    conversation_id: NotRequired[str]
```

### Graph Structure

```
┌─────────────────┐
│   User Input    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Orchestrator   │ ← Intent Analysis
│     Node        │ ← Agent Type Mapping
└────────┬────────┘
         │
         ▼
    ┌────┴────┐
    │ Router  │ ← Conditional Edges
    └────┬────┘
         │
    ┌────┴────┬─────────┬──────────┬───────────┐
    │         │         │          │           │
    ▼         ▼         ▼          ▼           ▼
┌───────┐ ┌───────┐ ┌─────────┐ ┌──────────┐ ┌─────────┐
│Flight │ │Hotel  │ │ Planner │ │Itinerary │ │ Booking │
│ Node  │ │ Node  │ │  Node   │ │   Node   │ │  Node   │
└───┬───┘ └───┬───┘ └────┬────┘ └────┬─────┘ └────┬────┘
    │         │          │           │            │
    └─────────┴──────────┴───────────┴────────────┘
                         │
                         ▼
                    ┌────────┐
                    │  END   │
                    └────────┘
```

## Implementation Details

### 1. StateGraph Construction

The graph is built with:
- **Entry Point**: Orchestrator node (intent analysis)
- **Agent Nodes**: Flight, Hotel, Planner, Itinerary, Booking
- **Conditional Routing**: Based on intent analysis results
- **Edges**: All agents route to END after execution

```python
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

# Add conditional routing
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

# Compile graph
self.graph = workflow.compile()
```

### 2. Intent-Based Routing

The orchestrator analyzes user intent and maps it to the appropriate agent:

```python
intent_map = {
    "flight_search": "flight",
    "flight_booking": "flight",
    "hotel_search": "hotel",
    "hotel_booking": "hotel",
    "trip_planning": "planner",
    "itinerary_management": "itinerary",
    "booking_coordination": "booking",
    "general": "planner",
}
```

### 3. Streaming with astream_events

LangGraph's `astream_events()` provides proper streaming support:

```python
async for event in self.graph.astream_events(initial_state, version="v2"):
    event_type = event.get("event")
    
    if event_type == "on_chain_start":
        # Agent started
        yield {"type": "agent_start", "agent_type": node_name}
    
    elif event_type == "on_chat_model_stream":
        # Token from LLM
        yield {"type": "content", "content": chunk.content}
    
    elif event_type == "on_chain_end":
        # Agent finished
        yield {"type": "agent_end", "agent_type": node_name}
```

### 4. Agent-Specific System Prompts

Each agent has a specialized system prompt:

- **Flight Agent**: Flight search and booking specialist
- **Hotel Agent**: Hotel search and reservation specialist
- **Planner Agent**: Trip planning and recommendations
- **Itinerary Agent**: Schedule and activity management
- **Booking Agent**: Multi-booking coordination

## Integration

### Chat Streaming Endpoint

The `/api/v1/chat/stream` endpoint now uses LangGraph:

```python
# Initialize LangGraph orchestrator
orchestrator = LangGraphOrchestrator()

# Stream response
async for event in orchestrator.stream_response(
    user_message=request.message,
    context=context,
    conversation_id=conversation_id,
):
    if event["type"] == "agent_start":
        # Send agent info to frontend
        yield {"event": "agent", "data": {...}}
    
    elif event["type"] == "content":
        # Send content token
        yield {"event": "token", "data": {...}}
    
    elif event["type"] == "done":
        # Stream complete
        break
```

## Benefits

### 1. **Proper State Management**
- LangGraph manages conversation state across agent transitions
- State persists through the graph execution
- No manual state tracking required

### 2. **Declarative Routing**
- Conditional edges clearly define routing logic
- Easy to visualize and debug
- Type-safe with TypedDict

### 3. **Native Streaming Support**
- Built-in event streaming with `astream_events()`
- Token-level streaming from LLM
- Chain start/end events for agent tracking

### 4. **Scalability**
- Easy to add new agents (add node + edge)
- Modular agent implementation
- Graph can be visualized and optimized

### 5. **Maintainability**
- Clear separation of concerns
- Each agent is an independent node
- Routing logic is declarative, not imperative

## Future Enhancements

### Phase 3 (Upcoming)

1. **Specialized Agent Implementations**
   - FlightAgent with Amadeus/Skyscanner integration
   - HotelAgent with Booking.com/Hotels.com APIs
   - PlannerAgent with destination data
   - ItineraryAgent with schedule optimization
   - BookingAgent with payment coordination

2. **Advanced Routing**
   - Multi-agent collaboration (parallel execution)
   - Agent chaining for complex queries
   - Conditional sub-graphs for workflows

3. **State Persistence**
   - Save graph checkpoints to database
   - Resume interrupted conversations
   - Multi-turn agent coordination

4. **Tool Integration**
   - LangGraph tool calling for external APIs
   - Function calling for booking actions
   - RAG integration for context enrichment

## Dependencies

```
langgraph==1.0.4
langgraph-checkpoint==3.0.1
langgraph-sdk==0.2.14
langchain-core==1.1.1
```

## Files Modified

- `apps/api/app/agents/langgraph_orchestrator.py` - New LangGraph orchestrator
- `apps/api/app/routers/chat_stream.py` - Updated to use LangGraph
- `apps/api/requirements.txt` - Added LangGraph dependencies

## Testing

To test the LangGraph integration:

1. Start the API server:
   ```bash
   cd apps/api
   source venv/bin/activate
   uvicorn app.main:app --reload --port 8000
   ```

2. Send a chat message through the frontend dashboard

3. Monitor the console for LangGraph events:
   - `on_chain_start`: Agent node started
   - `on_chat_model_stream`: Token streaming
   - `on_chain_end`: Agent node finished

4. Check database for agent metadata in messages

## Conclusion

The LangGraph implementation provides a robust, scalable foundation for multi-agent orchestration. It replaces manual routing with declarative state graphs, enables proper streaming, and sets the stage for advanced multi-agent collaboration in Phase 3.
