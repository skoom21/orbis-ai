# ORBIS AI - Backend API Documentation

**Version:** 1.0.0  
**Database Schema Version:** 1.0.0  
**Last Updated:** 2025-01-XX

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [API Endpoints](#api-endpoints)
   - [User Management](#user-management)
   - [Conversations & Chat](#conversations--chat)
   - [Trips & Travel Planning](#trips--travel-planning)
   - [Bookings](#bookings)
   - [Payments](#payments)
   - [Agent System](#agent-system)
   - [RAG & Recommendations](#rag--recommendations)
   - [Notifications](#notifications)
   - [Analytics & Reporting](#analytics--reporting)
   - [Reference Data](#reference-data)
   - [Admin Operations](#admin-operations)
4. [Database Operations Guide](#database-operations-guide)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Webhooks](#webhooks)

---

## Overview

ORBIS AI is a comprehensive travel planning platform powered by multi-agent AI system with RAG (Retrieval-Augmented Generation). The backend is built with **FastAPI** and **Supabase PostgreSQL** with **pgvector** extension for semantic search.

### Tech Stack
- **Framework**: FastAPI (Python)
- **Database**: Supabase PostgreSQL 15+ with pgvector
- **Caching**: Redis
- **AI**: Google Gemini (gemini-2.5-flash)
- **Payment Processing**: Stripe
- **External APIs**: Amadeus, Booking.com
- **Agent Framework**: LangChain
- **Vector Embeddings**: OpenAI text-embedding-3-small (1536 dimensions)

### Key Features
- 🤖 Multi-agent system (Planner, Flight, Hotel, Itinerary, Booking, Verifier, Orchestrator)
- 🧠 RAG-powered personalized recommendations
- 💬 Real-time chat with conversation memory
- ✈️ Flight & hotel booking via external APIs
- 💳 Stripe payment integration
- 📊 Comprehensive analytics & monitoring
- 🔒 Row-Level Security (RLS)

---

## Authentication & Authorization

### Auth Provider
Supabase Auth handles authentication with JWT tokens.

### Roles
1. **Anonymous (`anon`)**: Read-only access to reference data
2. **Authenticated (`authenticated`)**: Full CRUD on owned resources (RLS enforced)
3. **Service Role (`service_role`)**: Full database access (backend use only)

### JWT Token Structure
```http
Authorization: Bearer <JWT_TOKEN>
```

### RLS Policies
All user-owned tables enforce Row-Level Security:
- Users can only access their own data
- Reference data (airports, cities, countries, attractions, travel_guides) is public
- Admin operations require service role

---

## API Endpoints

### Base URL
```
https://api.orbis-ai.com/api/v1
```

---

## User Management

### 1. Get Current User Profile
```http
GET /users/me
Authorization: Bearer <JWT>
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "phone_number": "+1234567890",
  "avatar_url": "https://...",
  "bio": "Travel enthusiast",
  "status": "active",
  "email_verified": true,
  "total_trips": 5,
  "total_spent": 15000.00,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-06-01T00:00:00Z"
}
```

**Database Operation:**
```sql
SELECT * FROM users WHERE id = auth.uid();
```

---

### 2. Update User Profile
```http
PATCH /users/me
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "full_name": "John Smith",
  "phone_number": "+9876543210",
  "bio": "Adventure seeker"
}
```

**Database Operation:**
```sql
UPDATE users 
SET 
  full_name = $1,
  phone_number = $2,
  bio = $3,
  updated_at = NOW()
WHERE id = auth.uid()
RETURNING *;
```

---

### 3. Get User Preferences
```http
GET /users/me/preferences
Authorization: Bearer <JWT>
```

**Response:**
```json
{
  "user_id": "uuid",
  "travel_style": ["cultural", "adventure"],
  "travel_pace": "moderate",
  "accommodation_preference": "moderate",
  "interests": ["museums", "hiking", "local_food", "photography"],
  "dietary_preferences": ["vegetarian"],
  "budget_range": {
    "min": 100,
    "max": 200,
    "currency": "USD"
  },
  "flight_preferences": {
    "preferred_airlines": ["Air France", "Delta"],
    "seat_preference": "window",
    "cabin_class": "economy"
  },
  "preference_text": "I love exploring museums and local cuisine...",
  "preference_embedding": [0.123, -0.456, ...] // 1536-dim vector
}
```

**Database Operation:**
```sql
SELECT * FROM user_preferences WHERE user_id = auth.uid();
```

---

### 4. Update User Preferences
```http
PUT /users/me/preferences
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "travel_style": ["cultural", "adventure"],
  "interests": ["museums", "hiking"],
  "budget_range": {"min": 100, "max": 200},
  "preference_text": "Updated preferences..."
}
```

**Database Operation:**
```sql
INSERT INTO user_preferences (user_id, travel_style, interests, ...)
VALUES (auth.uid(), $1, $2, ...)
ON CONFLICT (user_id) DO UPDATE
SET travel_style = $1, interests = $2, updated_at = NOW()
RETURNING *;
```

**Note:** Trigger `generate_preference_embedding_trigger` automatically generates vector embeddings.

---

### 5. Get User Travel History
```http
GET /users/me/travel-history?limit=10&offset=0
Authorization: Bearer <JWT>
```

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "destination": "Paris, France",
      "start_date": "2024-06-01",
      "end_date": "2024-06-07",
      "description": "Amazing cultural experience...",
      "rating": 5,
      "tags": ["cultural", "museums", "food"],
      "experience_embedding": [...]
    }
  ],
  "total": 5,
  "limit": 10,
  "offset": 0
}
```

**Database Operation:**
```sql
SELECT * FROM user_travel_history 
WHERE user_id = auth.uid()
ORDER BY start_date DESC
LIMIT $1 OFFSET $2;
```

---

### 6. Delete User Account (GDPR Compliance)
```http
DELETE /users/me
Authorization: Bearer <JWT>
```

**Database Operation:**
```sql
SELECT soft_delete_user(auth.uid());
```

**Function:** Anonymizes user data while retaining financial records for compliance.

---

## Conversations & Chat

### 7. Create New Conversation
```http
POST /conversations
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "title": "Planning Paris Trip"
}
```

**Response:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "title": "Planning Paris Trip",
  "is_active": true,
  "created_at": "2024-06-01T00:00:00Z"
}
```

**Database Operation:**
```sql
INSERT INTO conversations (user_id, title, is_active)
VALUES (auth.uid(), $1, TRUE)
RETURNING *;
```

---

### 8. List User Conversations
```http
GET /conversations?limit=20&offset=0&is_active=true
Authorization: Bearer <JWT>
```

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "title": "Planning Paris Trip",
      "is_active": true,
      "message_count": 15,
      "last_message_at": "2024-06-01T12:30:00Z",
      "created_at": "2024-06-01T00:00:00Z"
    }
  ],
  "total": 5
}
```

**Database Operation:**
```sql
SELECT 
  c.*,
  COUNT(m.id) as message_count,
  MAX(m.created_at) as last_message_at
FROM conversations c
LEFT JOIN messages m ON c.id = m.conversation_id
WHERE c.user_id = auth.uid()
  AND ($1::BOOLEAN IS NULL OR c.is_active = $1)
GROUP BY c.id
ORDER BY last_message_at DESC NULLS LAST
LIMIT $2 OFFSET $3;
```

---

### 9. Get Conversation with Messages
```http
GET /conversations/{conversation_id}/messages?limit=50&before_id=<uuid>
Authorization: Bearer <JWT>
```

**Response:**
```json
{
  "conversation": {
    "id": "uuid",
    "title": "Planning Paris Trip",
    "created_at": "2024-06-01T00:00:00Z"
  },
  "messages": [
    {
      "id": "uuid",
      "role": "user",
      "content": "I want to plan a trip to Paris",
      "agent_type": null,
      "agent_run_id": null,
      "created_at": "2024-06-01T10:00:00Z"
    },
    {
      "id": "uuid",
      "role": "assistant",
      "content": "I'd be happy to help you plan your Paris trip!",
      "agent_type": "planner",
      "agent_run_id": "uuid",
      "metadata": {
        "confidence": 0.95,
        "tools_used": ["search_flights", "search_hotels"]
      },
      "created_at": "2024-06-01T10:00:15Z"
    }
  ],
  "has_more": true
}
```

**Database Operation:**
```sql
-- Get conversation (RLS enforced)
SELECT * FROM conversations WHERE id = $1 AND user_id = auth.uid();

-- Get messages (paginated)
SELECT * FROM messages
WHERE conversation_id = $1
  AND ($2::UUID IS NULL OR id < $2)
ORDER BY created_at DESC
LIMIT $3;
```

---

### 10. Send Message (Chat)
```http
POST /conversations/{conversation_id}/messages
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "content": "I want to visit Paris in June for 5 days"
}
```

**Response:**
```json
{
  "user_message": {
    "id": "uuid",
    "role": "user",
    "content": "I want to visit Paris in June for 5 days",
    "created_at": "2024-06-01T10:00:00Z"
  },
  "assistant_message": {
    "id": "uuid",
    "role": "assistant",
    "content": "Great! I'll help you plan your 5-day Paris trip in June...",
    "agent_type": "planner",
    "agent_run_id": "uuid",
    "created_at": "2024-06-01T10:00:15Z"
  }
}
```

**Database Operations:**
```sql
-- 1. Insert user message
INSERT INTO messages (conversation_id, role, content)
VALUES ($1, 'user', $2)
RETURNING *;

-- 2. Get conversation context (last 10 messages)
SELECT * FROM messages 
WHERE conversation_id = $1 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Get user preferences for RAG
SELECT * FROM user_preferences WHERE user_id = auth.uid();

-- 4. Call AI service (Gemini + RAG)
-- (Application logic, not DB)

-- 5. Insert assistant response
INSERT INTO messages (
  conversation_id, 
  role, 
  content, 
  agent_type, 
  agent_run_id,
  metadata
)
VALUES ($1, 'assistant', $2, $3, $4, $5)
RETURNING *;
```

---

### 11. Update Conversation Title
```http
PATCH /conversations/{conversation_id}
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "title": "Paris Summer Vacation 2025"
}
```

**Database Operation:**
```sql
UPDATE conversations
SET title = $1, updated_at = NOW()
WHERE id = $2 AND user_id = auth.uid()
RETURNING *;
```

---

### 12. Archive Conversation
```http
POST /conversations/{conversation_id}/archive
Authorization: Bearer <JWT>
```

**Database Operation:**
```sql
UPDATE conversations
SET is_active = FALSE, updated_at = NOW()
WHERE id = $1 AND user_id = auth.uid()
RETURNING *;
```

---

## Trips & Travel Planning

### 13. Create Trip
```http
POST /trips
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "conversation_id": "uuid",
  "title": "Paris Adventure - 5 Days",
  "description": "Cultural exploration of Paris",
  "destinations": [
    {
      "city": "Paris",
      "country": "France",
      "iata": "CDG"
    }
  ],
  "start_date": "2025-06-15",
  "end_date": "2025-06-20",
  "trip_type": "cultural",
  "number_of_travelers": 1,
  "estimated_budget": 3000.00,
  "currency": "USD"
}
```

**Response:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "conversation_id": "uuid",
  "title": "Paris Adventure - 5 Days",
  "status": "planning",
  "progress_percentage": 0,
  "destinations": [...],
  "created_at": "2024-06-01T10:00:00Z"
}
```

**Database Operation:**
```sql
INSERT INTO trips (
  user_id, conversation_id, title, description, 
  destinations, start_date, end_date, trip_type,
  number_of_travelers, estimated_budget, currency, status
)
VALUES (
  auth.uid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'planning'
)
RETURNING *;
```

---

### 14. Get User Trips
```http
GET /trips?status=planning&limit=20&offset=0
Authorization: Bearer <JWT>
```

**Query Parameters:**
- `status`: Filter by trip_status enum (planning, booked, in_progress, completed, cancelled)
- `start_date_from`: ISO date
- `start_date_to`: ISO date

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "title": "Paris Adventure - 5 Days",
      "status": "planning",
      "destinations": [...],
      "start_date": "2025-06-15",
      "end_date": "2025-06-20",
      "estimated_budget": 3000.00,
      "actual_cost": 0.00,
      "progress_percentage": 25,
      "booking_count": 2,
      "created_at": "2024-06-01T10:00:00Z"
    }
  ],
  "total": 5
}
```

**Database Operation:**
```sql
SELECT 
  t.*,
  get_trip_progress(t.id) as progress_percentage,
  COUNT(b.id) as booking_count
