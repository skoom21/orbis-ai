# Orbis AI — Backend Status Report & Development Roadmap

**Date:** April 13, 2026 (Final Update)
**Scope:** Backend API (FastAPI), LangGraph Agents, RAG Pipeline

---

## 1. Current State Summary

### ✅ Completed

| Component | Status | Notes |
|---|---|---|
| FastAPI Server | ✅ Done | Uvicorn, CORS, SSE |
| Supabase DB | ✅ Done | Service role, circuit breaker |
| Redis Cache | ✅ Done | Upstash Redis |
| Auth Endpoints | ✅ Done | JWT, register, login, refresh, profile |
| Conversation CRUD | ✅ Done | Create, list, get, delete, PATCH title, no-slash routes |
| Messages CRUD | ✅ Done | Create, retrieve with limit |
| Chat Streaming SSE | ✅ Done | `/api/v1/chat/stream`, astream() based |
| LangGraph Graph | ✅ Done | 7 nodes: orchestrator, planner, flight, hotel, itinerary, booking, verifier |
| Intent Routing | ✅ Done | 20+ intent variants mapped correctly |
| Conversation History | ✅ Done | DB history passed to agents per request |
| Auto Conversation Title | ✅ Done | Generated after first exchange via gemini-flash-lite |
| RAG Pipeline | ✅ Done | get_embedding(), rag_service.py, match_travel_guides RPC, 10 guides embedded |
| RAG Context Injection | ✅ Done | Embedded into agent prompts per request |
| Date Awareness | ✅ Done | Today's date injected into all system prompts |
| Users Router | ✅ Done | GET/PATCH /users/me, GET/PUT preferences, GET travel-history |
| Trips Router | ✅ Done | Full CRUD + cancel + itinerary update |
| Bookings Router | ✅ Done | flights/search, hotels/search, create, confirm, cancel |
| Agent Tools (defined) | ✅ Done | database_tools, flight_tools, hotel_tools, trip_tools |
| Agent Tools (wired — ReAct) | ✅ Done | `react_agents.py` — `create_react_agent` per agent type with real tool-calling. Fallback to raw Gemini if ReAct fails |
| Payments Router | ✅ Done | POST /payments/intent, /{id}/confirm, /{id}/refund, GET /payments |
| Stripe Webhook | ✅ Done | POST /webhooks/stripe handles payment_intent.succeeded/failed, charge.refunded |
| agent_runs logging | ✅ Done | Agent node start/complete written to `agent_runs` table |
| agent-feedback endpoint | ✅ Done | POST /api/v1/agent-feedback writes to `agent_feedback` table |
| Notifications Router | ✅ Done | GET /notifications, POST /{id}/read, POST /read-all |
| Analytics Router | ✅ Done | GET /analytics/user-stats, GET /analytics/popular-destinations |
| Seed Data | ✅ Done | Countries, airports, attractions, 10 travel guides with embeddings |

### 🔴 High Priority — Not Done

| Component | Status | Notes |
|---|---|---|
| Amadeus API | ❌ Not connected | flight_tools.py returns mock data; needs AMADEUS_API_KEY + amadeus SDK in `.env` |
| Hotel API (RapidAPI) | ❌ Not connected | hotel_tools.py returns mock data; needs RAPIDAPI_KEY in `.env` |
| Stripe live keys | ❌ Not configured | STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET needed in `.env` |
| tool_calls logging | ❌ Not implemented | Table exists in DB; needs per-tool wrapper logging |

### 🟡 Medium Priority — Not Done

| Component | Status | Notes |
|---|---|---|
| User preference embeddings | ⚠️ Partial | PUT /users/me/preferences generates embedding but only on manual update |
| Unit/integration tests | ❌ Not implemented | No test suite yet |
| Request timeouts | ❌ Not implemented | Amadeus/hotel API calls have no timeout guardrail |

---

## 2. LangGraph Assessment (Updated)

The graph has **7 nodes** and routes correctly. The **critical gap** is B7 — agents are still calling `gemini_service.generate_response()` directly without invoking their assigned tools. To fix this properly requires refactoring agents to use LangChain's `create_react_agent()` with a LangChain-compatible LLM binding.

**Root constraint:** `GeminiService` uses the raw `google-genai` SDK. To use LangGraph's `create_react_agent` with tools, we need a `langchain-google-genai` `ChatGoogleGenerativeAI` model, not the raw SDK. This is a deliberate architectural shift.

---

## 3. Remaining TODOs (Ranked)

### Next: External API Credentials
- [ ] Add `AMADEUS_API_KEY` + `AMADEUS_API_SECRET` to `.env` — unlocks real flight search
- [ ] Add `RAPIDAPI_KEY` to `.env` — unlocks real hotel search
- [ ] Add `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` to `.env` — unlocks payments
- [ ] Test each: run the `search_flights` tool with real IATA codes

### tool_calls DB Logging
- [ ] Add per-tool wrapper in `base.py` that logs to `tool_calls` table (agent_run_id, tool_name, input, output, duration_ms)

### Quality & Testing
- [ ] Unit tests for `rag_service.py`
- [ ] Integration test: full chat flow (message → RAG → intent → ReAct agent → tool → response)
- [ ] Add 15s timeout to Amadeus + RapidAPI HTTP calls
- [ ] Update `.env.example` with all current required vars

---

## 4. Priority Order (Remaining)

```
1.  Add AMADEUS_API_KEY + AMADEUS_API_SECRET to .env   ← makes flights real (tools already wired)
2.  Add RAPIDAPI_KEY to .env                           ← makes hotels real
3.  Add STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET      ← activates payments
4.  tool_calls per-tool DB logging                     ← MARL training data completeness
5.  Request timeouts on external API calls             ← production stability
6.  Unit + integration tests                           ← quality assurance
```

---

## 5. Known Bugs / Watch Items

| Bug | Severity | Status |
|---|---|---|
| `Conversation not found in memory` warning | Low | Harmless — memory fallback is legacy, Supabase is source of truth |
| `history_length=0` on first message | Expected | No history exists yet for brand new chats |
| RAG doesn't retrieve on very short messages (`hello`) | Low | Embedding matches nothing below threshold — by design |

---

## 5. New Files Created This Session

| File | Purpose |
|---|---|
| `app/agents/react_agents.py` | ReAct agent builder — `build_react_agent(type)` returns compiled LangGraph sub-graph with real tools |
| `app/routers/payments.py` | Stripe PaymentIntent, confirm, refund, history + webhook handler |
| `app/routers/notifications.py` | List/mark-read notification endpoints |
| `app/routers/analytics.py` | User stats + popular destinations |
| `app/routers/observability.py` | `POST /agent-feedback` for MARL training data |

---

*Updated: April 13, 2026 — Final*
