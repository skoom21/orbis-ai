# ORBIS AI - Backend Development TODO

**Project:** ORBIS AI - Multi-Agent Travel Planning Platform  
**Version:** 1.0.0  
**Last Updated:** 2025-01-XX

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Phase 1: Foundation & Core Services](#phase-1-foundation--core-services)
3. [Phase 2: RAG Pipeline Implementation](#phase-2-rag-pipeline-implementation)
4. [Phase 3: Multi-Agent System](#phase-3-multi-agent-system)
5. [Phase 4: External API Integrations](#phase-4-external-api-integrations)
6. [Phase 5: Multi-Agent Reinforcement Learning (MARL)](#phase-5-multi-agent-reinforcement-learning-marl)
7. [Phase 6: Payment & Booking Flow](#phase-6-payment--booking-flow)
8. [Phase 7: Advanced Features](#phase-7-advanced-features)
9. [Phase 8: Testing & Quality Assurance](#phase-8-testing--quality-assurance)
10. [Phase 9: Performance Optimization](#phase-9-performance-optimization)
11. [Phase 10: Deployment & Monitoring](#phase-10-deployment--monitoring)
12. [Phase 11: Multi-Modal Trip Summarizer](#phase-11-multi-modal-trip-summarizer)
13. [Phase 12: Real-Time Constraint Solver](#phase-12-real-time-constraint-solver)
14. [Phase 13: Federated Learning](#phase-13-federated-learning)
15. [Phase 14: Autonomous Negotiation Bots](#phase-14-autonomous-negotiation-bots)
16. [Priority Matrix](#priority-matrix)

---

## Project Overview

### Mission
Build a comprehensive AI-powered travel planning platform using multi-agent systems, RAG, and MARL to provide personalized, intelligent travel recommendations and seamless booking experiences. Incorporate cutting-edge research innovations including multi-modal AI, real-time constraint solving, federated learning, and autonomous negotiation.

### Tech Stack
- **Backend**: FastAPI (Python 3.11+)
- **Database**: Supabase PostgreSQL 15+ with pgvector
- **Caching**: Redis
- **AI Models**: 
  - Google Gemini (gemini-2.5-flash) for conversational AI
  - OpenAI text-embedding-3-small for RAG embeddings (1536-dim)
  - GPT-4V / LLaVA for multi-modal trip summarization
- **Agent Framework**: LangChain + LangGraph
- **External APIs**: Amadeus (flights), Booking.com (hotels), Stripe (payments), Google Maps API
- **MARL Framework**: Custom implementation with Ray RLlib or Stable-Baselines3
- **Constraint Solver**: OR-Tools or OptaPlanner for real-time re-planning
- **Federated Learning**: TensorFlow Federated or PySyft
- **Monitoring**: Prometheus, Grafana, Sentry
- **Deployment**: Docker, Kubernetes

### Architecture Highlights
- **7 Specialized Agents**: Planner, Flight, Hotel, Itinerary, Booking, Verifier, Orchestrator
- **RAG System**: Semantic search over travel guides, user preferences, and travel history
- **MARL**: Multi-agent coordination with shared rewards, policy optimization, and negotiation
- **Multi-Modal AI**: Visual + textual trip summaries with maps and images
- **Real-Time Optimization**: Constraint solver for dynamic re-planning
- **Privacy-First**: Federated learning for preference learning
- **Autonomous Negotiation**: Game-theoretic pricing agents
- **Microservices**: API, Events, Frontend (Next.js)

### Research Innovation Goals
1. **MARL for Optimal Planning**: Agents negotiate between cost, time, and quality
2. **Multi-Modal Summaries**: Text + maps + images powered by GPT-4V
3. **Real-Time Constraint Solving**: Millisecond re-planning for disruptions
4. **Federated Learning**: Privacy-preserving preference learning
5. **Autonomous Negotiation**: AI agents that negotiate prices in real-time

---

## Phase 1: Foundation & Core Services

### 1.1 Project Setup & Structure
- [x] Initialize FastAPI project structure
- [x] Set up virtual environment and dependencies
- [x] Configure environment variables (`.env`)
- [ ] Set up Docker Compose for local development
  - [ ] PostgreSQL with pgvector
  - [ ] Redis
  - [ ] FastAPI app
  - [ ] Events service (Node.js)
- [ ] Set up logging configuration (structured logging with JSON)
- [ ] Configure CORS and security headers
- [ ] Set up pre-commit hooks (black, ruff, mypy)

**Files to Create/Update:**
- `apps/api/docker-compose.yml`
- `apps/api/app/core/config.py` (Pydantic settings)
- `apps/api/app/core/logging.py`
- `apps/api/app/core/security.py`
- `.pre-commit-config.yaml`

---

### 1.2 Database Connection & Services
- [x] Supabase client setup with service role
- [x] Database service with circuit breaker pattern
- [x] Memory fallback service
- [ ] Connection pooling configuration (pgbouncer)
- [ ] Database migration setup (Alembic)
- [ ] Seed scripts for reference data (airports, cities, countries, attractions, travel_guides)
- [ ] Database health check endpoint

**Files to Create/Update:**
- `apps/api/app/db/migrations/` (Alembic)
- `apps/api/app/db/seeds/` (seed scripts)
- `apps/api/app/api/v1/endpoints/health.py`

---

### 1.3 Authentication & Authorization
- [ ] Supabase Auth integration
- [ ] JWT token validation middleware
- [ ] User registration endpoint
- [ ] User login endpoint
- [ ] Password reset flow
- [ ] Email verification flow
- [ ] RLS policy testing utilities
- [ ] Role-based access control (RBAC) for admin endpoints

**Files to Create:**
- `apps/api/app/core/auth.py`
- `apps/api/app/api/dependencies/auth.py`
- `apps/api/app/api/v1/endpoints/auth.py`
- `apps/api/tests/test_auth.py`

---

### 1.4 Redis Caching Service
- [x] Redis client setup with connection pooling
- [x] Circuit breaker for Redis operations
- [x] Memory fallback for cache misses
- [ ] Cache invalidation strategies
- [ ] Cache warming for popular destinations
- [ ] Redis pub/sub for real-time updates
- [ ] Cache metrics and monitoring

**Files to Update:**
- `apps/api/app/services/redis.py` (enhance with metrics)
- `apps/api/app/core/cache.py` (cache decorators)

---

### 1.5 User Management APIs
- [ ] GET `/users/me` - Get current user profile
- [ ] PATCH `/users/me` - Update user profile
- [ ] DELETE `/users/me` - Soft delete user (GDPR compliance)
- [ ] GET `/users/me/preferences` - Get user travel preferences
- [ ] PUT `/users/me/preferences` - Update user preferences
- [ ] GET `/users/me/travel-history` - Get user travel history
- [ ] POST `/users/me/travel-history` - Add travel history entry
- [ ] User avatar upload to cloud storage (Supabase Storage)

**Files to Create:**
- `apps/api/app/api/v1/endpoints/users.py`
- `apps/api/app/schemas/user.py`
- `apps/api/app/crud/user.py`
- `apps/api/tests/test_users_api.py`

---

### 1.6 Conversation & Message APIs
- [x] Chat service with Gemini integration
- [ ] POST `/conversations` - Create new conversation
- [ ] GET `/conversations` - List user conversations
- [ ] GET `/conversations/{id}` - Get conversation details
- [ ] PATCH `/conversations/{id}` - Update conversation title
- [ ] DELETE `/conversations/{id}` - Archive conversation
- [ ] GET `/conversations/{id}/messages` - Get messages (paginated)
- [ ] POST `/conversations/{id}/messages` - Send message (AI response)
- [ ] WebSocket endpoint for real-time messaging
- [ ] Conversation context management (sliding window)
- [ ] Message streaming support (SSE or WebSocket)

**Files to Create:**
- `apps/api/app/api/v1/endpoints/conversations.py`
- `apps/api/app/api/v1/endpoints/messages.py`
- `apps/api/app/schemas/conversation.py`
- `apps/api/app/schemas/message.py`
- `apps/api/app/crud/conversation.py`
- `apps/api/app/api/v1/websockets/chat.py`

---

## Phase 2: RAG Pipeline Implementation

### 2.1 Embedding Generation Service
- [ ] OpenAI embedding client setup (text-embedding-3-small)
- [ ] Batch embedding generation
- [ ] Embedding cache (Redis)
- [ ] Retry logic with exponential backoff
- [ ] Cost tracking for embedding API calls
- [ ] Embedding generation for:
  - User preference text → `user_preferences.preference_embedding`
  - Travel guide content → `travel_guides.content_embedding`
  - Travel history descriptions → `user_travel_history.experience_embedding`

**Files to Create:**
- `apps/api/app/services/embeddings.py`
- `apps/api/app/core/openai_client.py`
- `apps/api/tests/test_embeddings.py`

---

### 2.2 Vector Database Setup
- [ ] Verify pgvector extension is enabled in Supabase
- [ ] Create IVFFlat indexes for vector columns (if not in schema)
- [ ] Optimize vector index parameters (lists, probes)
- [ ] Test vector similarity search performance
- [ ] Benchmark different distance metrics (cosine vs L2)

**SQL Verification:**
```sql
-- Verify vector extension
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Check existing vector indexes
SELECT indexname FROM pg_indexes 
WHERE indexname LIKE '%embedding%';
```

---

### 2.3 RAG Query Functions
- [ ] Implement `match_user_preferences()` function wrapper
- [ ] Implement `match_travel_guides()` function wrapper
- [ ] Implement `find_similar_trips()` function wrapper
- [ ] Hybrid search (vector + keyword/filter)
- [ ] Reranking logic for better results
- [ ] Context window management for LLM prompts
- [ ] RAG response citation/attribution

**Files to Create:**
- `apps/api/app/services/rag.py`
- `apps/api/app/api/v1/endpoints/rag.py`
- `apps/api/tests/test_rag.py`

---

### 2.4 RAG API Endpoints
- [ ] POST `/rag/match-preferences` - Find similar user preferences
- [ ] POST `/rag/search-guides` - Semantic search travel guides
- [ ] POST `/rag/similar-trips` - Find similar trips
- [ ] GET `/recommendations/destinations` - Personalized destination recommendations
- [ ] POST `/rag/ask` - Generic RAG query endpoint (for testing)

**Files to Create:**
- Covered in `apps/api/app/api/v1/endpoints/rag.py`

---

### 2.5 Knowledge Base Management
- [ ] Admin endpoint to add travel guides
- [ ] Admin endpoint to update travel guides
- [ ] Bulk import for travel guides (CSV/JSON)
- [ ] Automated embedding regeneration on content update
- [ ] Travel guide categorization and tagging
- [ ] Source attribution and credibility scoring

**Files to Create:**
- `apps/api/app/api/v1/endpoints/admin/knowledge_base.py`
- `apps/api/app/crud/travel_guide.py`
- `apps/api/scripts/import_travel_guides.py`

---

## Phase 3: Multi-Agent System

### 3.1 Agent Framework Setup
- [ ] Install LangChain, LangGraph, LangSmith
- [ ] Configure LangSmith for agent observability
- [ ] Define base agent class/interface
- [ ] Agent execution tracking (`agent_runs` table integration)
- [ ] Tool call logging (`tool_calls` table integration)
- [ ] Agent state management
- [ ] Agent error handling and recovery

**Files to Create:**
- `apps/api/app/agents/base.py`
- `apps/api/app/agents/tools/base.py`
- `apps/api/app/services/langchain_client.py`
- `apps/api/app/core/langsmith_config.py`

---

### 3.2 Agent Tool Development

#### 3.2.1 Flight Search Tool
- [ ] Amadeus API integration (flight search)
- [ ] Tool: `search_flights(origin, destination, date, ...)`
- [ ] Result caching in `search_cache` table
- [ ] Error handling for API failures
- [ ] Cost tracking (`api_usage_logs`)

#### 3.2.2 Hotel Search Tool
- [ ] Booking.com API integration (hotel search)
- [ ] Tool: `search_hotels(city, checkin, checkout, ...)`
- [ ] Result caching
- [ ] Price comparison logic

#### 3.2.3 Database Query Tools
- [ ] Tool: `get_user_preferences(user_id)`
- [ ] Tool: `get_travel_history(user_id)`
- [ ] Tool: `search_attractions(city, category)`
- [ ] Tool: `get_weather_forecast(city, date)` (external API)

#### 3.2.4 Recommendation Tools
- [ ] Tool: `recommend_destinations(user_id, preferences)`
- [ ] Tool: `calculate_destination_score(user_id, destination)`
- [ ] Tool: `find_similar_travelers(user_id)`

#### 3.2.5 Booking Tools
- [ ] Tool: `create_booking(trip_id, booking_type, details)`
- [ ] Tool: `confirm_booking(booking_id)`
- [ ] Tool: `cancel_booking(booking_id)`

**Files to Create:**
- `apps/api/app/agents/tools/flight.py`
- `apps/api/app/agents/tools/hotel.py`
- `apps/api/app/agents/tools/database.py`
- `apps/api/app/agents/tools/recommendations.py`
- `apps/api/app/agents/tools/booking.py`

---

### 3.3 Specialized Agents

#### 3.3.1 Planner Agent
- [ ] Define agent prompt and persona
- [ ] Tools: RAG search, user preferences, destination recommendations
- [ ] Input: User request (e.g., "Plan a 5-day trip to Paris")
- [ ] Output: Trip plan with destinations, dates, budget estimate
- [ ] Context management (conversation history)

#### 3.3.2 Flight Agent
- [ ] Define agent prompt and persona
- [ ] Tools: `search_flights`, `get_user_preferences`, cache lookup
- [ ] Input: Origin, destination, dates, preferences
- [ ] Output: Ranked flight options with reasoning
- [ ] Optimization: Multi-city flights, layovers

#### 3.3.3 Hotel Agent
- [ ] Define agent prompt and persona
- [ ] Tools: `search_hotels`, `get_attractions_nearby`, reviews
- [ ] Input: City, dates, budget, preferences
- [ ] Output: Ranked hotel options
- [ ] Location optimization (proximity to attractions)

#### 3.3.4 Itinerary Agent
- [ ] Define agent prompt and persona
- [ ] Tools: `search_attractions`, `get_opening_hours`, `calculate_distances`
- [ ] Input: Destinations, interests, pace, duration
- [ ] Output: Day-by-day itinerary with activities
- [ ] Optimization: Travel time, opening hours, crowd avoidance

#### 3.3.5 Booking Agent
- [ ] Define agent prompt and persona
- [ ] Tools: `create_booking`, `confirm_booking`, payment integration
- [ ] Input: Selected flights, hotels, activities
- [ ] Output: Confirmed bookings with confirmation numbers
- [ ] Transaction management (rollback on failure)

#### 3.3.6 Verifier Agent
- [ ] Define agent prompt and persona
- [ ] Tools: Data validation, consistency checks, policy enforcement
- [ ] Input: Trip plan, bookings
- [ ] Output: Validation report, error corrections
- [ ] Checks: Date consistency, budget compliance, availability

#### 3.3.7 Orchestrator Agent
- [ ] Define agent prompt and persona (meta-agent)
- [ ] Manages agent execution flow
- [ ] Decides which agents to invoke based on user request
- [ ] Aggregates results from multiple agents
- [ ] Handles inter-agent communication
- [ ] Error recovery and fallback strategies

**Files to Create:**
- `apps/api/app/agents/planner.py`
- `apps/api/app/agents/flight.py`
- `apps/api/app/agents/hotel.py`
- `apps/api/app/agents/itinerary.py`
- `apps/api/app/agents/booking.py`
- `apps/api/app/agents/verifier.py`
- `apps/api/app/agents/orchestrator.py`

---

### 3.4 Agent Execution Pipeline
- [ ] Agent invocation service
- [ ] Agent run logging to `agent_runs` table
- [ ] Tool call logging to `tool_calls` table
- [ ] Token usage and cost tracking
- [ ] Agent execution timeout handling
- [ ] Parallel agent execution (where applicable)
- [ ] Agent result aggregation

**Files to Create:**
- `apps/api/app/services/agent_executor.py`
- `apps/api/app/schemas/agent.py`

---

### 3.5 Agent APIs
- [ ] POST `/agents/chat` - Generic agent chat endpoint
- [ ] POST `/agents/plan-trip` - Trigger Planner Agent
- [ ] POST `/agents/search-flights` - Trigger Flight Agent
- [ ] POST `/agents/search-hotels` - Trigger Hotel Agent
- [ ] POST `/agents/generate-itinerary` - Trigger Itinerary Agent
- [ ] GET `/agent-runs/{id}` - Get agent run details
- [ ] GET `/conversations/{id}/agent-runs` - Get all agent runs for conversation

**Files to Create:**
- `apps/api/app/api/v1/endpoints/agents.py`

---

## Phase 4: External API Integrations

### 4.1 Amadeus API Integration (Flights)
- [ ] Register for Amadeus API keys (test + production)
- [ ] OAuth2 authentication flow
- [ ] Endpoint: Flight Offers Search
- [ ] Endpoint: Flight Price Analysis
- [ ] Endpoint: Airport & City Search
- [ ] Result transformation to internal schema
- [ ] Rate limiting and quota management
- [ ] Error handling and retry logic
- [ ] Mock responses for testing

**Files to Create:**
- `apps/api/app/integrations/amadeus/client.py`
- `apps/api/app/integrations/amadeus/flights.py`
- `apps/api/app/integrations/amadeus/schemas.py`
- `apps/api/tests/integrations/test_amadeus.py`

**Environment Variables:**
```
AMADEUS_API_KEY=your_key
AMADEUS_API_SECRET=your_secret
AMADEUS_BASE_URL=https://test.api.amadeus.com
```

---

### 4.2 Booking.com API Integration (Hotels)
- [ ] Register for Booking.com Affiliate API
- [ ] Authentication setup
- [ ] Endpoint: Hotel Search
- [ ] Endpoint: Hotel Details
- [ ] Endpoint: Hotel Reviews
- [ ] Result transformation
- [ ] Rate limiting
- [ ] Commission tracking
- [ ] Mock responses for testing

**Files to Create:**
- `apps/api/app/integrations/booking/client.py`
- `apps/api/app/integrations/booking/hotels.py`
- `apps/api/app/integrations/booking/schemas.py`

**Alternative:** Consider RapidAPI's Booking.com API if official API is unavailable.

---

### 4.3 Stripe Payment Integration
- [ ] Register for Stripe API keys
- [ ] Stripe client setup
- [ ] Create Payment Intent endpoint
- [ ] Confirm Payment endpoint
- [ ] Refund Payment endpoint
- [ ] Webhook handler for payment events
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `charge.refunded`
- [ ] Idempotency keys for payment operations
- [ ] 3D Secure (SCA) support
- [ ] Payment method management
- [ ] Invoice generation

**Files to Create:**
- `apps/api/app/integrations/stripe/client.py`
- `apps/api/app/integrations/stripe/payments.py`
- `apps/api/app/api/v1/endpoints/payments.py`
- `apps/api/app/api/v1/webhooks/stripe.py`

**Environment Variables:**
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

### 4.4 Additional APIs (Optional)
- [ ] Weather API (OpenWeatherMap or WeatherAPI)
- [ ] Currency Conversion API (Fixer.io or ExchangeRate-API)
- [ ] Translation API (Google Translate or DeepL)
- [ ] Image API (Unsplash or Pexels for destination images)
- [ ] Email Service (SendGrid or Mailgun)
- [ ] SMS Service (Twilio)

---

## Phase 5: Multi-Agent Reinforcement Learning (MARL)

### 5.1 MARL Framework Setup
- [ ] Choose MARL library (Ray RLlib or Stable-Baselines3)
- [ ] Define multi-agent environment
- [ ] State space definition (user preferences, context, available options)
- [ ] Action space definition (agent decisions: select flight, hotel, etc.)
- [ ] Reward function design (user satisfaction, cost efficiency, booking success)
- [ ] Shared reward vs individual rewards
- [ ] Episode definition (one full trip planning session)
- [ ] **Agent negotiation framework** (cooperative game theory)
- [ ] **Conflict resolution mechanisms** (cheaper flight vs better hotel location)
- [ ] **Multi-objective optimization** (cost, time, quality trade-offs)

**Files to Create:**
- `apps/api/app/marl/environment.py`
- `apps/api/app/marl/rewards.py`
- `apps/api/app/marl/config.py`
- `apps/api/app/marl/negotiation.py` ✨ NEW

---

### 5.2 Agent Policy Networks
- [ ] Define neural network architecture for each agent
- [ ] Input features: User preferences, conversation context, historical data
- [ ] Output: Agent action probabilities or Q-values
- [ ] Policy initialization (pre-training vs random)
- [ ] Model checkpointing
- [ ] **Communication channels** between agents (shared memory, message passing)
- [ ] **Negotiation policies** (bidding, auction mechanisms)

**Files to Create:**
- `apps/api/app/marl/models/planner_policy.py`
- `apps/api/app/marl/models/flight_policy.py`
- `apps/api/app/marl/models/hotel_policy.py`
- `apps/api/app/marl/models/negotiation_policy.py` ✨ NEW
- (etc. for each agent)

---

### 5.3 Training Pipeline
- [ ] Data collection from production (`agent_runs`, `trip_reviews`, `agent_feedback`)
- [ ] **Synthetic data generation** for initial training (simulate diverse scenarios)
- [ ] **Historical data preprocessing** (trip bookings, user satisfaction)
- [ ] Offline training pipeline (batch training)
- [ ] Online training pipeline (incremental learning)
- [ ] Experience replay buffer
- [ ] Training metrics logging (reward, loss, episode length)
- [ ] Hyperparameter tuning
- [ ] A/B testing framework for new policies
- [ ] **Curriculum learning** (start with simple scenarios, increase complexity)

**Files to Create:**
- `apps/api/app/marl/training/offline_trainer.py`
- `apps/api/app/marl/training/online_trainer.py`
- `apps/api/app/marl/training/data_loader.py`
- `apps/api/app/marl/training/synthetic_data_generator.py` ✨ NEW

---

### 5.4 Reward Function Design
- [ ] User satisfaction score (from `trip_reviews.overall_rating`)
- [ ] Cost efficiency (actual_cost vs estimated_budget)
- [ ] **Time efficiency** (total travel time, wait times)
- [ ] Booking success rate
- [ ] Response time penalty
- [ ] Error penalty (failed bookings, invalid suggestions)
- [ ] Diversity bonus (novel recommendations)
- [ ] **Negotiation success bonus** (better deals obtained)
- [ ] **Multi-objective reward aggregation** (Pareto optimization)

**Reward Formula Example:**
```python
reward = (
    0.3 * user_satisfaction_score +      # Primary goal
    0.2 * cost_efficiency_score +        # Budget optimization
    0.15 * time_efficiency_score +       # Travel time optimization
    0.15 * booking_success_score +       # Reliability
    0.1 * response_time_score +          # Speed
    0.1 * diversity_score -              # Novelty bonus
    error_penalty +                       # Failure cost
    negotiation_bonus                     # Deal quality
)
```

**Files to Update:**
- `apps/api/app/marl/rewards.py`

---

### 5.5 Agent Coordination & Negotiation Strategies
- [ ] Centralized training, decentralized execution (CTDE)
- [ ] **Communication protocol** between agents (message passing, shared observations)
- [ ] Shared observation space
- [ ] **Action coordination** (Flight Agent waits for Planner Agent)
- [ ] **Conflict resolution algorithms**:
  - [ ] Nash bargaining solution
  - [ ] Auction-based resource allocation
  - [ ] Voting mechanisms for consensus
  - [ ] Priority queues for agent turns
- [ ] **Trade-off negotiations**:
  - [ ] Cost vs quality (cheaper flight vs better location)
  - [ ] Time vs comfort (direct flight vs layover)
  - [ ] Budget allocation across flight, hotel, activities
- [ ] **Coalition formation** (agents team up for better deals)
- [ ] **Pareto frontier analysis** (optimal trade-off curves)

**Files to Create:**
- `apps/api/app/marl/coordination.py`
- `apps/api/app/marl/negotiation/nash_bargaining.py` ✨ NEW
- `apps/api/app/marl/negotiation/auction.py` ✨ NEW
- `apps/api/app/marl/negotiation/voting.py` ✨ NEW

---

### 5.6 Evaluation & Deployment
- [ ] Evaluation metrics (episode reward, success rate, cost)
- [ ] Offline evaluation on historical data
- [ ] Online evaluation with canary deployment
- [ ] Model versioning and rollback
- [ ] Production inference optimization (ONNX, TensorRT)
- [ ] Monitoring: Model drift, reward degradation
- [ ] **Ablation studies** (measure impact of each agent)
- [ ] **Baseline comparisons** (rule-based vs MARL)

**Files to Create:**
- `apps/api/app/marl/evaluation.py`
- `apps/api/app/marl/inference.py`
- `apps/api/scripts/marl_train.py`
- `apps/api/scripts/marl_evaluate.py`

---

### 5.7 Agent Feedback Collection
- [ ] POST `/agent-feedback` - Submit feedback on agent response
- [ ] Store feedback in `agent_feedback` table
- [ ] Feedback types: thumbs up/down, rating, text comment
- [ ] Link feedback to `agent_run_id` for training data
- [ ] Aggregate feedback for reward calculation
- [ ] **Implicit feedback** (time spent viewing options, click patterns)
- [ ] **Explicit feedback** (user edits to agent suggestions)

**Files to Create:**
- `apps/api/app/api/v1/endpoints/feedback.py`
- `apps/api/app/schemas/feedback.py`

---

## Phase 6: Payment & Booking Flow

### 6.1 Trip Management APIs
- [ ] POST `/trips` - Create trip
- [ ] GET `/trips` - List user trips (with filters)
- [ ] GET `/trips/{id}` - Get trip details
- [ ] PATCH `/trips/{id}` - Update trip (title, description, itinerary)
- [ ] DELETE `/trips/{id}` - Cancel trip
- [ ] POST `/trips/{id}/review` - Submit trip review

**Files to Create:**
- `apps/api/app/api/v1/endpoints/trips.py`
- `apps/api/app/schemas/trip.py`
- `apps/api/app/crud/trip.py`

---

### 6.2 Booking APIs
- [ ] POST `/bookings/flights/search` - Search flights (via Amadeus)
- [ ] POST `/bookings/hotels/search` - Search hotels (via Booking.com)
- [ ] POST `/bookings` - Create booking
- [ ] POST `/bookings/{id}/confirm` - Confirm booking
- [ ] POST `/bookings/{id}/cancel` - Cancel booking
- [ ] GET `/bookings/{id}` - Get booking details

**Files to Create:**
- `apps/api/app/api/v1/endpoints/bookings.py`
- `apps/api/app/schemas/booking.py`
- `apps/api/app/crud/booking.py`

---

### 6.3 Payment Flow
- [ ] POST `/payments/intent` - Create Stripe Payment Intent
- [ ] POST `/payments/{id}/confirm` - Confirm payment
- [ ] POST `/payments/{id}/refund` - Refund payment
- [ ] GET `/payments` - Get payment history
- [ ] Webhook: Handle Stripe events (payment success/failure)
- [ ] Trigger: Update trip `actual_cost` on payment success
- [ ] Notification: Send email/in-app notification on payment status

**Files to Create:**
- `apps/api/app/api/v1/endpoints/payments.py`
- `apps/api/app/schemas/payment.py`

---

### 6.4 Notification System
- [ ] GET `/notifications` - Get user notifications
- [ ] POST `/notifications/{id}/read` - Mark notification as read
- [ ] POST `/notifications/read-all` - Mark all as read
- [ ] Email notifications (SendGrid/Mailgun)
- [ ] Push notifications (Firebase Cloud Messaging)
- [ ] Notification templates (booking confirmed, payment success, trip reminder)

**Files to Create:**
- `apps/api/app/api/v1/endpoints/notifications.py`
- `apps/api/app/services/notification.py`
- `apps/api/app/services/email.py`
- `apps/api/app/templates/emails/` (HTML email templates)

---

## Phase 7: Advanced Features

### 7.1 Analytics & Reporting
- [ ] GET `/analytics/user-stats` - User statistics (trips, spending)
- [ ] GET `/analytics/popular-destinations` - Popular destinations view
- [ ] GET `/analytics/revenue` - Revenue analytics (admin)
- [ ] GET `/analytics/agent-performance` - Agent performance metrics
- [ ] GET `/analytics/conversion-funnel` - User conversion funnel
- [ ] Scheduled job: Refresh materialized views daily

**Files to Create:**
- `apps/api/app/api/v1/endpoints/analytics.py`
- `apps/api/app/schemas/analytics.py`

---

### 7.2 Reference Data APIs
- [ ] GET `/reference/airports` - Search airports
- [ ] GET `/reference/cities` - Get cities (with filters)
- [ ] GET `/reference/countries` - Get countries
- [ ] GET `/reference/attractions` - Get attractions
- [ ] Public access (no auth required)

**Files to Create:**
- `apps/api/app/api/v1/endpoints/reference.py`

---

### 7.3 Admin Endpoints
- [ ] GET `/admin/health` - System health check
- [ ] GET `/admin/errors` - Error logs
- [ ] POST `/admin/refresh-views` - Refresh materialized views
- [ ] GET `/admin/api-usage` - API usage statistics
- [ ] POST `/admin/knowledge-base` - Manage travel guides
- [ ] GET `/admin/users` - List all users (admin only)
- [ ] PATCH `/admin/users/{id}` - Update user status

**Files to Create:**
- `apps/api/app/api/v1/endpoints/admin/` (multiple files)

---

### 7.4 Search & Filters
- [ ] Full-text search on trips (title, description)
- [ ] Filter trips by status, date range, destination
- [ ] Filter bookings by type, status
- [ ] Sort options (date, price, rating)
- [ ] Pagination helpers

**Files to Create:**
- `apps/api/app/utils/filters.py`
- `apps/api/app/utils/pagination.py`

---

### 7.5 File Uploads
- [ ] User avatar upload (Supabase Storage)
- [ ] Trip images upload
- [ ] Document uploads (e.g., passport, visa)
- [ ] Image optimization and thumbnails
- [ ] File size and type validation

**Files to Create:**
- `apps/api/app/services/storage.py`
- `apps/api/app/api/v1/endpoints/uploads.py`

---

## Phase 8: Testing & Quality Assurance

### 8.1 Unit Tests
- [ ] Test user CRUD operations
- [ ] Test authentication flows
- [ ] Test conversation and message creation
- [ ] Test RAG functions (mocked embeddings)
- [ ] Test agent tool functions
- [ ] Test payment integration (mocked Stripe)
- [ ] Test booking creation and confirmation
- [ ] Target: 80%+ code coverage

**Testing Libraries:**
- `pytest`
- `pytest-asyncio`
- `httpx` (for async HTTP tests)
- `faker` (test data generation)

**Files to Create:**
- `apps/api/tests/unit/` (organized by module)
- `apps/api/tests/conftest.py` (fixtures)

---

### 8.2 Integration Tests
- [ ] Test end-to-end user registration flow
- [ ] Test conversation + message + agent execution flow
- [ ] Test trip creation + booking + payment flow
- [ ] Test RAG pipeline with real embeddings
- [ ] Test external API integrations (Amadeus, Booking.com, Stripe)
- [ ] Test WebSocket connections
- [ ] Test database transactions and rollbacks

**Files to Create:**
- `apps/api/tests/integration/` (organized by feature)

---

### 8.3 Load Testing
- [ ] Set up Locust or K6 for load testing
- [ ] Test scenarios:
  - Concurrent user conversations
  - Heavy RAG queries
  - Multiple agent executions
  - Payment processing under load
- [ ] Identify bottlenecks (database, Redis, external APIs)
- [ ] Optimize based on results

**Files to Create:**
- `apps/api/tests/load/locustfile.py`

---

### 8.4 Security Testing
- [ ] SQL injection testing (should be prevented by ORM)
- [ ] Authentication bypass testing
- [ ] RLS policy verification
- [ ] CORS configuration testing
- [ ] Rate limiting testing
- [ ] Input validation and sanitization
- [ ] Secrets scanning (detect hardcoded secrets)

**Tools:**
- `bandit` (Python security linter)
- `safety` (dependency vulnerability checker)

---

## Phase 9: Performance Optimization

### 9.1 Database Optimization
- [ ] Query performance analysis (EXPLAIN ANALYZE)
- [ ] Index optimization (add missing indexes)
- [ ] Connection pooling tuning (pgbouncer)
- [ ] Materialized view refresh schedule optimization
- [ ] Partitioning large tables (e.g., `user_activity_logs`, `agent_runs`)
- [ ] Query caching for expensive queries

---

### 9.2 Caching Strategy
- [ ] Cache user preferences (Redis TTL: 1 hour)
- [ ] Cache travel guides (Redis TTL: 24 hours)
- [ ] Cache flight/hotel search results (Redis TTL: 1 hour)
- [ ] Cache RAG embeddings (Redis TTL: 24 hours)
- [ ] Cache popular destinations (Redis TTL: 12 hours)
- [ ] Cache invalidation on data updates

---

### 9.3 API Performance
- [ ] Enable HTTP/2
- [ ] Response compression (gzip)
- [ ] Database query batching
- [ ] Lazy loading for large responses
- [ ] Pagination for all list endpoints
- [ ] Rate limiting (per user, per endpoint)
- [ ] API response time monitoring

---

### 9.4 Agent Performance
- [ ] Reduce agent execution time (optimize prompts)
- [ ] Parallel tool execution where possible
- [ ] Agent response caching (for similar requests)
- [ ] Token usage optimization (shorter prompts)
- [ ] Model selection (use cheaper models for simple tasks)

---

## Phase 10: Deployment & Monitoring

### 10.1 Containerization
- [x] Dockerfile for FastAPI app
- [ ] Dockerfile for Events service (Node.js)
- [ ] Docker Compose for multi-service local development
- [ ] Multi-stage builds for production images
- [ ] Image size optimization (use Alpine Linux)

**Files to Create/Update:**
- `apps/api/Dockerfile` (optimize)
- `apps/events/Dockerfile`
- `docker-compose.yml`

---

### 10.2 Kubernetes Deployment
- [ ] K8s deployment manifests for API service
- [ ] K8s deployment manifests for Events service
- [ ] K8s service definitions
- [ ] Ingress configuration (NGINX or Traefik)
- [ ] ConfigMaps and Secrets management
- [ ] Horizontal Pod Autoscaler (HPA)
- [ ] Health check probes (liveness, readiness)

**Files to Create:**
- `infra/k8s/api-deployment.yaml`
- `infra/k8s/events-deployment.yaml`
- `infra/k8s/ingress.yaml`
- `infra/k8s/configmap.yaml`

---

### 10.3 CI/CD Pipeline
- [ ] GitHub Actions workflow for tests
- [ ] GitHub Actions workflow for linting (black, ruff, mypy)
- [ ] GitHub Actions workflow for Docker build
- [ ] GitHub Actions workflow for deployment to K8s
- [ ] Automated database migrations on deployment
- [ ] Rollback strategy

**Files to Create:**
- `.github/workflows/test.yml`
- `.github/workflows/lint.yml`
- `.github/workflows/deploy.yml`

---

### 10.4 Monitoring & Logging
- [ ] Set up Prometheus for metrics collection
- [ ] Set up Grafana dashboards
  - API request rate, latency, error rate
  - Database query performance
  - Agent execution metrics
  - Redis cache hit rate
  - External API usage and costs
- [ ] Set up Sentry for error tracking
- [ ] Set up structured logging (JSON format)
- [ ] Log aggregation (ELK stack or Loki)
- [ ] Alerting rules (PagerDuty or Slack)

**Metrics to Track:**
- Request rate (req/sec)
- Response time (p50, p95, p99)
- Error rate (%)
- Database connection pool usage
- Redis cache hit rate
- Agent execution time
- Token usage and costs
- Payment success rate

---

### 10.5 Database Backups
- [ ] Automated daily backups (Supabase handles this)
- [ ] Manual backup scripts
- [ ] Backup restoration testing
- [ ] Backup retention policy (30 days)
- [ ] Export critical data to S3/GCS

---

### 10.6 Documentation
- [x] API documentation (this file)
- [ ] OpenAPI/Swagger documentation (auto-generated)
- [ ] Developer onboarding guide
- [ ] Architecture diagrams (C4 model, sequence diagrams)
- [ ] Deployment runbook
- [ ] Incident response playbook

**Files to Create:**
- `README.md` (project overview)
- `docs/architecture.md`
- `docs/deployment.md`
- `docs/development.md`
- `docs/diagrams/` (architecture diagrams)

---

## Phase 11: Multi-Modal Trip Summarizer

### 11.1 Multi-Modal AI Setup
- [ ] OpenAI GPT-4V API integration (vision + text)
- [ ] Alternative: LLaVA model setup (open-source option)
- [ ] Google Maps API integration (Static Maps + Directions)
- [ ] Image generation/retrieval APIs (Unsplash, Pexels, DALL-E)
- [ ] Cost estimation and optimization

**Files to Create:**
- `apps/api/app/integrations/openai/vision.py`
- `apps/api/app/integrations/google_maps/maps.py`
- `apps/api/app/integrations/google_maps/directions.py`
- `apps/api/app/integrations/images/unsplash.py`

**Environment Variables:**
```
OPENAI_GPT4V_API_KEY=your_key
GOOGLE_MAPS_API_KEY=your_key
UNSPLASH_API_KEY=your_key
```

---

### 11.2 Trip Visualization Pipeline
- [ ] Convert itinerary data to geo-coordinates
- [ ] Generate route maps with annotations:
  - [ ] Waypoints (hotels, attractions, restaurants)
  - [ ] Travel routes (walking, driving, transit)
  - [ ] Time estimates between locations
  - [ ] Distance markers
- [ ] Map styling and customization
- [ ] Multi-day route visualization (different colors per day)
- [ ] Interactive map embedding (Mapbox, Leaflet)

**Files to Create:**
- `apps/api/app/services/trip_visualizer.py`
- `apps/api/app/services/geocoding.py`
- `apps/api/app/utils/map_renderer.py`

---

### 11.3 Image Integration
- [ ] Fetch landmark images from APIs (Unsplash, Google Places)
- [ ] Weather icons and forecasts
- [ ] Hotel/restaurant images from booking APIs
- [ ] AI-generated images for ambiance (DALL-E)
- [ ] Image optimization (compression, resizing)
- [ ] Image caching strategy

**Files to Create:**
- `apps/api/app/services/image_fetcher.py`
- `apps/api/app/services/weather_service.py`

---

### 11.4 Multi-Modal LLM Processing
- [ ] Combine text itinerary + map images + landmark photos
- [ ] GPT-4V prompting for rich descriptions:
  - [ ] Describe visual aspects of destinations
  - [ ] Suggest photo opportunities
  - [ ] Identify cultural/historical context from images
  - [ ] Generate engaging narrative for trip summary
- [ ] Multi-modal RAG (retrieve relevant images + text)
- [ ] Token optimization for vision models

**Prompt Example:**
```
Given this itinerary map [image], landmark photos [images], and textual plan [text],
create an engaging visual + textual trip summary highlighting:
- Key attractions with visual descriptions
- Best photo spots
- Cultural insights
- Time estimates with map annotations
```

**Files to Create:**
- `apps/api/app/services/multimodal_summarizer.py`

---

### 11.5 Trip Summary Generation API
- [ ] POST `/trips/{id}/generate-summary` - Generate multi-modal summary
- [ ] Response format:
  - [ ] Rich text description (HTML/Markdown)
  - [ ] Annotated map images (base64 or URLs)
  - [ ] Landmark photo gallery
  - [ ] Weather forecast with icons
  - [ ] Day-by-day visual breakdown
- [ ] PDF export of summary (WeasyPrint or ReportLab)
- [ ] Email delivery of summary
- [ ] Caching for expensive operations

**Files to Create:**
- `apps/api/app/api/v1/endpoints/trip_summary.py`
- `apps/api/app/schemas/trip_summary.py`
- `apps/api/app/services/pdf_generator.py`

---

### 11.6 Frontend Integration
- [ ] Interactive map component (React + Mapbox/Leaflet)
- [ ] Image gallery component
- [ ] Timeline visualization
- [ ] Print-friendly CSS for trip summaries
- [ ] Share trip summary via link

---

## Phase 12: Real-Time Constraint Solver

### 12.1 Constraint Solver Setup
- [ ] Choose solver: Google OR-Tools or OptaPlanner
- [ ] Install and configure solver
- [ ] Define constraint programming model
- [ ] Variable definitions (flights, hotels, activities, time slots)
- [ ] Constraint definitions (time windows, budgets, dependencies)
- [ ] Objective functions (minimize cost, travel time, maximize satisfaction)

**Files to Create:**
- `apps/api/app/optimization/solver.py`
- `apps/api/app/optimization/constraints.py`
- `apps/api/app/optimization/objectives.py`

**Dependencies:**
```
pip install ortools  # OR
pip install optapy   # OptaPlanner Python wrapper
```

---

### 12.2 Constraint Modeling
- [ ] **Time constraints**:
  - [ ] Flight departure/arrival times
  - [ ] Hotel check-in/check-out times
  - [ ] Attraction opening hours
  - [ ] Activity durations
  - [ ] Travel time between locations
- [ ] **Budget constraints**:
  - [ ] Total budget limit
  - [ ] Per-category budgets (flight, hotel, food)
  - [ ] Daily spending limits
- [ ] **Dependency constraints**:
  - [ ] Must have hotel before activities
  - [ ] Flight arrival before hotel check-in
  - [ ] Sequential activity ordering
- [ ] **Availability constraints**:
  - [ ] Hotel vacancy
  - [ ] Flight seat availability
  - [ ] Booking windows (advance booking required)
- [ ] **User preference constraints**:
  - [ ] Preferred time windows (morning flight vs evening)
  - [ ] Must-visit attractions
  - [ ] Dietary restrictions for restaurant selection

**Files to Create:**
- `apps/api/app/optimization/models/trip_model.py`
- `apps/api/app/optimization/constraints/time_constraints.py`
- `apps/api/app/optimization/constraints/budget_constraints.py`
- `apps/api/app/optimization/constraints/dependency_constraints.py`

---

### 12.3 Dynamic Re-Planning Engine
- [ ] **Trigger events** for re-planning:
  - [ ] Flight delay/cancellation (from airline APIs)
  - [ ] Hotel cancellation
  - [ ] Budget changes (user updates budget)
  - [ ] Itinerary modifications (user adds/removes activities)
  - [ ] Weather disruptions
  - [ ] Emergency events
- [ ] **Real-time optimization**:
  - [ ] Millisecond response requirement (use heuristics)
  - [ ] Incremental solving (only re-solve affected parts)
  - [ ] Anytime algorithms (improve solution over time)
  - [ ] Meta-heuristics (tabu search, simulated annealing, genetic algorithms)
- [ ] **Fallback strategies**:
  - [ ] Pre-computed backup options
  - [ ] Rule-based quick fixes
  - [ ] Cached similar scenarios
- [ ] **Notification system** for re-planned trips

**Files to Create:**
- `apps/api/app/optimization/replanner.py`
- `apps/api/app/optimization/heuristics.py`
- `apps/api/app/optimization/event_handlers.py`

---

### 12.4 Re-Planning API Endpoints
- [ ] POST `/trips/{id}/replan` - Trigger re-planning
  - Query params: `reason` (delay, cancellation, budget_change, etc.)
  - Body: Updated constraints/parameters
- [ ] GET `/trips/{id}/optimization-status` - Get solver status
- [ ] POST `/trips/{id}/optimize` - Initial optimization (for new trips)
- [ ] WebSocket endpoint for real-time optimization updates

**Files to Create:**
- `apps/api/app/api/v1/endpoints/optimization.py`
- `apps/api/app/api/v1/websockets/optimization.py`

---

### 12.5 Airline-Grade Rescheduling Logic
- [ ] **Flight disruption handling**:
  - [ ] Find next available flights
  - [ ] Re-book hotels if arrival date changes
  - [ ] Adjust itinerary for lost days
  - [ ] Calculate refund/rebooking costs
- [ ] **Multi-leg trip optimization**:
  - [ ] Handle complex routing (multi-city trips)
  - [ ] Optimize layovers
  - [ ] Minimize total travel time
- [ ] **Compensation calculation**:
  - [ ] EU261 regulations (flight delay compensation)
  - [ ] Hotel vouchers
  - [ ] Meal vouchers
- [ ] **User preference preservation**:
  - [ ] Try to maintain original preferences
  - [ ] Explain trade-offs in re-plan

**Files to Create:**
- `apps/api/app/optimization/flight_rescheduler.py`
- `apps/api/app/optimization/compensation_calculator.py`

---

### 12.6 Performance Optimization
- [ ] Benchmark solver performance (target: < 100ms for simple re-plans)
- [ ] Parallel solving for independent sub-problems
- [ ] Solution caching for common scenarios
- [ ] Constraint relaxation for infeasible problems
- [ ] Incremental constraint propagation

**Files to Create:**
- `apps/api/tests/optimization/test_solver_performance.py`

---

## Phase 13: Federated Learning for Privacy-Preserving Preference Learning

### 13.1 Federated Learning Framework Setup
- [ ] Choose FL framework: TensorFlow Federated (TFF) or PySyft
- [ ] Server-side aggregation logic (FedAvg, FedProx)
- [ ] Client-side training SDK (JavaScript for web, Swift/Kotlin for mobile)
- [ ] Secure communication protocol (TLS, encrypted model updates)
- [ ] Differential privacy implementation (DP-SGD)
- [ ] Model versioning and distribution

**Files to Create:**
- `apps/api/app/federated/server.py`
- `apps/api/app/federated/aggregator.py`
- `apps/api/app/federated/privacy.py`
- `apps/frontend/lib/federated/client.ts` (client-side training)

**Dependencies:**
```
pip install tensorflow-federated  # OR
pip install syft                  # PySyft
pip install opacus                # Differential privacy
```

---

### 13.2 On-Device Model Training
- [ ] **Client-side preference model**:
  - [ ] Input: User interactions, trip browsing history, clicks
  - [ ] Output: Preference embeddings (local)
  - [ ] Model: Lightweight neural network (< 5MB)
  - [ ] Training: SGD on local data
- [ ] **Data that stays on device**:
  - [ ] Browsing history
  - [ ] Search queries
  - [ ] Clicked items
  - [ ] Time spent on pages
  - [ ] Device location history (optional)
- [ ] **Model training triggers**:
  - [ ] Periodic (daily, weekly)
  - [ ] After significant interactions
  - [ ] While device is charging and on Wi-Fi
- [ ] **TensorFlow.js or ONNX Runtime** for in-browser training

**Files to Create:**
- `apps/frontend/lib/federated/local_trainer.ts`
- `apps/frontend/lib/federated/preference_model.ts`
- `apps/api/app/federated/models/preference_model.py`

---

### 13.3 Secure Aggregation Protocol
- [ ] **Federated Averaging (FedAvg)**:
  - [ ] Clients send encrypted model updates (not raw data)
  - [ ] Server aggregates updates (weighted average)
  - [ ] Server broadcasts global model to clients
- [ ] **Differential Privacy (DP)**:
  - [ ] Add Gaussian noise to gradients (DP-SGD)
  - [ ] Privacy budget tracking (epsilon, delta)
  - [ ] Gradient clipping to bound sensitivity
- [ ] **Secure Multi-Party Computation (SMPC)** (optional):
  - [ ] Homomorphic encryption for model updates
  - [ ] Server cannot see individual updates
- [ ] **Honest-but-curious threat model**:
  - [ ] Protect against server snooping
  - [ ] Protect against other clients

**Files to Create:**
- `apps/api/app/federated/aggregation/fedavg.py`
- `apps/api/app/federated/privacy/differential_privacy.py`
- `apps/api/app/federated/encryption/secure_aggregation.py`

---

### 13.4 Federated API Endpoints
- [ ] GET `/federated/model/latest` - Download global model
- [ ] POST `/federated/model/update` - Upload encrypted local model update
- [ ] GET `/federated/privacy/budget` - Get privacy budget status
- [ ] POST `/federated/opt-in` - User opts into federated learning
- [ ] POST `/federated/opt-out` - User opts out (delete local model)

**Files to Create:**
- `apps/api/app/api/v1/endpoints/federated.py`
- `apps/api/app/schemas/federated.py`

---

### 13.5 User Consent & Privacy Controls
- [ ] Explicit user consent for federated learning
- [ ] Privacy dashboard:
  - [ ] Show privacy budget usage
  - [ ] Show what data is used locally
  - [ ] Explain how federated learning works
- [ ] Opt-out mechanism (delete local data and model)
- [ ] GDPR compliance:
  - [ ] Right to explanation
  - [ ] Right to deletion
  - [ ] Data minimization
  - [ ] Purpose limitation
- [ ] Privacy policy updates

**Files to Create:**
- `apps/frontend/components/privacy/FederatedLearningConsent.tsx`
- `apps/frontend/components/privacy/PrivacyDashboard.tsx`
- `docs/privacy/federated_learning_policy.md`

---

### 13.6 Model Performance & Privacy Trade-offs
- [ ] Measure model accuracy with FL vs centralized learning
- [ ] Privacy-utility trade-off analysis:
  - [ ] Accuracy degradation with more noise (DP)
  - [ ] Communication efficiency (# rounds to converge)
  - [ ] Client participation rate (stragglers)
- [ ] Benchmarking:
  - [ ] Personalization quality (local vs global model)
  - [ ] Inference latency (on-device vs server)
- [ ] A/B testing: FL users vs non-FL users

**Files to Create:**
- `apps/api/scripts/federated_experiments.py`
- `apps/api/tests/federated/test_privacy_budget.py`

---

## Phase 14: Autonomous Negotiation Bots for Dynamic Pricing

### 14.1 Game-Theoretic Framework Setup
- [ ] **Negotiation game design**:
  - [ ] Players: Orbis AI agent vs vendor agent (simulated or real API)
  - [ ] State space: Offer history, market conditions, inventory
  - [ ] Action space: Make offer, accept, reject, counter-offer
  - [ ] Payoff function: Profit for vendor, savings for user
- [ ] **Negotiation strategies**:
  - [ ] Alternating offers protocol
  - [ ] Deadline-based negotiation (limited rounds)
  - [ ] Reserve price (minimum acceptable)
  - [ ] Aspiration-based (start high, concede gradually)
- [ ] **Equilibrium concepts**:
  - [ ] Nash equilibrium
  - [ ] Subgame perfect equilibrium (backwards induction)
  - [ ] Pareto optimality

**Files to Create:**
- `apps/api/app/negotiation/game.py`
- `apps/api/app/negotiation/strategies/` (multiple strategies)
- `apps/api/app/negotiation/equilibrium.py`

**Academic References:**
- Rubinstein's bargaining model
- Auction theory (Vickrey, English, Dutch)

---

### 14.2 Negotiation Agent Design
- [ ] **Hotel Negotiation Agent**:
  - [ ] Detects low occupancy (from booking APIs)
  - [ ] Negotiates lower rate based on:
    - [ ] Last-minute bookings (price drops)
    - [ ] Bulk bookings (group discounts)
    - [ ] Long stays (weekly discounts)
    - [ ] Off-season (seasonal pricing)
  - [ ] Historical price analysis (know when to push harder)
- [ ] **Flight Negotiation Agent** (limited, but possible scenarios):
  - [ ] Standby tickets (bid for last-minute seats)
  - [ ] Upgrade negotiations (bid for business class)
  - [ ] Group bookings (negotiate bulk discounts)
- [ ] **Activity Negotiation Agent**:
  - [ ] Private tour pricing
  - [ ] Group activity discounts
  - [ ] Package deals (multiple activities)

**Files to Create:**
- `apps/api/app/negotiation/agents/hotel_agent.py`
- `apps/api/app/negotiation/agents/flight_agent.py`
- `apps/api/app/negotiation/agents/activity_agent.py`

---

### 14.3 Reinforcement Learning for Negotiation
- [ ] **RL setup for negotiation**:
  - [ ] State: Current offer, rounds remaining, market info
  - [ ] Action: Offer price (continuous or discrete)
  - [ ] Reward: +savings if deal accepted, -penalty if deal fails
  - [ ] Episode: One negotiation session
- [ ] **Training**:
  - [ ] Self-play (agent negotiates against itself)
  - [ ] Against scripted opponents (rule-based vendors)
  - [ ] Against historical data (learn from past negotiations)
- [ ] **Algorithms**:
  - [ ] Deep Q-Learning (DQN) for discrete actions
  - [ ] Proximal Policy Optimization (PPO) for continuous actions
  - [ ] Actor-Critic methods
- [ ] **Opponent modeling**:
  - [ ] Learn vendor strategies
  - [ ] Predict vendor's reserve price
  - [ ] Adapt strategy based on vendor type

**Files to Create:**
- `apps/api/app/negotiation/rl/environment.py`
- `apps/api/app/negotiation/rl/policy.py`
- `apps/api/app/negotiation/rl/opponent_model.py`
- `apps/api/scripts/negotiation_train.py`

---

### 14.4 Mock Vendor APIs for Testing
- [ ] **Simulated hotel vendor API**:
  - [ ] Dynamic pricing based on occupancy
  - [ ] Accepts/rejects offers based on rules
  - [ ] Simulates delays (realistic response times)
- [ ] **Simulated flight vendor API**:
  - [ ] Standby pricing
  - [ ] Upgrade bidding
- [ ] **Market simulator**:
  - [ ] Seasonal demand fluctuations
  - [ ] Competitor pricing
  - [ ] Random events (high demand, cancellations)

**Files to Create:**
- `apps/api/app/negotiation/mock_apis/hotel_vendor.py`
- `apps/api/app/negotiation/mock_apis/flight_vendor.py`
- `apps/api/app/negotiation/simulation/market.py`

---

### 14.5 Real-World Integration (Future)
- [ ] **Vendor API partnerships**:
  - [ ] Negotiate with hotel chains for API access
  - [ ] Integrate with dynamic pricing platforms
  - [ ] B2B partnerships for negotiation protocols
- [ ] **Fallback to static pricing**:
  - [ ] If negotiation fails, use standard pricing
  - [ ] Graceful degradation
- [ ] **Compliance & ethics**:
  - [ ] Fair negotiation practices
  - [ ] Transparent to users ("We negotiated a 15% discount!")
  - [ ] Avoid predatory pricing detection

**Files to Create:**
- `apps/api/app/negotiation/integrations/` (real vendor APIs)

---

### 14.6 Negotiation API Endpoints
- [ ] POST `/bookings/hotels/negotiate` - Start hotel negotiation
  - Body: Hotel ID, desired price range, check-in/out dates
  - Response: Negotiation ID, initial offer
- [ ] GET `/negotiations/{id}` - Get negotiation status
- [ ] POST `/negotiations/{id}/accept` - Accept current offer
- [ ] POST `/negotiations/{id}/counter` - Make counter-offer
- [ ] GET `/negotiations/{id}/history` - Get offer history
- [ ] User-facing UI: Real-time negotiation progress bar

**Files to Create:**
- `apps/api/app/api/v1/endpoints/negotiations.py`
- `apps/api/app/schemas/negotiation.py`
- `apps/frontend/components/bookings/NegotiationWidget.tsx`

---

### 14.7 Research & Evaluation
- [ ] **Metrics**:
  - [ ] Average savings per negotiation
  - [ ] Success rate (deals accepted)
  - [ ] Time to reach agreement (# rounds)
  - [ ] User satisfaction with negotiated deals
- [ ] **Ablation studies**:
  - [ ] Compare RL agent vs rule-based agent
  - [ ] Impact of opponent modeling
  - [ ] Different negotiation strategies
- [ ] **Academic publications** (potential):
  - [ ] "Autonomous Negotiation Bots for E-Commerce Travel Booking"
  - [ ] Conference submissions: AAAI, IJCAI, AAMAS

**Files to Create:**
- `apps/api/scripts/negotiation_experiments.py`
- `research/negotiation_paper/` (LaTeX, results, plots)

---

## Priority Matrix

### 🔴 Critical (Must have for MVP)
1. ✅ Phase 1.1-1.3: Project setup, database, auth
2. Phase 1.5: User management APIs
3. Phase 1.6: Conversation & message APIs
4. Phase 2.1-2.3: RAG pipeline (embeddings, vector search)
5. Phase 3.1-3.3: Basic agent system (Planner, Flight, Hotel agents)
6. Phase 4.1: Amadeus API integration (flights)
7. Phase 6.1-6.2: Trip and booking APIs
8. Phase 8.1: Unit tests for core features

### 🟡 High (Important for full launch)
9. Phase 3.3: All 7 agents (Itinerary, Booking, Verifier, Orchestrator)
10. Phase 4.2: Booking.com API integration (hotels)
11. Phase 4.3: Stripe payment integration
12. Phase 6.3-6.4: Payment flow + notifications
13. Phase 7.1-7.2: Analytics & reference data APIs
14. Phase 8.2: Integration tests
15. Phase 10.1-10.3: Deployment (Docker, K8s, CI/CD)

### 🟢 Medium (Post-launch improvements)
16. Phase 5.1-5.4: Basic MARL implementation (environment, policies, training)
17. Phase 7.3: Admin endpoints
18. Phase 7.4-7.5: Advanced search & file uploads
19. Phase 9: Performance optimization
20. Phase 10.4: Monitoring & logging
21. Phase 11.1-11.3: Multi-modal trip summarizer (basic maps + images)

### 🔵 Low (Research & Advanced Features)
22. Phase 4.4: Additional APIs (weather, translation, etc.)
23. Phase 5.5-5.7: Advanced MARL (agent negotiation, coordination, feedback)
24. Phase 8.3-8.4: Load testing & security testing
25. Phase 11.4-11.6: Advanced multi-modal features (GPT-4V, rich summaries)
26. Phase 12: Real-time constraint solver (dynamic re-planning)
27. Phase 13: Federated learning (privacy-preserving)
28. Phase 14: Autonomous negotiation bots (dynamic pricing)

### 🟣 Experimental (Cutting-Edge Research)
29. Phase 5 + Phase 14: MARL + Negotiation integration (agents that negotiate)
30. Phase 12 + Phase 5: Constraint solving + MARL (optimization under uncertainty)
31. Phase 13 + Phase 5: Federated MARL (distributed multi-agent learning)
32. Academic publications from Phases 12-14

---

## Estimated Timeline

### Core Platform Development
- **Weeks 1-2**: Phase 1 (Foundation) ✅ Partially done
- **Weeks 3-4**: Phase 2 (RAG Pipeline)
- **Weeks 5-7**: Phase 3 (Multi-Agent System)
- **Weeks 8-9**: Phase 4 (External APIs)
- **Weeks 10-11**: Phase 6 (Booking & Payment Flow)
- **Weeks 12-13**: Phase 7 (Advanced Features)
- **Weeks 14-15**: Phase 8 (Testing)
- **Weeks 16-17**: Phase 9 (Optimization)
- **Weeks 18-20**: Phase 10 (Deployment & Monitoring)

### Research & Advanced Features (Parallel/Post-Launch)
- **Months 3-6**: Phase 5 (MARL - basic implementation)
- **Months 4-5**: Phase 11 (Multi-Modal Summarizer - basic)
- **Months 6-9**: Phase 12 (Real-Time Constraint Solver)
- **Months 9-12**: Phase 13 (Federated Learning)
- **Months 9-12**: Phase 14 (Autonomous Negotiation)
- **Months 12+**: Advanced MARL features, research publications

### Milestones
- **Month 4 (Week 16)**: MVP Launch (Phases 1-4, 6-7 core features)
- **Month 5 (Week 20)**: Full Launch (All 7 agents, payments, analytics)
- **Month 6**: MARL v1.0 (Basic reinforcement learning operational)
- **Month 9**: Multi-Modal + Constraint Solver operational
- **Month 12**: Federated Learning + Negotiation Bots beta
- **Month 18+**: Research papers, advanced features, MARL v2.0

**Total MVP Estimate:** ~15-17 weeks (3.5-4 months)  
**Full Launch Estimate:** ~20 weeks (5 months)  
**MARL Implementation:** 6-9 months for mature system  
**Advanced Research Features:** 12-18 months for full suite

---

## Success Metrics

### Technical KPIs
- API uptime: > 99.9%
- P95 response time: < 500ms
- Database query time: < 100ms (p95)
- Agent execution time: < 5s (p95)
- Cache hit rate: > 80%
- Test coverage: > 80%
- **Constraint solver response time: < 100ms (re-planning)**
- **Multi-modal summary generation: < 10s**
- **Negotiation success rate: > 60%**

### Business KPIs
- User registration rate
- Conversation-to-trip conversion: > 30%
- Trip-to-booking conversion: > 60%
- Booking-to-payment conversion: > 90%
- User satisfaction (trip reviews): > 4.5/5
- Agent success rate: > 95%
- **Average savings via negotiation: > 10%**
- **Re-planning adoption rate: > 80% during disruptions**

### MARL KPIs
- Average episode reward (increase over time)
- Booking success rate improvement: +10% vs baseline
- Cost efficiency improvement: +15% vs baseline
- User satisfaction improvement: +0.5 rating vs baseline
- **Agent negotiation success: Pareto improvement in 70% of cases**
- **Multi-objective optimization: Better cost-time-quality trade-offs**

### Research Innovation KPIs
- **Multi-Modal Summaries**:
  - User engagement with visual summaries: > 80%
  - Time spent viewing summary: > 3 minutes
  - PDF export rate: > 50%
- **Constraint Solver**:
  - Re-planning trigger rate: Track disruptions
  - User acceptance of re-plans: > 85%
  - Time to re-plan: < 100ms
- **Federated Learning**:
  - Opt-in rate: > 30% of users
  - Model accuracy: Within 5% of centralized model
  - Privacy budget compliance: 100%
- **Negotiation Bots**:
  - Average savings per negotiation: > $50
  - Deal closure rate: > 60%
  - User satisfaction with negotiated deals: > 4.5/5

### Academic Impact
- Research papers published: Target 2-3 papers
- Conference submissions: AAAI, IJCAI, AAMAS, NeurIPS
- Open-source contributions (anonymized datasets, frameworks)
- Industry partnerships (hotel chains, airlines)

---

## Next Steps

### Immediate (Weeks 1-4)
1. **Complete Phase 1** (Foundation): Finalize Docker setup, database migrations, auth
2. **Implement RAG Pipeline** (Phase 2): Embeddings service, vector search, RAG APIs
3. **Build Core Agents** (Phase 3): Start with Planner, Flight, Hotel agents
4. **Integrate Amadeus API** (Phase 4.1): Flight search functionality

### Short-term (Weeks 5-12)
5. **Create Trip & Booking APIs** (Phase 6): Enable end-to-end trip planning
6. **Add Stripe Payments** (Phase 4.3): Payment processing
7. **Complete Agent Suite**: All 7 agents operational
8. **Deploy MVP** (Phase 10): Docker + K8s deployment

### Medium-term (Months 4-6)
9. **Launch MARL v1.0** (Phase 5): Basic reinforcement learning with agent coordination
10. **Implement Multi-Modal Summarizer** (Phase 11): Maps + images + text
11. **Testing & Optimization** (Phases 8-9): Comprehensive testing, performance tuning
12. **Analytics & Monitoring** (Phase 10.4): Full observability stack

### Long-term (Months 7-18) - Research Innovations
13. **Real-Time Constraint Solver** (Phase 12): Dynamic re-planning engine
14. **Federated Learning** (Phase 13): Privacy-preserving preference learning
15. **Autonomous Negotiation** (Phase 14): Game-theoretic pricing agents
16. **Advanced MARL** (Phase 5.5-5.7): Multi-objective optimization, negotiation integration
17. **Academic Publications**: Write and submit research papers
18. **Industry Partnerships**: Collaborate with hotel chains and airlines

### Research Roadmap
- **Q1 2025**: MARL foundation, basic agent coordination
- **Q2 2025**: Multi-modal AI, initial constraint solving
- **Q3 2025**: Federated learning pilot, negotiation bot prototype
- **Q4 2025**: Full system integration, performance evaluation
- **Q1 2026**: Research paper submissions, open-source releases
- **Q2 2026**: Conference presentations, industry partnerships

---

**End of Backend TODO**