FROM trips t
LEFT JOIN bookings b ON t.id = b.trip_id
WHERE t.user_id = auth.uid()
  AND ($1::trip_status IS NULL OR t.status = $1)
  AND ($2::DATE IS NULL OR t.start_date >= $2)
  AND ($3::DATE IS NULL OR t.start_date <= $3)
GROUP BY t.id
ORDER BY t.created_at DESC
LIMIT $4 OFFSET $5;
```

---

### 15. Get Trip Details
```http
GET /trips/{trip_id}
Authorization: Bearer <JWT>
```

**Response:**
```json
{
  "trip": {
    "id": "uuid",
    "title": "Paris Adventure - 5 Days",
    "status": "booked",
    "itinerary": {
      "day_1": {
        "date": "2025-06-15",
        "activities": [
          {
            "time": "10:00",
            "title": "Visit Louvre Museum",
            "description": "...",
            "location": {...}
          }
        ]
      }
    },
    "destinations": [...],
    "estimated_budget": 3000.00,
    "actual_cost": 2850.00
  },
  "bookings": [
    {
      "id": "uuid",
      "booking_type": "flight",
      "status": "confirmed",
      "provider": "Amadeus",
      "details": {...},
      "price": 650.00
    }
  ],
  "payments": [
    {
      "id": "uuid",
      "status": "succeeded",
      "amount": 2850.00
    }
  ]
}
```

**Database Operations:**
```sql
-- Get trip
SELECT * FROM trips WHERE id = $1 AND user_id = auth.uid();

-- Get bookings
SELECT * FROM bookings WHERE trip_id = $1 ORDER BY created_at;

-- Get payments
SELECT * FROM payments WHERE trip_id = $1 ORDER BY created_at DESC;
```

---

### 16. Update Trip Itinerary
```http
PATCH /trips/{trip_id}/itinerary
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "itinerary": {
    "day_1": {...},
    "day_2": {...}
  }
}
```

**Database Operation:**
```sql
UPDATE trips
SET itinerary = $1, updated_at = NOW()
WHERE id = $2 AND user_id = auth.uid()
RETURNING *;
```

---

### 17. Update Trip Status
```http
PATCH /trips/{trip_id}/status
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "status": "booked"
}
```

**Database Operation:**
```sql
UPDATE trips
SET status = $1, updated_at = NOW()
WHERE id = $2 AND user_id = auth.uid()
RETURNING *;
```

---

### 18. Cancel Trip
```http
POST /trips/{trip_id}/cancel
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "reason": "Change of plans"
}
```

**Database Operation:**
```sql
BEGIN;

-- Update trip status
UPDATE trips
SET status = 'cancelled', updated_at = NOW()
WHERE id = $1 AND user_id = auth.uid();

-- Cancel all bookings
UPDATE bookings
SET status = 'cancelled', updated_at = NOW()
WHERE trip_id = $1;

-- Refund logic handled separately via Stripe

COMMIT;
```

---

### 19. Submit Trip Review
```http
POST /trips/{trip_id}/review
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "overall_rating": 5,
  "accommodation_rating": 5,
  "activities_rating": 4,
  "value_rating": 5,
  "comment": "Amazing trip! Everything was perfect.",
  "tags": ["cultural", "museums", "food"]
}
```

**Database Operation:**
```sql
INSERT INTO trip_reviews (
  trip_id, user_id, overall_rating, 
  accommodation_rating, activities_rating, value_rating,
  comment, tags
)
VALUES ($1, auth.uid(), $2, $3, $4, $5, $6, $7)
ON CONFLICT (trip_id, user_id) DO UPDATE
SET overall_rating = $2, comment = $6, updated_at = NOW()
RETURNING *;
```

---

## Bookings

### 20. Search Flights
```http
POST /bookings/flights/search
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "origin": "JFK",
  "destination": "CDG",
  "departure_date": "2025-06-15",
  "return_date": "2025-06-20",
  "passengers": 1,
  "cabin_class": "economy"
}
```

**Response:**
```json
{
  "flights": [
    {
      "id": "amadeus_id",
      "airline": "Air France",
      "flight_number": "AF007",
      "departure": {
        "airport": "JFK",
        "time": "2025-06-15T10:00:00Z"
      },
      "arrival": {
        "airport": "CDG",
        "time": "2025-06-15T22:30:00Z"
      },
      "duration": "7h 30m",
      "stops": 0,
      "price": 650.00,
      "currency": "USD",
      "cabin_class": "economy",
      "baggage": "1 checked bag included"
    }
  ],
  "cached": false
}
```

**Database Operations:**
```sql
-- 1. Check cache
SELECT * FROM search_cache
WHERE search_type = 'flight'
  AND query_params @> $1
  AND is_expired = FALSE
ORDER BY created_at DESC
LIMIT 1;

-- 2. If cache miss, call Amadeus API
-- (Application logic)

-- 3. Store in cache
INSERT INTO search_cache (
  search_type, query_params, results, expires_at
)
VALUES ('flight', $1, $2, NOW() + INTERVAL '1 hour')
ON CONFLICT DO NOTHING;

-- 4. Log API usage
INSERT INTO api_usage_logs (
  api_provider, endpoint, request_params, 
  response_time_ms, success, cost_usd
)
VALUES ('Amadeus', 'flight_search', $1, $2, TRUE, $3);
```

---

### 21. Search Hotels
```http
POST /bookings/hotels/search
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "city": "Paris",
  "checkin": "2025-06-15",
  "checkout": "2025-06-20",
  "guests": 1,
  "min_rating": 4.0,
  "max_price": 200
}
```

**Response:**
```json
{
  "hotels": [
    {
      "id": "booking_com_id",
      "name": "Hotel Le Marais",
      "address": "123 Rue de Rivoli, 75004 Paris",
      "rating": 4.5,
      "price_per_night": 180.00,
      "total_price": 900.00,
      "currency": "USD",
      "amenities": ["WiFi", "Breakfast", "Air Conditioning"],
      "room_type": "Deluxe Double Room"
    }
  ]
}
```

**Similar caching logic as flights.**

---

### 22. Create Booking
```http
POST /bookings
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "trip_id": "uuid",
  "booking_type": "flight",
  "provider": "Amadeus",
  "details": {
    "origin": "JFK",
    "destination": "CDG",
    "departure": "2025-06-15T10:00:00Z",
    "arrival": "2025-06-15T22:30:00Z",
    "airline": "Air France",
    "flight_number": "AF007"
  },
  "price": 650.00,
  "currency": "USD"
}
```

**Response:**
```json
{
  "id": "uuid",
  "trip_id": "uuid",
  "booking_type": "flight",
  "status": "pending",
  "price": 650.00,
  "created_at": "2024-06-01T10:00:00Z"
}
```

**Database Operation:**
```sql
INSERT INTO bookings (
  trip_id, user_id, booking_type, provider, 
  details, price, currency, status
)
VALUES ($1, auth.uid(), $2, $3, $4, $5, $6, 'pending')
RETURNING *;
```

---

### 23. Confirm Booking
```http
POST /bookings/{booking_id}/confirm
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "confirmation_number": "ABC123",
  "provider_booking_id": "amadeus_booking_id"
}
```

**Database Operation:**
```sql
UPDATE bookings
SET 
  status = 'confirmed',
  confirmation_number = $1,
  provider_booking_id = $2,
  confirmed_at = NOW(),
  updated_at = NOW()
WHERE id = $3 AND user_id = auth.uid()
RETURNING *;
```

---

### 24. Cancel Booking
```http
POST /bookings/{booking_id}/cancel
Authorization: Bearer <JWT>
```

**Database Operation:**
```sql
UPDATE bookings
SET status = 'cancelled', updated_at = NOW()
WHERE id = $1 AND user_id = auth.uid()
RETURNING *;
```

---

## Payments

### 25. Create Payment Intent
```http
POST /payments/intent
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "trip_id": "uuid",
  "amount": 2850.00,
  "currency": "USD",
  "payment_method_types": ["card"]
}
```

**Response:**
```json
{
  "payment_intent_id": "stripe_pi_id",
  "client_secret": "stripe_client_secret",
  "amount": 2850.00,
  "currency": "USD"
}
```

**Database Operation:**
```sql
INSERT INTO payments (
  trip_id, user_id, stripe_payment_intent_id,
  amount, currency, status
)
VALUES ($1, auth.uid(), $2, $3, $4, 'pending')
RETURNING *;
```

---

### 26. Confirm Payment
```http
POST /payments/{payment_id}/confirm
Authorization: Bearer <JWT>
```

**Database Operation:**
```sql
UPDATE payments
SET 
  status = 'succeeded',
  paid_at = NOW(),
  updated_at = NOW()
WHERE id = $1 AND user_id = auth.uid()
RETURNING *;
```

**Trigger:** `update_trip_actual_cost_trigger` automatically updates trip's `actual_cost`.

---

### 27. Get Payment History
```http
GET /payments?trip_id=<uuid>&status=succeeded
Authorization: Bearer <JWT>
```

**Database Operation:**
```sql
SELECT * FROM payments
WHERE user_id = auth.uid()
  AND ($1::UUID IS NULL OR trip_id = $1)
  AND ($2::payment_status IS NULL OR status = $2)
ORDER BY created_at DESC
LIMIT $3 OFFSET $4;
```

---

### 28. Refund Payment
```http
POST /payments/{payment_id}/refund
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "amount": 2850.00,
  "reason": "Trip cancelled"
}
```

**Database Operations:**
```sql
-- 1. Update payment status
UPDATE payments
SET status = 'refunded', refunded_at = NOW()
WHERE id = $1 AND user_id = auth.uid()
RETURNING *;

-- 2. Process Stripe refund
-- (Application logic)

-- 3. Create refund record
INSERT INTO refunds (
  payment_id, amount, reason, status
)
VALUES ($1, $2, $3, 'processing');
```

---

## Agent System

### 29. Get Agent Runs for Conversation
```http
GET /conversations/{conversation_id}/agent-runs
Authorization: Bearer <JWT>
```

**Response:**
```json
{
  "agent_runs": [
    {
      "id": "uuid",
      "agent_type": "planner",
      "agent_name": "PlannerAgent",
      "execution_status": "completed",
      "duration_ms": 2500,
      "tools_called": ["search_flights", "search_hotels"],
      "token_usage": {
        "prompt_tokens": 1500,
        "completion_tokens": 800,
        "total_tokens": 2300
      },
      "cost_usd": 0.0460,
      "started_at": "2024-06-01T10:00:00Z",
      "completed_at": "2024-06-01T10:00:02.5Z"
    }
  ]
}
```

**Database Operation:**
```sql
SELECT * FROM agent_runs
WHERE conversation_id = $1 AND user_id = auth.uid()
ORDER BY started_at DESC;
```

---

### 30. Get Agent Run Details
```http
GET /agent-runs/{agent_run_id}
Authorization: Bearer <JWT>
```

**Response:**
```json
{
  "id": "uuid",
  "agent_type": "flight",
  "agent_name": "FlightSearchAgent",
  "execution_status": "completed",
  "input": {
    "origin": "JFK",
    "destination": "CDG",
    "departure_date": "2025-06-15"
  },
  "output": {
    "flights_found": 5,
    "best_price": 650.00,
    "recommendations": [...]
  },
  "context": {
    "user_preferences": {...}
  },
  "tool_calls": [
    {
      "id": "uuid",
      "tool_name": "amadeus_flight_search",
      "input_parameters": {...},
      "output": {...},
      "duration_ms": 1234,
      "success": true
    }
  ],
  "error_message": null,
  "duration_ms": 2500,
  "cost_usd": 0.0460
}
```

**Database Operations:**
```sql
-- Get agent run
SELECT * FROM agent_runs 
WHERE id = $1 AND user_id = auth.uid();

-- Get tool calls
SELECT * FROM tool_calls
WHERE agent_run_id = $1
ORDER BY created_at;
```

---

### 31. Get Agent Performance Metrics
```http
GET /agents/performance?agent_type=flight&days=7
Authorization: Bearer <JWT> (Admin)
```

**Response:**
```json
{
  "agent_type": "flight",
  "period": {
    "start": "2024-05-25",
    "end": "2024-06-01"
  },
  "metrics": {
    "total_runs": 150,
    "successful_runs": 145,
    "failed_runs": 5,
    "success_rate": 96.67,
    "avg_duration_ms": 2100,
    "median_duration_ms": 1950,
    "p95_duration_ms": 3500,
    "total_tokens": 345000,
    "total_cost_usd": 6.90
  }
}
```

**Database Operation:**
```sql
SELECT * FROM agent_performance_summary
WHERE agent_type = $1
  AND date >= NOW() - INTERVAL '$2 days'
ORDER BY date DESC;
```

---

## RAG & Recommendations

### 32. Match User Preferences (RAG)
```http
POST /rag/match-preferences
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "query": "romantic destinations with good food",
  "limit": 5
}
```

**Response:**
```json
{
  "matches": [
    {
      "user_id": "uuid",
      "travel_style": ["cultural", "relaxation"],
      "interests": ["local_food", "wine", "romance"],
      "preference_text": "I love romantic getaways...",
      "similarity": 0.87
    }
  ]
}
```

**Database Operation:**
```sql
SELECT * FROM match_user_preferences(
  query_embedding := generate_embedding($1),
  match_threshold := 0.7,
  match_count := $2
);
```

---

### 33. Search Travel Guides (RAG)
```http
POST /rag/search-guides
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "query": "best museums in Paris",
  "limit": 5
}
```

**Response:**
```json
{
  "guides": [
    {
      "id": "uuid",
      "destination": "Paris, France",
      "category": "attractions",
      "title": "Top Museums in Paris",
      "content": "The Louvre is the world's largest art museum...",
      "tags": ["museums", "art", "culture"],
      "source": "Official Paris Tourism",
      "similarity": 0.92
    }
  ]
}
```

**Database Operation:**
```sql
SELECT * FROM match_travel_guides(
  query_embedding := generate_embedding($1),
  match_threshold := 0.7,
  match_count := $2
);
```

---

### 34. Find Similar Trips (RAG)
```http
POST /rag/similar-trips
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "trip_id": "uuid",
  "limit": 5
}
```

**Response:**
```json
{
  "similar_trips": [
    {
      "id": "uuid",
      "title": "Paris Cultural Experience",
      "destinations": [...],
      "trip_type": "cultural",
      "duration_days": 5,
      "estimated_budget": 3200.00,
      "similarity": 0.85
    }
  ]
}
```

**Database Operation:**
```sql
SELECT * FROM find_similar_trips(
  reference_trip_id := $1,
  match_threshold := 0.6,
  match_count := $2
);
```

---

### 35. Get Personalized Recommendations
```http
GET /recommendations/destinations?limit=10
Authorization: Bearer <JWT>
```

**Response:**
```json
{
  "recommendations": [
    {
      "city_id": "uuid",
      "city_name": "Paris",
      "country": "France",
      "recommendation_score": 87.5,
      "reasons": [
        "Matches your interest in museums and culture",
        "Similar to highly-rated past trips",
        "Popular destination with 4.8 average rating"
      ],
      "popularity_score": 95.0,
      "average_rating": 4.8
    }
  ]
}
```

**Database Operation:**
```sql
SELECT 
  c.id,
  c.name,
  c.country_code,
  calculate_destination_score(auth.uid(), c.name) as recommendation_score,
  c.popularity_score,
  AVG(tr.overall_rating) as average_rating
FROM cities c
LEFT JOIN trips t ON t.destinations @> jsonb_build_array(
  jsonb_build_object('city', c.name)
)
LEFT JOIN trip_reviews tr ON t.id = tr.trip_id
GROUP BY c.id, c.name, c.country_code, c.popularity_score
ORDER BY recommendation_score DESC
LIMIT $1;
```

---

## Notifications

### 36. Get User Notifications
```http
GET /notifications?is_read=false&limit=20
Authorization: Bearer <JWT>
```

**Response:**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "booking_confirmed",
      "title": "Flight Booking Confirmed",
      "message": "Your flight to Paris has been confirmed!",
      "data": {
        "booking_id": "uuid",
        "trip_id": "uuid"
      },
      "is_read": false,
      "created_at": "2024-06-01T10:00:00Z"
    }
  ],
  "unread_count": 5
}
```

**Database Operations:**
```sql
-- Get notifications
SELECT * FROM notifications
WHERE user_id = auth.uid()
  AND ($1::BOOLEAN IS NULL OR is_read = $1)
ORDER BY created_at DESC
LIMIT $2;

-- Get unread count
SELECT COUNT(*) FROM notifications
WHERE user_id = auth.uid() AND is_read = FALSE;
```

---

### 37. Mark Notification as Read
```http
POST /notifications/{notification_id}/read
Authorization: Bearer <JWT>
```

**Database Operation:**
```sql
UPDATE notifications
SET is_read = TRUE, read_at = NOW(), updated_at = NOW()
WHERE id = $1 AND user_id = auth.uid()
RETURNING *;
```

---

### 38. Mark All Notifications as Read
```http
POST /notifications/read-all
Authorization: Bearer <JWT>
```

**Database Operation:**
```sql
UPDATE notifications
SET is_read = TRUE, read_at = NOW(), updated_at = NOW()
WHERE user_id = auth.uid() AND is_read = FALSE
RETURNING COUNT(*);
```

---

## Analytics & Reporting

### 39. Get User Statistics
```http
GET /analytics/user-stats
Authorization: Bearer <JWT>
```

**Response:**
```json
{
  "user_id": "uuid",
  "total_trips": 5,
  "completed_trips": 3,
  "total_bookings": 15,
  "total_spent": 15000.00,
  "average_trip_cost": 3000.00,
  "total_conversations": 8,
  "total_messages": 150,
  "favorite_destinations": ["Paris", "Tokyo", "New York"],
  "favorite_trip_type": "cultural",
  "last_trip_date": "2024-05-15"
}
```

**Database Operation:**
```sql
SELECT * FROM user_statistics
WHERE user_id = auth.uid();
```

---

### 40. Get Popular Destinations
```http
GET /analytics/popular-destinations?limit=20
```

**Response:**
```json
{
  "destinations": [
    {
      "city_id": "uuid",
      "city_name": "Paris",
      "country": "France",
      "trip_count": 150,
      "unique_travelers": 120,
      "average_rating": 4.7,
      "popularity_score": 95.0
    }
  ]
}
```

**Database Operation:**
```sql
SELECT * FROM popular_destinations
ORDER BY trip_count DESC, popularity_score DESC
LIMIT $1;
```

---

### 41. Get Revenue Analytics (Admin)
```http
GET /analytics/revenue?start_date=2024-01-01&end_date=2024-12-31
Authorization: Bearer <JWT> (Service Role)
```

**Response:**
```json
{
  "period": {
    "start": "2024-01-01",
    "end": "2024-12-31"
  },
  "total_revenue": 150000.00,
  "total_transactions": 500,
  "successful_transactions": 485,
  "failed_transactions": 15,
  "average_transaction": 300.00,
  "unique_customers": 350,
  "daily_breakdown": [
    {
      "date": "2024-06-01",
      "revenue": 5000.00,
      "transactions": 15
    }
  ]
}
```

**Database Operation:**
```sql
SELECT * FROM daily_revenue_summary
WHERE date BETWEEN $1 AND $2
ORDER BY date;
```

---

## Reference Data

### 42. Search Airports
```http
GET /reference/airports?search=paris&limit=10
```

**Response:**
```json
{
  "airports": [
    {
      "id": "uuid",
      "iata_code": "CDG",
      "icao_code": "LFPG",
      "name": "Charles de Gaulle Airport",
      "city": "Paris",
      "country": "France",
      "country_code": "FR",
      "timezone": "Europe/Paris",
      "latitude": 49.0097,
      "longitude": 2.5479
    }
  ]
}
```

**Database Operation:**
```sql
SELECT * FROM airports
WHERE 
  name ILIKE '%' || $1 || '%'
  OR city ILIKE '%' || $1 || '%'
  OR iata_code ILIKE '%' || $1 || '%'
ORDER BY 
  CASE WHEN iata_code ILIKE $1 || '%' THEN 1 ELSE 2 END,
  name
LIMIT $2;
```

---

### 43. Get Cities
```http
GET /reference/cities?country_code=FR&min_popularity=80
```

**Response:**
```json
{
  "cities": [
    {
      "id": "uuid",
      "name": "Paris",
      "country_code": "FR",
      "country_name": "France",
      "timezone": "Europe/Paris",
      "popularity_score": 95.0,
      "tourist_rating": 4.8,
      "latitude": 48.8566,
      "longitude": 2.3522
    }
  ]
}
```

**Database Operation:**
```sql
SELECT c.*, co.name as country_name
FROM cities c
JOIN countries co ON c.country_code = co.country_code
WHERE ($1::TEXT IS NULL OR c.country_code = $1)
  AND ($2::DECIMAL IS NULL OR c.popularity_score >= $2)
ORDER BY c.popularity_score DESC;
```

---

### 44. Get Attractions
```http
GET /reference/attractions?city_id=<uuid>&category=museums
```

**Response:**
```json
{
  "attractions": [
    {
      "id": "uuid",
      "name": "Louvre Museum",
      "city_id": "uuid",
      "city_name": "Paris",
      "category": "museum",
      "description": "World's largest art museum...",
      "rating": 4.8,
      "address": "Rue de Rivoli, 75001 Paris",
      "opening_hours": {...},
      "ticket_price": 17.00,
      "latitude": 48.8606,
      "longitude": 2.3376
    }
  ]
}
```

**Database Operation:**
```sql
SELECT a.*, c.name as city_name
FROM attractions a
JOIN cities c ON a.city_id = c.id
WHERE ($1::UUID IS NULL OR a.city_id = $1)
  AND ($2::TEXT IS NULL OR a.category = $2)
ORDER BY a.rating DESC NULLS LAST;
```

---

## Admin Operations

### 45. Get System Health
```http
GET /admin/health
Authorization: Bearer <SERVICE_ROLE_JWT>
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-06-01T10:00:00Z",
  "database": {
    "status": "connected",
    "size": "2.5 GB",
    "active_connections": 15
  },
  "redis": {
    "status": "connected",
    "memory_usage": "256 MB"
  },
  "services": {
    "gemini_ai": "operational",
    "amadeus": "operational",
    "booking_com": "operational",
    "stripe": "operational"
  }
}
```

---

### 46. Get Error Logs
```http
GET /admin/errors?severity=high&resolved=false&limit=50
Authorization: Bearer <SERVICE_ROLE_JWT>
```

**Response:**
```json
{
  "errors": [
    {
      "id": "uuid",
      "error_type": "api_error",
      "severity": "high",
      "message": "Amadeus API timeout",
      "stack_trace": "...",
      "context": {...},
      "resolved": false,
      "created_at": "2024-06-01T09:30:00Z"
    }
  ]
}
```

**Database Operation:**
```sql
SELECT * FROM error_logs
WHERE ($1::TEXT IS NULL OR severity = $1)
  AND ($2::BOOLEAN IS NULL OR resolved = $2)
ORDER BY created_at DESC
LIMIT $3;
```

---

### 47. Refresh Materialized Views
```http
POST /admin/refresh-views
Authorization: Bearer <SERVICE_ROLE_JWT>
```

**Database Operations:**
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY popular_destinations;
REFRESH MATERIALIZED VIEW CONCURRENTLY agent_performance_summary;
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_revenue_summary;
```

---

### 48. Get API Usage Statistics
```http
GET /admin/api-usage?provider=Amadeus&days=7
Authorization: Bearer <SERVICE_ROLE_JWT>
```

**Response:**
```json
{
  "provider": "Amadeus",
  "period": {
    "start": "2024-05-25",
    "end": "2024-06-01"
  },
  "request_count": 1500,
  "successful_requests": 1485,
  "failed_requests": 15,
  "success_rate": 99.0,
  "avg_response_time_ms": 850,
  "total_cost_usd": 45.00
}
```

**Database Operation:**
```sql
SELECT 
  api_provider,
  COUNT(*) as request_count,
  COUNT(*) FILTER (WHERE success = TRUE) as successful_requests,
  ROUND(AVG(response_time_ms), 2) as avg_response_time_ms,
  ROUND(SUM(cost_usd), 4) as total_cost_usd
FROM api_usage_logs
WHERE api_provider = $1
  AND created_at > NOW() - INTERVAL '$2 days'
GROUP BY api_provider;
```

---

## Database Operations Guide

### Common Patterns

#### 1. **Creating Resources with RLS**
Always use `auth.uid()` for user_id when creating resources:
```sql
INSERT INTO trips (user_id, title, ...)
VALUES (auth.uid(), $1, ...)
RETURNING *;
```

#### 2. **Soft Delete Pattern**
Use status fields instead of hard deletes:
```sql
UPDATE users
SET status = 'deleted', deleted_at = NOW()
WHERE id = auth.uid();
```

#### 3. **Pagination Pattern**
```sql
SELECT * FROM trips
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;
```

#### 4. **JSONB Query Pattern**
```sql
-- Check if destinations contain Paris
SELECT * FROM trips
WHERE destinations @> '[{"city": "Paris"}]';

-- Extract nested field
SELECT destinations->0->>'city' AS first_city FROM trips;
```

#### 5. **Vector Similarity Search Pattern**
```sql
SELECT *, 
  1 - (preference_embedding <=> query_embedding) AS similarity
FROM user_preferences
WHERE 1 - (preference_embedding <=> query_embedding) > 0.7
ORDER BY preference_embedding <=> query_embedding
LIMIT 5;
```

#### 6. **Transaction Pattern**
```sql
BEGIN;

-- Insert trip
INSERT INTO trips (...) VALUES (...) RETURNING id;

-- Insert bookings
INSERT INTO bookings (trip_id, ...) VALUES ($trip_id, ...);

-- Create notification
INSERT INTO notifications (...) VALUES (...);

COMMIT;
```

---

### Triggers to Be Aware Of

1. **`set_updated_at_trigger`**: Auto-updates `updated_at` on all tables
2. **`generate_preference_embedding_trigger`**: Auto-generates vector embeddings for `user_preferences.preference_text`
3. **`create_booking_notification_trigger`**: Creates notification when booking status changes
4. **`update_trip_actual_cost_trigger`**: Updates trip's `actual_cost` when payment succeeds
5. **`create_payment_notification_trigger`**: Creates notification on payment status change

---

## Error Handling

### Standard Error Response
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid authentication token",
    "details": {},
    "timestamp": "2024-06-01T10:00:00Z"
  }
}
```

### Error Codes
- `UNAUTHORIZED` (401): Invalid or missing auth token
- `FORBIDDEN` (403): RLS policy violation
- `NOT_FOUND` (404): Resource not found
- `VALIDATION_ERROR` (422): Invalid request body
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `INTERNAL_ERROR` (500): Server error
- `SERVICE_UNAVAILABLE` (503): External API down

---

## Rate Limiting

- **Authenticated users**: 100 requests/minute
- **Anonymous users**: 10 requests/minute
- **Heavy operations** (flight search, hotel search): 10 requests/minute

---

## Webhooks

### Stripe Webhook
```http
POST /webhooks/stripe
Content-Type: application/json
Stripe-Signature: <signature>

{
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_...",
      "amount": 285000,
      "currency": "usd"
    }
  }
}
```

**Database Operation:**
```sql
UPDATE payments
SET status = 'succeeded', paid_at = NOW()
WHERE stripe_payment_intent_id = $1;
```

---

## Next Steps

1. **Implement RAG Pipeline**: Use `match_travel_guides()`, `match_user_preferences()` functions
2. **Build Multi-Agent System**: Track execution with `agent_runs` and `tool_calls` tables
3. **Integrate External APIs**: Amadeus (flights), Booking.com (hotels), Stripe (payments)
4. **Implement MARL**: Use agent performance data for reinforcement learning
5. **Add Monitoring**: Track metrics via `api_usage_logs`, `error_logs`, materialized views
6. **Set up Caching**: Use Redis + `search_cache` table for expensive API calls

---

**End of API Documentation**
