-- ============================================================================
-- ORBIS AI - COMPREHENSIVE DATABASE SCHEMA
-- Database: PostgreSQL 15+ with pgvector extension
-- Platform: Supabase
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgvector for embeddings (RAG)
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable pgcrypto for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- ENUMS (Type Safety)
-- ============================================================================

-- User account status
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'deleted');

-- Travel preferences
CREATE TYPE accommodation_preference AS ENUM ('budget', 'moderate', 'luxury', 'boutique', 'hostel');
CREATE TYPE travel_pace AS ENUM ('relaxed', 'moderate', 'fast_paced');
CREATE TYPE travel_style AS ENUM ('adventure', 'cultural', 'relaxation', 'business', 'family', 'romantic', 'solo');
CREATE TYPE dietary_preference AS ENUM ('none', 'vegetarian', 'vegan', 'halal', 'kosher', 'gluten_free');

-- Trip and booking statuses
CREATE TYPE trip_status AS ENUM ('planning', 'options_held', 'payment_pending', 'confirmed', 'in_progress', 'completed', 'cancelled');
CREATE TYPE booking_status AS ENUM ('searching', 'held', 'payment_pending', 'confirmed', 'cancelled', 'refunded', 'failed');
CREATE TYPE booking_type AS ENUM ('flight', 'hotel', 'car_rental', 'activity', 'transfer', 'insurance');

-- Payment statuses
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'partially_refunded');
CREATE TYPE payment_method AS ENUM ('stripe', 'paypal', 'credit_card', 'debit_card', 'bank_transfer');

-- Agent types
CREATE TYPE agent_type AS ENUM ('planner', 'flight', 'hotel', 'itinerary', 'booking', 'verifier', 'orchestrator');
CREATE TYPE agent_execution_status AS ENUM ('pending', 'running', 'completed', 'failed', 'retrying');

-- Message roles
CREATE TYPE message_role AS ENUM ('user', 'assistant', 'system', 'tool', 'function');

-- Notification types
CREATE TYPE notification_type AS ENUM ('booking_confirmation', 'payment_receipt', 'trip_reminder', 'flight_change', 'hotel_change', 'cancellation', 'itinerary_update', 'price_alert');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'delivered', 'failed', 'read');

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Users Table (extends Supabase auth.users)
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic Info
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone_number TEXT,
    date_of_birth DATE,
    
    -- Profile
    avatar_url TEXT,
    bio TEXT,
    preferred_language TEXT DEFAULT 'en',
    timezone TEXT DEFAULT 'UTC',
    
    -- Preferences (basic)
    preferred_currency TEXT DEFAULT 'USD',
    home_airport TEXT, -- IATA code (e.g., 'JFK')
    
    -- Account Status
    status user_status DEFAULT 'active',
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    
    -- Onboarding
    onboarding_completed BOOLEAN DEFAULT FALSE,
    cold_start_completed BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}', -- Flexible field for additional data
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

-- Indexes for users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- ----------------------------------------------------------------------------
-- User Preferences (for personalization and RAG)
-- ----------------------------------------------------------------------------
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Travel Style
    travel_style travel_style[] DEFAULT '{}',
    travel_pace travel_pace DEFAULT 'moderate',
    
    -- Accommodation
    accommodation_preference accommodation_preference DEFAULT 'moderate',
    preferred_hotel_brands TEXT[] DEFAULT '{}',
    
    -- Interests (stored as array for flexibility)
    interests TEXT[] DEFAULT '{}', -- e.g., ['museums', 'hiking', 'food', 'nightlife']
    
    -- Dietary & Accessibility
    dietary_preferences dietary_preference[] DEFAULT '{}',
    accessibility_requirements TEXT[] DEFAULT '{}',
    
    -- Budget
    typical_daily_budget_min DECIMAL(10, 2),
    typical_daily_budget_max DECIMAL(10, 2),
    typical_trip_budget_min DECIMAL(10, 2),
    typical_trip_budget_max DECIMAL(10, 2),
    
    -- Flight Preferences
    preferred_airlines TEXT[] DEFAULT '{}',
    seat_preference TEXT, -- e.g., 'window', 'aisle'
    preferred_flight_class TEXT DEFAULT 'economy', -- economy, premium_economy, business, first
    max_layovers INTEGER DEFAULT 1,
    
    -- Other Preferences
    preferred_destinations TEXT[] DEFAULT '{}',
    avoided_destinations TEXT[] DEFAULT '{}',
    
    -- Companion Info
    typical_travel_companions TEXT, -- e.g., 'solo', 'partner', 'family_with_kids'
    number_of_travelers INTEGER DEFAULT 1,
    
    -- Free-form preference text (for RAG embedding)
    preference_text TEXT, -- Natural language description
    preference_embedding VECTOR(1536), -- OpenAI embedding
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for user_preferences
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_user_preferences_embedding ON user_preferences USING ivfflat (preference_embedding vector_cosine_ops);

-- ----------------------------------------------------------------------------
-- Conversations (Chat sessions)
-- ----------------------------------------------------------------------------
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Conversation Details
    title TEXT, -- Auto-generated or user-defined
    summary TEXT, -- AI-generated summary
    
    -- Related Trip
    trip_id UUID, -- References trips(id), nullable for exploratory chats
    
    -- Context
    context JSONB DEFAULT '{}', -- Store conversation context
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    archived BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ
);

-- Indexes for conversations
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_trip_id ON conversations(trip_id);
CREATE INDEX idx_conversations_last_message_at ON conversations(last_message_at DESC);
CREATE INDEX idx_conversations_active ON conversations(is_active) WHERE is_active = TRUE;

-- ----------------------------------------------------------------------------
-- Messages (Chat messages)
-- ----------------------------------------------------------------------------
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    
    -- Message Content
    role message_role NOT NULL,
    content TEXT NOT NULL,
    
    -- Metadata
    metadata JSONB DEFAULT '{}', -- Store tool calls, function results, etc.
    
    -- Agent Information (if role is 'assistant')
    agent_type agent_type,
    agent_run_id UUID, -- References agent_runs(id)
    
    -- Token Usage (for cost tracking)
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    
    -- Feedback
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
    user_feedback TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for messages
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_agent_run_id ON messages(agent_run_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_role ON messages(role);

-- ----------------------------------------------------------------------------
-- Trips (Main trip records)
-- ----------------------------------------------------------------------------
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    
    -- Trip Basic Info
    title TEXT NOT NULL, -- e.g., "Paris Adventure 2025"
    description TEXT,
    
    -- Destination(s)
    destinations JSONB NOT NULL, -- Array of {city, country, iata_code}
    -- Example: [{"city": "Paris", "country": "France", "iata": "CDG"}]
    
    -- Dates
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    duration_days INTEGER GENERATED ALWAYS AS (end_date - start_date + 1) STORED,
    
    -- Trip Type
    trip_type travel_style,
    is_multi_city BOOLEAN DEFAULT FALSE,
    
    -- Travelers
    number_of_travelers INTEGER DEFAULT 1,
    traveler_details JSONB DEFAULT '[]', -- Array of traveler info
    
    -- Budget
    estimated_budget DECIMAL(10, 2),
    actual_cost DECIMAL(10, 2),
    currency TEXT DEFAULT 'USD',
    
    -- Status
    status trip_status DEFAULT 'planning',
    
    -- Itinerary
    itinerary JSONB, -- Complete day-by-day itinerary
    itinerary_generated_at TIMESTAMPTZ,
    
    -- Bookings Summary
    has_flights BOOLEAN DEFAULT FALSE,
    has_hotels BOOLEAN DEFAULT FALSE,
    has_activities BOOLEAN DEFAULT FALSE,
    
    -- Sharing & Collaboration
    is_shared BOOLEAN DEFAULT FALSE,
    shared_with UUID[], -- Array of user_ids
    share_token TEXT UNIQUE, -- For public sharing
    
    -- Export
    ics_file_url TEXT, -- Link to generated .ics calendar file
    pdf_itinerary_url TEXT, -- Link to PDF export
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ
);

-- Indexes for trips
CREATE INDEX idx_trips_user_id ON trips(user_id);
CREATE INDEX idx_trips_conversation_id ON trips(conversation_id);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_start_date ON trips(start_date);
CREATE INDEX idx_trips_destinations ON trips USING GIN (destinations);
CREATE INDEX idx_trips_created_at ON trips(created_at DESC);

-- Full-text search on trips
CREATE INDEX idx_trips_search ON trips USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- ----------------------------------------------------------------------------
-- Bookings (Individual bookings within a trip)
-- ----------------------------------------------------------------------------
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Booking Type
    booking_type booking_type NOT NULL,
    
    -- Provider Information
    provider TEXT NOT NULL, -- e.g., 'Amadeus', 'Booking.com'
    provider_booking_id TEXT, -- External booking reference
    confirmation_code TEXT,
    
    -- Booking Details (flexible JSON structure)
    details JSONB NOT NULL,
    /* Example for flight:
    {
        "origin": "JFK",
        "destination": "CDG",
        "departure": "2025-06-15T10:00:00Z",
        "arrival": "2025-06-15T22:30:00Z",
        "airline": "Air France",
        "flight_number": "AF007",
        "cabin_class": "economy",
        "passengers": [...]
    }
    */
    
    /* Example for hotel:
    {
        "hotel_name": "Hotel Le Marais",
        "address": "123 Rue de Rivoli, Paris",
        "checkin": "2025-06-15",
        "checkout": "2025-06-20",
        "room_type": "Deluxe Double",
        "guests": 2
    }
    */
    
    -- Pricing
    price DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    taxes DECIMAL(10, 2) DEFAULT 0,
    fees DECIMAL(10, 2) DEFAULT 0,
    total_price DECIMAL(10, 2) GENERATED ALWAYS AS (price + COALESCE(taxes, 0) + COALESCE(fees, 0)) STORED,
    
    -- Status
    status booking_status DEFAULT 'searching',
    
    -- Hold Information (for options held before payment)
    held_until TIMESTAMPTZ,
    hold_token TEXT,
    
    -- Cancellation
    is_refundable BOOLEAN DEFAULT TRUE,
    cancellation_policy JSONB,
    cancellation_deadline TIMESTAMPTZ,
    
    -- Documents
    ticket_url TEXT,
    voucher_url TEXT,
    invoice_url TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ
);

-- Indexes for bookings
CREATE INDEX idx_bookings_trip_id ON bookings(trip_id);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_booking_type ON bookings(booking_type);
CREATE INDEX idx_bookings_provider ON bookings(provider);
CREATE INDEX idx_bookings_confirmation_code ON bookings(confirmation_code);
CREATE INDEX idx_bookings_details ON bookings USING GIN (details);

-- ----------------------------------------------------------------------------
-- Payments (Payment records)
-- ----------------------------------------------------------------------------
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
    
    -- Booking References (array to support split payments)
    booking_ids UUID[] DEFAULT '{}',
    
    -- Payment Details
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    
    -- Payment Provider
    payment_method payment_method NOT NULL,
    provider_payment_id TEXT, -- e.g., Stripe payment intent ID
    provider_customer_id TEXT, -- e.g., Stripe customer ID
    
    -- Status
    status payment_status DEFAULT 'pending',
    
    -- Payment Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Refund Information
    refund_amount DECIMAL(10, 2),
    refunded_at TIMESTAMPTZ,
    refund_reason TEXT,
    
    -- Receipt
    receipt_url TEXT,
    invoice_url TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    succeeded_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ
);

-- Indexes for payments
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_trip_id ON payments(trip_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_provider_payment_id ON payments(provider_payment_id);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);

-- ============================================================================
-- AGENT & ORCHESTRATION TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Agent Runs (Track agent execution)
-- ----------------------------------------------------------------------------
CREATE TABLE agent_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Agent Information
    agent_type agent_type NOT NULL,
    agent_name TEXT, -- Specific agent instance name
    
    -- Execution
    parent_run_id UUID REFERENCES agent_runs(id), -- For nested agent calls
    execution_status agent_execution_status DEFAULT 'pending',
    
    -- Input/Output
    input JSONB NOT NULL,
    output JSONB,
    
    -- Context
    context JSONB DEFAULT '{}', -- RAG context, user preferences, etc.
    
    -- Tools Used
    tools_called JSONB DEFAULT '[]', -- Array of tool calls
    /* Example:
    [
        {
            "tool": "flight_search",
            "input": {...},
            "output": {...},
            "duration_ms": 1234
        }
    ]
    */
    
    -- Performance
    duration_ms INTEGER,
    token_usage JSONB, -- {prompt_tokens, completion_tokens, total_tokens}
    cost_usd DECIMAL(10, 4),
    
    -- Error Handling
    error TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Tracing (for observability)
    trace_id UUID, -- Group related agent runs
    span_id UUID, -- Unique span for this run
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ
);

-- Indexes for agent_runs
CREATE INDEX idx_agent_runs_conversation_id ON agent_runs(conversation_id);
CREATE INDEX idx_agent_runs_user_id ON agent_runs(user_id);
CREATE INDEX idx_agent_runs_agent_type ON agent_runs(agent_type);
CREATE INDEX idx_agent_runs_status ON agent_runs(execution_status);
CREATE INDEX idx_agent_runs_trace_id ON agent_runs(trace_id);
CREATE INDEX idx_agent_runs_started_at ON agent_runs(started_at DESC);

-- ----------------------------------------------------------------------------
-- Tool Calls (Detailed tool execution logs)
-- ----------------------------------------------------------------------------
CREATE TABLE tool_calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_run_id UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    
    -- Tool Information
    tool_name TEXT NOT NULL, -- e.g., 'flight_search', 'hotel_search'
    tool_type TEXT, -- e.g., 'api_call', 'database_query', 'llm_call'
    
    -- Execution
    input JSONB NOT NULL,
    output JSONB,
    
    -- Performance
    duration_ms INTEGER,
    success BOOLEAN DEFAULT TRUE,
    
    -- Error Handling
    error TEXT,
    
    -- API Details (if applicable)
    api_endpoint TEXT,
    http_method TEXT,
    http_status_code INTEGER,
    
    -- Timestamps
    called_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Indexes for tool_calls
CREATE INDEX idx_tool_calls_agent_run_id ON tool_calls(agent_run_id);
CREATE INDEX idx_tool_calls_tool_name ON tool_calls(tool_name);
CREATE INDEX idx_tool_calls_success ON tool_calls(success);
CREATE INDEX idx_tool_calls_called_at ON tool_calls(called_at DESC);

-- ============================================================================
-- RAG & KNOWLEDGE BASE TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Travel Guides (Static knowledge base for RAG)
-- ----------------------------------------------------------------------------
CREATE TABLE travel_guides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Destination
    destination TEXT NOT NULL, -- e.g., "Paris, France"
    city TEXT,
    country TEXT,
    region TEXT,
    iata_code TEXT, -- Airport code if applicable
    
    -- Content
    title TEXT NOT NULL,
    content TEXT NOT NULL, -- Main guide content
    category TEXT, -- e.g., 'attractions', 'restaurants', 'hotels', 'transportation'
    tags TEXT[] DEFAULT '{}',
    
    -- Embedding for RAG
    content_embedding VECTOR(1536),
    
    -- Metadata
    language TEXT DEFAULT 'en',
    source TEXT, -- Where this guide came from
    
    -- Quality
    is_verified BOOLEAN DEFAULT FALSE,
    quality_score DECIMAL(3, 2), -- 0-5 rating
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for travel_guides
CREATE INDEX idx_travel_guides_destination ON travel_guides(destination);
CREATE INDEX idx_travel_guides_city ON travel_guides(city);
CREATE INDEX idx_travel_guides_category ON travel_guides(category);
CREATE INDEX idx_travel_guides_tags ON travel_guides USING GIN (tags);
CREATE INDEX idx_travel_guides_embedding ON travel_guides USING ivfflat (content_embedding vector_cosine_ops);

-- Full-text search
CREATE INDEX idx_travel_guides_search ON travel_guides USING GIN (to_tsvector('english', title || ' ' || content));

-- ----------------------------------------------------------------------------
-- User Travel History (Learn from past trips for personalization)
-- ----------------------------------------------------------------------------
CREATE TABLE user_travel_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
    
    -- Destination
    destination TEXT NOT NULL,
    country TEXT,
    
    -- Visit Details
    visit_date DATE,
    duration_days INTEGER,
    
    -- Feedback
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    would_revisit BOOLEAN,
    
    -- Extracted Preferences
    preferred_activities TEXT[] DEFAULT '{}',
    favorite_places JSONB DEFAULT '[]',
    
    -- Embedding for similarity matching
    experience_embedding VECTOR(1536),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for user_travel_history
CREATE INDEX idx_user_travel_history_user_id ON user_travel_history(user_id);
CREATE INDEX idx_user_travel_history_destination ON user_travel_history(destination);
CREATE INDEX idx_user_travel_history_embedding ON user_travel_history USING ivfflat (experience_embedding vector_cosine_ops);

-- ----------------------------------------------------------------------------
-- Search Cache (Cache API responses to save costs)
-- ----------------------------------------------------------------------------
CREATE TABLE search_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Cache Key
    cache_key TEXT UNIQUE NOT NULL, -- Hash of search parameters
    search_type TEXT NOT NULL, -- 'flight', 'hotel', 'activity'
    
    -- Search Parameters
    parameters JSONB NOT NULL,
    
    -- Cached Results
    results JSONB NOT NULL,
    
    -- Metadata
    provider TEXT, -- e.g., 'Amadeus', 'Booking.com'
    result_count INTEGER,
    
    -- Expiration
    expires_at TIMESTAMPTZ NOT NULL,
    is_expired BOOLEAN GENERATED ALWAYS AS (expires_at < NOW()) STORED,
    
    -- Usage Stats
    hit_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for search_cache
CREATE INDEX idx_search_cache_key ON search_cache(cache_key);
CREATE INDEX idx_search_cache_type ON search_cache(search_type);
CREATE INDEX idx_search_cache_expires_at ON search_cache(expires_at);
CREATE INDEX idx_search_cache_expired ON search_cache(is_expired) WHERE is_expired = FALSE;

-- Auto-delete expired cache entries
CREATE INDEX idx_search_cache_cleanup ON search_cache(created_at) WHERE is_expired = TRUE;

-- ============================================================================
-- NOTIFICATION & COMMUNICATION TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Notifications (In-app and email notifications)
-- ----------------------------------------------------------------------------
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Notification Details
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    
    -- Related Entities
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    
    -- Delivery
    status notification_status DEFAULT 'pending',
    delivery_channel TEXT[] DEFAULT '{in_app}', -- e.g., ['in_app', 'email', 'sms']
    
    -- Email Details
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMPTZ,
    email_opened BOOLEAN DEFAULT FALSE,
    email_opened_at TIMESTAMPTZ,
    
    -- Action
    action_url TEXT, -- Link to relevant page
    action_label TEXT, -- Button text
    
    -- Priority
    priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
    
    -- Read Status
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    
    -- Expiration
    expires_at TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ
);

-- Indexes for notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_read ON notifications(read) WHERE read = FALSE;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- ----------------------------------------------------------------------------
-- Email Logs (Track all emails sent)
-- ----------------------------------------------------------------------------
CREATE TABLE email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    notification_id UUID REFERENCES notifications(id) ON DELETE SET NULL,
    
    -- Email Details
    to_email TEXT NOT NULL,
    from_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    
    -- Provider
    email_provider TEXT DEFAULT 'resend', -- resend, sendgrid, etc.
    provider_message_id TEXT,
    
    -- Status
    status TEXT DEFAULT 'pending', -- pending, sent, delivered, bounced, failed
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    bounced_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ
);

-- Indexes for email_logs
CREATE INDEX idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX idx_email_logs_to_email ON email_logs(to_email);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_created_at ON email_logs(created_at DESC);

-- ============================================================================
-- ANALYTICS & TRACKING TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- User Activity Logs (Track user behavior for analytics)
-- ----------------------------------------------------------------------------
CREATE TABLE user_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Activity
    activity_type TEXT NOT NULL, -- e.g., 'page_view', 'search', 'booking', 'chat_message'
    activity_name TEXT,
    
    -- Context
    page_url TEXT,
    referrer TEXT,
    
    -- Device Info
    user_agent TEXT,
    ip_address INET,
    device_type TEXT, -- mobile, tablet, desktop
    browser TEXT,
    os TEXT,
    
    -- Session
    session_id UUID,
    
    -- Data
    metadata JSONB DEFAULT '{}',
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for user_activity_logs
CREATE INDEX idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX idx_user_activity_logs_type ON user_activity_logs(activity_type);
CREATE INDEX idx_user_activity_logs_session ON user_activity_logs(session_id);
CREATE INDEX idx_user_activity_logs_created_at ON user_activity_logs(created_at DESC);

-- Partition by month for better performance
-- (Optional: implement partitioning if table grows large)

-- ----------------------------------------------------------------------------
-- API Usage Logs (Track external API calls for cost monitoring)
-- ----------------------------------------------------------------------------
CREATE TABLE api_usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- API Details
    api_provider TEXT NOT NULL, -- e.g., 'amadeus', 'booking', 'openai', 'stripe'
    api_endpoint TEXT,
    http_method TEXT,
    
    -- Usage
    request_count INTEGER DEFAULT 1,
    
    -- Cost
    cost_usd DECIMAL(10, 4),
    
    -- Response
    http_status_code INTEGER,
    response_time_ms INTEGER,
    success BOOLEAN DEFAULT TRUE,
    
    -- Context
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    agent_run_id UUID REFERENCES agent_runs(id) ON DELETE SET NULL,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for api_usage_logs
CREATE INDEX idx_api_usage_logs_provider ON api_usage_logs(api_provider);
CREATE INDEX idx_api_usage_logs_user_id ON api_usage_logs(user_id);
CREATE INDEX idx_api_usage_logs_created_at ON api_usage_logs(created_at DESC);

-- ----------------------------------------------------------------------------
-- Error Logs (Centralized error tracking)
-- ----------------------------------------------------------------------------
CREATE TABLE error_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Error Details
    error_type TEXT NOT NULL, -- e.g., 'api_error', 'agent_error', 'validation_error'
    error_message TEXT NOT NULL,
    error_stack TEXT,
    
    -- Context
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    agent_run_id UUID REFERENCES agent_runs(id) ON DELETE SET NULL,
    
    -- Request Info
    endpoint TEXT,
    http_method TEXT,
    request_body JSONB,
    
    -- Severity
    severity TEXT DEFAULT 'error', -- info, warning, error, critical
    
    -- Resolution
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for error_logs
CREATE INDEX idx_error_logs_type ON error_logs(error_type);
CREATE INDEX idx_error_logs_severity ON error_logs(severity);
CREATE INDEX idx_error_logs_resolved ON error_logs(resolved) WHERE resolved = FALSE;
-- Indexes for error_logs (continued)
CREATE INDEX idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at DESC);

-- ============================================================================
-- FEEDBACK & RATINGS TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Trip Reviews (User feedback on completed trips)
-- ----------------------------------------------------------------------------
CREATE TABLE trip_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Overall Rating
    overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
    
    -- Detailed Ratings
    planning_experience_rating INTEGER CHECK (planning_experience_rating >= 1 AND planning_experience_rating <= 5),
    ai_accuracy_rating INTEGER CHECK (ai_accuracy_rating >= 1 AND ai_accuracy_rating <= 5),
    value_for_money_rating INTEGER CHECK (value_for_money_rating >= 1 AND value_for_money_rating <= 5),
    
    -- Written Review
    title TEXT,
    review_text TEXT,
    
    -- Specific Feedback
    what_went_well TEXT,
    what_could_improve TEXT,
    
    -- Would Recommend
    would_recommend BOOLEAN,
    would_use_again BOOLEAN,
    
    -- Photos
    photo_urls TEXT[] DEFAULT '{}',
    
    -- Embedding for sentiment analysis
    review_embedding VECTOR(1536),
    sentiment_score DECIMAL(3, 2), -- -1 to 1 (negative to positive)
    
    -- Public/Private
    is_public BOOLEAN DEFAULT FALSE,
    
    -- Moderation
    is_approved BOOLEAN DEFAULT TRUE,
    moderated_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for trip_reviews
CREATE INDEX idx_trip_reviews_trip_id ON trip_reviews(trip_id);
CREATE INDEX idx_trip_reviews_user_id ON trip_reviews(user_id);
CREATE INDEX idx_trip_reviews_rating ON trip_reviews(overall_rating);
CREATE INDEX idx_trip_reviews_public ON trip_reviews(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_trip_reviews_embedding ON trip_reviews USING ivfflat (review_embedding vector_cosine_ops);

-- ----------------------------------------------------------------------------
-- Agent Feedback (Feedback on specific agent responses)
-- ----------------------------------------------------------------------------
CREATE TABLE agent_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_run_id UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    
    -- Feedback Type
    feedback_type TEXT NOT NULL, -- 'helpful', 'unhelpful', 'accurate', 'inaccurate', 'inappropriate'
    
    -- Rating
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    
    -- Comments
    comment TEXT,
    
    -- Specific Issues
    issues TEXT[] DEFAULT '{}', -- e.g., ['wrong_dates', 'incorrect_pricing', 'bad_recommendations']
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for agent_feedback
CREATE INDEX idx_agent_feedback_agent_run_id ON agent_feedback(agent_run_id);
CREATE INDEX idx_agent_feedback_user_id ON agent_feedback(user_id);
CREATE INDEX idx_agent_feedback_type ON agent_feedback(feedback_type);
CREATE INDEX idx_agent_feedback_created_at ON agent_feedback(created_at DESC);

-- ============================================================================
-- REFERENCE DATA TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Airports (Reference data for flight searches)
-- ----------------------------------------------------------------------------
CREATE TABLE airports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Codes
    iata_code TEXT UNIQUE NOT NULL, -- 3-letter code (e.g., 'JFK')
    icao_code TEXT UNIQUE, -- 4-letter code (e.g., 'KJFK')
    
    -- Basic Info
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    country TEXT NOT NULL,
    country_code TEXT NOT NULL, -- ISO 2-letter code
    
    -- Location
    latitude DECIMAL(10, 6),
    longitude DECIMAL(10, 6),
    timezone TEXT,
    
    -- Details
    airport_type TEXT, -- large_airport, medium_airport, small_airport
    
    -- Popularity (for search ranking)
    popularity_score INTEGER DEFAULT 0,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for airports
CREATE INDEX idx_airports_iata ON airports(iata_code);
CREATE INDEX idx_airports_city ON airports(city);
CREATE INDEX idx_airports_country ON airports(country);
CREATE INDEX idx_airports_popularity ON airports(popularity_score DESC);

-- Full-text search for airports
CREATE INDEX idx_airports_search ON airports USING GIN (
    to_tsvector('english', name || ' ' || city || ' ' || country || ' ' || iata_code)
);

-- ----------------------------------------------------------------------------
-- Countries (Reference data for destinations)
-- ----------------------------------------------------------------------------
CREATE TABLE countries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Codes
    country_code TEXT UNIQUE NOT NULL, -- ISO 2-letter (e.g., 'US')
    country_code_3 TEXT UNIQUE NOT NULL, -- ISO 3-letter (e.g., 'USA')
    
    -- Names
    name TEXT NOT NULL,
    official_name TEXT,
    
    -- Location
    region TEXT, -- e.g., 'Europe', 'Asia'
    subregion TEXT, -- e.g., 'Western Europe'
    
    -- Details
    capital TEXT,
    currency TEXT,
    languages TEXT[] DEFAULT '{}',
    
    -- Travel Info
    visa_requirements JSONB, -- By nationality
    travel_advisories JSONB,
    
    -- Popularity
    popularity_score INTEGER DEFAULT 0,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for countries
CREATE INDEX idx_countries_code ON countries(country_code);
CREATE INDEX idx_countries_region ON countries(region);
CREATE INDEX idx_countries_popularity ON countries(popularity_score DESC);

-- ----------------------------------------------------------------------------
-- Cities (Popular travel destinations)
-- ----------------------------------------------------------------------------
CREATE TABLE cities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic Info
    name TEXT NOT NULL,
    country_code TEXT NOT NULL REFERENCES countries(country_code),
    
    -- Location
    latitude DECIMAL(10, 6),
    longitude DECIMAL(10, 6),
    timezone TEXT,
    
    -- Details
    population INTEGER,
    
    -- Airport
    primary_airport_iata TEXT REFERENCES airports(iata_code),
    
    -- Travel Info
    description TEXT,
    best_time_to_visit TEXT, -- e.g., 'April-June, September-October'
    average_daily_budget DECIMAL(10, 2),
    
    -- Popularity
    popularity_score INTEGER DEFAULT 0,
    tourist_rating DECIMAL(3, 2), -- 0-5
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for cities
CREATE INDEX idx_cities_name ON cities(name);
CREATE INDEX idx_cities_country ON cities(country_code);
CREATE INDEX idx_cities_popularity ON cities(popularity_score DESC);
CREATE INDEX idx_cities_airport ON cities(primary_airport_iata);

-- Full-text search for cities
CREATE INDEX idx_cities_search ON cities USING GIN (
    to_tsvector('english', name || ' ' || COALESCE(description, ''))
);

-- ----------------------------------------------------------------------------
-- Popular Attractions (For itinerary suggestions)
-- ----------------------------------------------------------------------------
CREATE TABLE attractions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic Info
    name TEXT NOT NULL,
    city_id UUID REFERENCES cities(id) ON DELETE CASCADE,
    
    -- Category
    category TEXT NOT NULL, -- museum, landmark, restaurant, activity, etc.
    subcategory TEXT,
    
    -- Location
    address TEXT,
    latitude DECIMAL(10, 6),
    longitude DECIMAL(10, 6),
    
    -- Details
    description TEXT,
    
    -- Visiting Info
    average_visit_duration INTEGER, -- in minutes
    estimated_cost DECIMAL(10, 2),
    opening_hours JSONB,
    best_time_to_visit TEXT,
    
    -- Ratings
    rating DECIMAL(3, 2), -- 0-5
    review_count INTEGER DEFAULT 0,
    
    -- Popularity
    popularity_score INTEGER DEFAULT 0,
    
    -- Photos
    photo_urls TEXT[] DEFAULT '{}',
    
    -- External IDs
    google_place_id TEXT,
    
    -- Embedding for recommendations
    description_embedding VECTOR(1536),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for attractions
CREATE INDEX idx_attractions_city ON attractions(city_id);
CREATE INDEX idx_attractions_category ON attractions(category);
CREATE INDEX idx_attractions_rating ON attractions(rating DESC);
CREATE INDEX idx_attractions_popularity ON attractions(popularity_score DESC);
CREATE INDEX idx_attractions_embedding ON attractions USING ivfflat (description_embedding vector_cosine_ops);

-- Full-text search for attractions
CREATE INDEX idx_attractions_search ON attractions USING GIN (
    to_tsvector('english', name || ' ' || COALESCE(description, ''))
);

-- ============================================================================
-- ADMIN & MODERATION TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Admin Users (For system management)
-- ----------------------------------------------------------------------------
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Role
    role TEXT NOT NULL DEFAULT 'moderator', -- admin, moderator, support
    permissions TEXT[] DEFAULT '{}',
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ
);

-- Indexes for admin_users
CREATE INDEX idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX idx_admin_users_role ON admin_users(role);

-- ----------------------------------------------------------------------------
-- Audit Logs (Track important system changes)
-- ----------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Actor
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    admin_user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    
    -- Action
    action TEXT NOT NULL, -- e.g., 'user_created', 'booking_cancelled', 'payment_refunded'
    entity_type TEXT, -- e.g., 'user', 'booking', 'payment'
    entity_id UUID,
    
    -- Changes
    old_values JSONB,
    new_values JSONB,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit_logs
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ----------------------------------------------------------------------------
-- Feature Flags (Toggle features on/off)
-- ----------------------------------------------------------------------------
CREATE TABLE feature_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Flag Info
    flag_key TEXT UNIQUE NOT NULL,
    flag_name TEXT NOT NULL,
    description TEXT,
    
    -- Status
    is_enabled BOOLEAN DEFAULT FALSE,
    
    -- Rollout
    rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
    user_whitelist UUID[] DEFAULT '{}', -- Specific users who have access
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for feature_flags
CREATE INDEX idx_feature_flags_key ON feature_flags(flag_key);
CREATE INDEX idx_feature_flags_enabled ON feature_flags(is_enabled);

-- ============================================================================
-- VIEWS (Convenient data access)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Active Trips View (Trips that are confirmed or in progress)
-- ----------------------------------------------------------------------------
CREATE VIEW active_trips AS
SELECT 
    t.*,
    u.full_name AS user_name,
    u.email AS user_email,
    COUNT(DISTINCT b.id) AS booking_count,
    SUM(b.total_price) AS total_booking_cost
FROM trips t
JOIN users u ON t.user_id = u.id
LEFT JOIN bookings b ON t.id = b.trip_id AND b.status = 'confirmed'
WHERE t.status IN ('confirmed', 'in_progress')
    AND t.start_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY t.id, u.full_name, u.email;

-- ----------------------------------------------------------------------------
-- User Statistics View (Per-user analytics)
-- ----------------------------------------------------------------------------
CREATE VIEW user_statistics AS
SELECT 
    u.id AS user_id,
    u.full_name,
    u.email,
    COUNT(DISTINCT t.id) AS total_trips,
    COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) AS completed_trips,
    COUNT(DISTINCT c.id) AS total_conversations,
    COUNT(DISTINCT m.id) AS total_messages,
    SUM(p.amount) AS total_spent,
    AVG(tr.overall_rating) AS average_trip_rating,
    MAX(t.created_at) AS last_trip_date,
    u.created_at AS member_since
FROM users u
LEFT JOIN trips t ON u.id = t.user_id
LEFT JOIN conversations c ON u.id = c.user_id
LEFT JOIN messages m ON c.id = m.conversation_id AND m.role = 'user'
LEFT JOIN payments p ON u.id = p.user_id AND p.status = 'succeeded'
LEFT JOIN trip_reviews tr ON t.id = tr.trip_id
GROUP BY u.id, u.full_name, u.email, u.created_at;

-- ----------------------------------------------------------------------------
-- Agent Performance View (Agent execution metrics)
-- ----------------------------------------------------------------------------
CREATE VIEW agent_performance AS
SELECT 
    agent_type,
    DATE_TRUNC('day', started_at) AS date,
    COUNT(*) AS total_runs,
    COUNT(*) FILTER (WHERE execution_status = 'completed') AS successful_runs,
    COUNT(*) FILTER (WHERE execution_status = 'failed') AS failed_runs,
    ROUND(AVG(duration_ms), 2) AS avg_duration_ms,
    ROUND(SUM(cost_usd), 4) AS total_cost_usd,
    ROUND(AVG(retry_count), 2) AS avg_retry_count
FROM agent_runs
GROUP BY agent_type, DATE_TRUNC('day', started_at);

-- ----------------------------------------------------------------------------
-- Revenue View (Financial analytics)
-- ----------------------------------------------------------------------------
CREATE VIEW revenue_analytics AS
SELECT 
    DATE_TRUNC('day', created_at) AS date,
    COUNT(*) AS total_payments,
    COUNT(*) FILTER (WHERE status = 'succeeded') AS successful_payments,
    SUM(amount) FILTER (WHERE status = 'succeeded') AS total_revenue,
    AVG(amount) FILTER (WHERE status = 'succeeded') AS average_transaction,
    COUNT(DISTINCT user_id) AS unique_customers
FROM payments
GROUP BY DATE_TRUNC('day', created_at);

-- ============================================================================
-- FUNCTIONS (Business logic and utilities)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Match User Preferences (RAG similarity search)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION match_user_preferences(
    query_embedding VECTOR(1536),
    target_user_id UUID,
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    preference_text TEXT,
    similarity FLOAT
)
LANGUAGE SQL STABLE
AS $$
    SELECT
        up.id,
        up.preference_text,
        1 - (up.preference_embedding <=> query_embedding) AS similarity
    FROM user_preferences up
    WHERE up.user_id = target_user_id
        AND up.preference_embedding IS NOT NULL
        AND 1 - (up.preference_embedding <=> query_embedding) > match_threshold
    ORDER BY similarity DESC
    LIMIT match_count;
$$;

-- ----------------------------------------------------------------------------
-- Match Travel Guides (RAG similarity search)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION match_travel_guides(
    query_embedding VECTOR(1536),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 10,
    destination_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    destination TEXT,
    title TEXT,
    content TEXT,
    category TEXT,
    similarity FLOAT
)
LANGUAGE SQL STABLE
AS $$
    SELECT
        tg.id,
        tg.destination,
        tg.title,
        tg.content,
        tg.category,
        1 - (tg.content_embedding <=> query_embedding) AS similarity
    FROM travel_guides tg
    WHERE tg.content_embedding IS NOT NULL
        AND 1 - (tg.content_embedding <=> query_embedding) > match_threshold
        AND (destination_filter IS NULL OR tg.destination ILIKE '%' || destination_filter || '%')
    ORDER BY similarity DESC
    LIMIT match_count;
$$;

-- ----------------------------------------------------------------------------
-- Find Similar Past Trips (Recommendation engine)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION find_similar_trips(
    target_user_id UUID,
    destination_query TEXT,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    trip_id UUID,
    title TEXT,
    destination TEXT,
    start_date DATE,
    rating INTEGER,
    similarity_score FLOAT
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id AS trip_id,
        t.title,
        (t.destinations->0->>'city')::TEXT AS destination,
        t.start_date,
        tr.overall_rating AS rating,
        similarity(
            (t.destinations->0->>'city')::TEXT, 
            destination_query
        ) AS similarity_score
    FROM trips t
    LEFT JOIN trip_reviews tr ON t.id = tr.trip_id
    WHERE t.user_id = target_user_id
        AND t.status = 'completed'
        AND (t.destinations->0->>'city')::TEXT IS NOT NULL
    ORDER BY similarity_score DESC, tr.overall_rating DESC NULLS LAST
    LIMIT match_count;
END;
$$;

-- Enable pg_trgm extension for similarity search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ----------------------------------------------------------------------------
-- Calculate Trip Cost Summary
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_trip_cost(trip_id_param UUID)
RETURNS TABLE (
    total_cost DECIMAL(10, 2),
    flight_cost DECIMAL(10, 2),
    hotel_cost DECIMAL(10, 2),
    activity_cost DECIMAL(10, 2),
    other_cost DECIMAL(10, 2)
)
LANGUAGE SQL STABLE
AS $$
    SELECT
        SUM(b.total_price) AS total_cost,
        SUM(b.total_price) FILTER (WHERE b.booking_type = 'flight') AS flight_cost,
        SUM(b.total_price) FILTER (WHERE b.booking_type = 'hotel') AS hotel_cost,
        SUM(b.total_price) FILTER (WHERE b.booking_type = 'activity') AS activity_cost,
        SUM(b.total_price) FILTER (WHERE b.booking_type NOT IN ('flight', 'hotel', 'activity')) AS other_cost
    FROM bookings b
    WHERE b.trip_id = trip_id_param
        AND b.status = 'confirmed';
$$;

-- ----------------------------------------------------------------------------
-- Get User Travel Profile (Comprehensive user data)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_travel_profile(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql STABLE
AS $$
DECLARE
    profile JSON;
BEGIN
    SELECT json_build_object(
        'user_id', u.id,
        'full_name', u.full_name,
        'email', u.email,
        'member_since', u.created_at,
        'preferences', json_build_object(
            'travel_style', up.travel_style,
            'travel_pace', up.travel_pace,
            'accommodation_preference', up.accommodation_preference,
            'interests', up.interests,
            'dietary_preferences', up.dietary_preferences,
            'budget_range', json_build_object(
                'daily_min', up.typical_daily_budget_min,
                'daily_max', up.typical_daily_budget_max
            )
        ),
        'statistics', json_build_object(
            'total_trips', COUNT(DISTINCT t.id),
            'completed_trips', COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END),
            'countries_visited', COUNT(DISTINCT t.destinations->0->>'country'),
            'total_spent', SUM(p.amount) FILTER (WHERE p.status = 'succeeded'),
            'average_trip_rating', AVG(tr.overall_rating)
        ),
        'recent_destinations', (
            SELECT json_agg(DISTINCT t.destinations->0->>'city')
            FROM trips t
            WHERE t.user_id = target_user_id
                AND t.status = 'completed'
            ORDER BY t.start_date DESC
            LIMIT 5
        )
    )
    INTO profile
    FROM users u
    LEFT JOIN user_preferences up ON u.id = up.user_id
    LEFT JOIN trips t ON u.id = t.user_id
    LEFT JOIN payments p ON u.id = p.user_id
    LEFT JOIN trip_reviews tr ON t.id = tr.trip_id
    WHERE u.id = target_user_id
    GROUP BY u.id, u.full_name, u.email, u.created_at, up.travel_style, up.travel_pace, 
             up.accommodation_preference, up.interests, up.dietary_preferences,
             up.typical_daily_budget_min, up.typical_daily_budget_max;
    
    RETURN profile;
END;
$$;

-- ============================================================================
-- TRIGGERS (Automated actions)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Update updated_at timestamp automatically
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON trips
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trip_reviews_updated_at BEFORE UPDATE ON trip_reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- Update conversation last_message_at when message is created
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations
    SET last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_last_message_trigger
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- ----------------------------------------------------------------------------
-- Update trip actual_cost when bookings change
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_trip_actual_cost()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE trips
    SET actual_cost = (
        SELECT COALESCE(SUM(total_price), 0)
        FROM bookings
        WHERE trip_id = COALESCE(NEW.trip_id, OLD.trip_id)
            AND status = 'confirmed'
    )
    WHERE id = COALESCE(NEW.trip_id, OLD.trip_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_trip_cost_on_booking
AFTER INSERT OR UPDATE OR DELETE ON bookings
FOR EACH ROW EXECUTE FUNCTION update_trip_actual_cost();

-- ----------------------------------------------------------------------------
-- Auto-generate trip title from destinations
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auto_generate_trip_title()
RETURNS TRIGGER AS $$
DECLARE
    destination_city TEXT;
    duration TEXT;
BEGIN
    IF NEW.title IS NULL OR NEW.title = '' THEN
        -- Extract first city from destinations
        destination_city := NEW.destinations->0->>'city';
        
        -- Calculate duration
        IF NEW.duration_days = 1 THEN
            duration := '1 Day';
        ELSE
            duration := NEW.duration_days || ' Days';
        END IF;
        
        -- Generate title
        NEW.title := destination_city || ' - ' || duration;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_title_trip
BEFORE INSERT ON trips
FOR EACH ROW EXECUTE FUNCTION auto_generate_trip_title();

-- ----------------------------------------------------------------------------
-- Create notification when booking is confirmed
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_booking_notification()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'confirmed' AND (OLD IS NULL OR OLD.status != 'confirmed') THEN
        INSERT INTO notifications (
            user_id,
            type,
            title,
            message,
            trip_id,
            booking_id,
            action_url
        ) VALUES (
            NEW.user_id,
            'booking_confirmation',
            'Booking Confirmed!',
            'Your ' || NEW.booking_type || ' booking has been confirmed. Confirmation code: ' || NEW.confirmation_code,
            NEW.trip_id,
            NEW.id,
            '/trips/' || NEW.trip_id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_booking_notification_trigger
AFTER INSERT OR UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION create_booking_notification();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all user-facing tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_feedback ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Users can only see their own data
-- ----------------------------------------------------------------------------

-- Users table
CREATE POLICY users_select_own ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY users_update_own ON users
    FOR UPDATE USING (auth.uid() = id);

-- User preferences
CREATE POLICY user_preferences_all_own ON user_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Conversations
CREATE POLICY conversations_all_own ON conversations
    FOR ALL USING (auth.uid() = user_id);

-- Messages
CREATE POLICY messages_all_own ON messages
    FOR ALL USING (
        auth.uid() IN (
            SELECT user_id FROM conversations WHERE id = messages.conversation_id
        )
    );

-- Trips
CREATE POLICY trips_select_own ON trips
    FOR SELECT USING (
        auth.uid() = user_id 
        OR auth.uid() = ANY(shared_with)
    );

CREATE POLICY trips_all_own ON trips
    FOR ALL USING (auth.uid() = user_id);

-- Bookings
CREATE POLICY bookings_all_own ON bookings
    FOR ALL USING (auth.uid() = user_id);

-- Payments
CREATE POLICY payments_all_own ON payments
    FOR ALL USING (auth.uid() = user_id);

-- Notifications
CREATE POLICY notifications_all_own ON notifications
    FOR ALL USING (auth.uid() = user_id);

-- Trip reviews
CREATE POLICY trip_reviews_select_public ON trip_reviews
    FOR SELECT USING (is_public = TRUE OR auth.uid() = user_id);

CREATE POLICY trip_reviews_manage_own ON trip_reviews
    FOR ALL USING (auth.uid() = user_id);

-- Agent feedback
CREATE POLICY agent_feedback_all_own ON agent_feedback
    FOR ALL USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Public read access for reference data
-- ----------------------------------------------------------------------------

ALTER TABLE airports ENABLE ROW LEVEL SECURITY;
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE attractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY airports_select_all ON airports FOR SELECT USING (true);
CREATE POLICY countries_select_all ON countries FOR SELECT USING (true);
CREATE POLICY cities_select_all ON cities FOR SELECT USING (true);
CREATE POLICY attractions_select_all ON attractions FOR SELECT USING (true);
CREATE POLICY travel_guides_select_all ON travel_guides FOR SELECT USING (true);

-- ============================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ============================================================================

-- Composite indexes for common queries
CREATE INDEX idx_bookings_trip_status ON bookings(trip_id, status);
CREATE INDEX idx_bookings_user_status ON bookings(user_id, status);
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_agent_runs_user_status ON agent_runs(user_id, execution_status);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, read) WHERE read = FALSE;
CREATE INDEX idx_trips_user_status_date ON trips(user_id, status, start_date);

-- ============================================================================
-- INITIAL DATA SEEDING (Optional - for development)
-- ============================================================================

-- Seed some popular airports
INSERT INTO airports (iata_code, icao_code, name, city, country, country_code, latitude, longitude, timezone, airport_type, popularity_score) VALUES
('JFK', 'KJFK', 'John F. Kennedy International Airport', 'New York', 'United States', 'US', 40.6413, -73.7781, 'America/New_York', 'large_airport', 100),
('LAX', 'KLAX', 'Los Angeles International Airport', 'Los Angeles', 'United States', 'US', 33.9416, -118.4085, 'America/Los_Angeles', 'large_airport', 95),
('LHR', 'EGLL', 'London Heathrow Airport', 'London', 'United Kingdom', 'GB', 51.4700, -0.4543, 'Europe/London', 'large_airport', 98),
('CDG', 'LFPG', 'Charles de Gaulle Airport', 'Paris', 'France', 'FR', 49.0097, 2.5479, 'Europe/Paris', 'large_airport', 90),
('DXB', 'OMDB', 'Dubai International Airport', 'Dubai', 'United Arab Emirates', 'AE', 25.2532, 55.3657, 'Asia/Dubai', 'large_airport', 92),
('NRT', 'RJAA', 'Narita International Airport', 'Tokyo', 'Japan', 'JP', 35.7720, 140.3929, 'Asia/Tokyo', 'large_airport', 88),
('SIN', 'WSSS', 'Singapore Changi Airport', 'Singapore', 'Singapore', 'SG', 1.3644, 103.9915, 'Asia/Singapore', 'large_airport', 94),
('SYD', 'YSSY', 'Sydney Kingsford Smith Airport', 'Sydney', 'Australia', 'AU', -33.9399, 151.1753, 'Australia/Sydney', 'large_airport', 85),
('FRA', 'EDDF', 'Frankfurt Airport', 'Frankfurt', 'Germany', 'DE', 50.0379, 8.5622, 'Europe/Berlin', 'large_airport', 87),
('AMS', 'EHAM', 'Amsterdam Airport Schiphol', 'Amsterdam', 'Netherlands', 'NL', 52.3086, 4.7639, 'Europe/Amsterdam', 'large_airport', 86),
('HKG', 'VHHH', 'Hong Kong International Airport', 'Hong Kong', 'Hong Kong', 'HK', 22.3080, 113.9185, 'Asia/Hong_Kong', 'large_airport', 89),
('BCN', 'LEBL', 'Barcelona-El Prat Airport', 'Barcelona', 'Spain', 'ES', 41.2974, 2.0833, 'Europe/Madrid', 'large_airport', 82),
('IST', 'LTFM', 'Istanbul Airport', 'Istanbul', 'Turkey', 'TR', 41.2753, 28.7519, 'Europe/Istanbul', 'large_airport', 84),
('ORD', 'KORD', 'O''Hare International Airport', 'Chicago', 'United States', 'US', 41.9742, -87.9073, 'America/Chicago', 'large_airport', 91),
('ATL', 'KATL', 'Hartsfield-Jackson Atlanta International Airport', 'Atlanta', 'United States', 'US', 33.6407, -84.4277, 'America/New_York', 'large_airport', 93)
ON CONFLICT (iata_code) DO NOTHING;

-- Seed countries
INSERT INTO countries (country_code, country_code_3, name, official_name, region, subregion, capital, currency, languages, popularity_score) VALUES
('US', 'USA', 'United States', 'United States of America', 'Americas', 'Northern America', 'Washington D.C.', 'USD', ARRAY['en'], 100),
('GB', 'GBR', 'United Kingdom', 'United Kingdom of Great Britain and Northern Ireland', 'Europe', 'Northern Europe', 'London', 'GBP', ARRAY['en'], 95),
('FR', 'FRA', 'France', 'French Republic', 'Europe', 'Western Europe', 'Paris', 'EUR', ARRAY['fr'], 98),
('IT', 'ITA', 'Italy', 'Italian Republic', 'Europe', 'Southern Europe', 'Rome', 'EUR', ARRAY['it'], 96),
('ES', 'ESP', 'Spain', 'Kingdom of Spain', 'Europe', 'Southern Europe', 'Madrid', 'EUR', ARRAY['es'], 94),
('DE', 'DEU', 'Germany', 'Federal Republic of Germany', 'Europe', 'Western Europe', 'Berlin', 'EUR', ARRAY['de'], 92),
('JP', 'JPN', 'Japan', 'Japan', 'Asia', 'Eastern Asia', 'Tokyo', 'JPY', ARRAY['ja'], 90),
('AE', 'ARE', 'United Arab Emirates', 'United Arab Emirates', 'Asia', 'Western Asia', 'Abu Dhabi', 'AED', ARRAY['ar', 'en'], 88),
('AU', 'AUS', 'Australia', 'Commonwealth of Australia', 'Oceania', 'Australia and New Zealand', 'Canberra', 'AUD', ARRAY['en'], 87),
('CA', 'CAN', 'Canada', 'Canada', 'Americas', 'Northern America', 'Ottawa', 'CAD', ARRAY['en', 'fr'], 89),
('SG', 'SGP', 'Singapore', 'Republic of Singapore', 'Asia', 'South-Eastern Asia', 'Singapore', 'SGD', ARRAY['en', 'zh', 'ms', 'ta'], 91),
('NL', 'NLD', 'Netherlands', 'Kingdom of the Netherlands', 'Europe', 'Western Europe', 'Amsterdam', 'EUR', ARRAY['nl'], 85),
('CH', 'CHE', 'Switzerland', 'Swiss Confederation', 'Europe', 'Western Europe', 'Bern', 'CHF', ARRAY['de', 'fr', 'it'], 84),
('GR', 'GRC', 'Greece', 'Hellenic Republic', 'Europe', 'Southern Europe', 'Athens', 'EUR', ARRAY['el'], 83),
('TR', 'TUR', 'Turkey', 'Republic of Turkey', 'Asia', 'Western Asia', 'Ankara', 'TRY', ARRAY['tr'], 82)
ON CONFLICT (country_code) DO NOTHING;

-- Seed cities
INSERT INTO cities (name, country_code, latitude, longitude, timezone, population, primary_airport_iata, description, best_time_to_visit, average_daily_budget, popularity_score, tourist_rating) VALUES
('Paris', 'FR', 48.8566, 2.3522, 'Europe/Paris', 2161000, 'CDG', 'The City of Light, known for art, fashion, gastronomy and culture', 'April-June, September-October', 150.00, 100, 4.8),
('London', 'GB', 51.5074, -0.1278, 'Europe/London', 8982000, 'LHR', 'Historic capital with world-class museums, theaters and landmarks', 'May-September', 180.00, 98, 4.7),
('New York', 'US', 40.7128, -74.0060, 'America/New_York', 8336000, 'JFK', 'The city that never sleeps, center of culture, finance and entertainment', 'April-June, September-November', 200.00, 99, 4.8),
('Tokyo', 'JP', 35.6762, 139.6503, 'Asia/Tokyo', 13960000, 'NRT', 'Blend of traditional and ultra-modern, from temples to neon-lit skyscrapers', 'March-May, September-November', 120.00, 95, 4.9),
('Barcelona', 'ES', 41.3851, 2.1734, 'Europe/Madrid', 1620000, 'BCN', 'Mediterranean city known for art, architecture and vibrant culture', 'April-June, September-October', 110.00, 93, 4.7),
('Dubai', 'AE', 25.2048, 55.2708, 'Asia/Dubai', 3331000, 'DXB', 'Futuristic city with luxury shopping, ultramodern architecture and nightlife', 'November-March', 250.00, 92, 4.6),
('Rome', 'IT', 41.9028, 12.4964, 'Europe/Rome', 2873000, 'FCO', 'The Eternal City, home to ancient ruins, art masterpieces and Vatican City', 'April-June, September-October', 130.00, 96, 4.8),
('Amsterdam', 'NL', 52.3676, 4.9041, 'Europe/Amsterdam', 872000, 'AMS', 'City of canals, cycling culture, art museums and liberal attitudes', 'April-September', 140.00, 90, 4.6),
('Singapore', 'SG', 1.3521, 103.8198, 'Asia/Singapore', 5686000, 'SIN', 'Clean, efficient city-state blending Chinese, Malay and Indian influences', 'February-April', 160.00, 91, 4.7),
('Sydney', 'AU', -33.8688, 151.2093, 'Australia/Sydney', 5312000, 'SYD', 'Harbour city with iconic Opera House, beaches and outdoor lifestyle', 'September-November, March-May', 170.00, 88, 4.7),
('Istanbul', 'TR', 41.0082, 28.9784, 'Europe/Istanbul', 15460000, 'IST', 'Transcontinental city bridging Europe and Asia, rich in history', 'April-May, September-October', 80.00, 87, 4.6),
('Los Angeles', 'US', 34.0522, -118.2437, 'America/Los_Angeles', 3979000, 'LAX', 'Entertainment capital with beaches, Hollywood and diverse culture', 'March-May, September-November', 190.00, 89, 4.5),
('Berlin', 'DE', 52.5200, 13.4050, 'Europe/Berlin', 3645000, 'TXL', 'Historic city known for art scene, nightlife and modern history', 'May-September', 100.00, 86, 4.6),
('Athens', 'GR', 37.9838, 23.7275, 'Europe/Athens', 3154000, 'ATH', 'Ancient city, cradle of Western civilization and democracy', 'April-June, September-October', 90.00, 85, 4.5),
('Zurich', 'CH', 47.3769, 8.5417, 'Europe/Zurich', 402000, 'ZRH', 'Swiss banking hub with pristine lake, mountains and high quality of life', 'June-August, December-March', 220.00, 83, 4.6)
ON CONFLICT DO NOTHING;

-- Seed some sample travel guides
INSERT INTO travel_guides (destination, city, country, title, content, category, tags, language, is_verified, quality_score) VALUES
('Paris, France', 'Paris', 'France', 'Best Museums in Paris', 
'The Louvre is the world''s largest art museum, housing over 35,000 works including the Mona Lisa. Visit early morning or late afternoon to avoid crowds. The Musée d''Orsay showcases Impressionist masterpieces in a converted railway station. Don''t miss smaller gems like Musée Rodin with its sculpture garden. Consider a Museum Pass for skip-the-line access to major attractions.',
'attractions', ARRAY['museums', 'art', 'culture'], 'en', TRUE, 4.8),

('Paris, France', 'Paris', 'France', 'Vegetarian Dining in Le Marais',
'Le Marais offers excellent vegetarian options. Try Wild & The Moon for organic smoothie bowls and plant-based meals. Cafe Pinson serves creative vegetarian cuisine in a cozy setting. Hank Burger has delicious vegan burgers. Gentle Gourmet offers upscale vegan French cuisine. Reserve ahead for dinner at popular spots.',
'restaurants', ARRAY['vegetarian', 'food', 'dining', 'le marais'], 'en', TRUE, 4.5),

('Tokyo, Japan', 'Tokyo', 'Japan', 'Budget-Friendly Tokyo Accommodation',
'Capsule hotels offer clean, safe budget stays from $30-50/night. Book the Cube locations in Shibuya or Asakusa. Business hotels like Tokyu Stay provide small rooms with kitchenettes around $60-80/night. Hostels like Nui in Kuramae combine dorm beds with social spaces. Stay in Asakusa or Ueno for lower prices and easy metro access.',
'hotels', ARRAY['budget', 'accommodation', 'capsule hotels'], 'en', TRUE, 4.6),

('Tokyo, Japan', 'Tokyo', 'Japan', 'Tokyo Public Transportation Guide',
'Purchase a Suica or Pasmo IC card for seamless travel on trains, subways and buses. Tokyo Metro and JR lines cover most areas. Download the Japan Transit Planner app for routes. Avoid rush hours (7:30-9:30am, 5:30-7:30pm). Day passes save money if making 4+ trips. Last trains run around midnight.',
'transportation', ARRAY['metro', 'public transport', 'getting around'], 'en', TRUE, 4.9),

('Rome, Italy', 'Rome', 'Italy', 'Hidden Gems Beyond the Colosseum',
'Escape crowds at Basilica di San Clemente, a church built in layers revealing 2000 years of history. Aventine Keyhole offers a secret view of St. Peter''s dome. Explore Trastevere neighborhood for authentic trattorias and medieval streets. Visit the Protestant Cemetery, a peaceful oasis. The Appian Way provides ancient Roman atmosphere away from tourists.',
'attractions', ARRAY['hidden gems', 'off the beaten path', 'local'], 'en', TRUE, 4.7),

('Barcelona, Spain', 'Barcelona', 'Spain', 'Gaudí Architecture Tour',
'Start at Sagrada Familia (book timed entry 2-3 months ahead). Park Güell offers mosaic works and city views (also requires booking). Casa Batlló and Casa Milà (La Pedrera) showcase Gaudí''s residential genius on Passeig de Gràcia. Visit Palau Güell in El Raval. Allow 3-4 hours per major site. Buy combined tickets for savings.',
'attractions', ARRAY['architecture', 'gaudi', 'modernisme'], 'en', TRUE, 4.8),

('London, United Kingdom', 'London', 'United Kingdom', 'Free Activities in London',
'Many world-class museums are free: British Museum, National Gallery, Tate Modern, Natural History Museum, V&A. Walk the South Bank for Thames views and street performers. Visit Parliament Square and Westminster Abbey exterior. Explore markets like Borough, Camden or Portobello Road. Watch Changing of the Guard at Buckingham Palace (11am most days).',
'attractions', ARRAY['free', 'budget', 'museums'], 'en', TRUE, 4.7),

('Dubai, United Arab Emirates', 'Dubai', 'Dubai', 'Dubai Shopping Guide',
'Dubai Mall is the world''s largest with 1200+ stores, an aquarium and ice rink. Visit Mall of the Emirates for ski slope. Traditional souks offer gold, spices and textiles in Deira. Dubai Marina Mall has waterfront dining. The Dubai Fountain show runs every 30 minutes evening. Friday-Saturday are busiest. Many malls open 10am-midnight.',
'activities', ARRAY['shopping', 'malls', 'souks'], 'en', TRUE, 4.5),

('New York, United States', 'New York', 'United States', 'NYC Neighborhood Guide',
'Manhattan: Times Square (touristy but iconic), SoHo (shopping/art), Greenwich Village (bohemian), Upper West Side (cultural). Brooklyn: Williamsburg (hipster), DUMBO (Instagram views), Park Slope (family-friendly). Queens: Astoria (Greek food), Flushing (Asian cuisine). Use subway to explore. Each neighborhood has distinct character and cuisine.',
'general', ARRAY['neighborhoods', 'planning', 'areas'], 'en', TRUE, 4.6),

('Amsterdam, Netherlands', 'Amsterdam', 'Netherlands', 'Cycling Like a Local',
'Rent bikes from MacBike or Black Bikes (€10-15/day). Follow bike lane rules: stay right, signal turns, watch for trams. Lock bikes securely (use two locks). Explore Jordaan, Nine Streets, or ride to Vondelpark. Avoid cycling in Red Light District crowds. Bike ferries are free across IJ river. Return rentals by closing time to avoid extra charges.',
'transportation', ARRAY['cycling', 'bikes', 'local tips'], 'en', TRUE, 4.8)
ON CONFLICT DO NOTHING;

-- Seed popular attractions
INSERT INTO attractions (name, city_id, category, subcategory, address, latitude, longitude, description, average_visit_duration, estimated_cost, rating, popularity_score) 
SELECT 
    'Eiffel Tower',
    c.id,
    'landmark',
    'monument',
    'Champ de Mars, 5 Avenue Anatole France, 75007 Paris',
    48.8584,
    2.2945,
    'Iconic iron lattice tower and symbol of Paris, offering panoramic city views from multiple levels',
    120,
    25.00,
    4.6,
    100
FROM cities c WHERE c.name = 'Paris' AND c.country_code = 'FR'
UNION ALL
SELECT 
    'Louvre Museum',
    c.id,
    'museum',
    'art',
    'Rue de Rivoli, 75001 Paris',
    48.8606,
    2.3376,
    'World''s largest art museum housing 35,000+ works including Mona Lisa and Venus de Milo',
    240,
    17.00,
    4.7,
    98
FROM cities c WHERE c.name = 'Paris' AND c.country_code = 'FR'
UNION ALL
SELECT 
    'British Museum',
    c.id,
    'museum',
    'history',
    'Great Russell St, London WC1B 3DG',
    51.5194,
    -0.1270,
    'World history museum with vast collection including Rosetta Stone and Egyptian mummies. Free entry.',
    180,
    0.00,
    4.7,
    95
FROM cities c WHERE c.name = 'London' AND c.country_code = 'GB'
UNION ALL
SELECT 
    'Colosseum',
    c.id,
    'landmark',
    'historical',
    'Piazza del Colosseo, 1, 00184 Roma',
    41.8902,
    12.4922,
    'Ancient Roman amphitheater, iconic symbol of Imperial Rome and gladiatorial contests',
    90,
    16.00,
    4.6,
    99
FROM cities c WHERE c.name = 'Rome' AND c.country_code = 'IT'
UNION ALL
SELECT 
    'Sagrada Familia',
    c.id,
    'landmark',
    'religious',
    'Carrer de Mallorca, 401, 08013 Barcelona',
    41.4036,
    2.1744,
    'Gaudí''s unfinished masterpiece basilica, combining Gothic and Art Nouveau forms',
    90,
    26.00,
    4.7,
    97
FROM cities c WHERE c.name = 'Barcelona' AND c.country_code = 'ES'
UNION ALL
SELECT 
    'Statue of Liberty',
    c.id,
    'landmark',
    'monument',
    'Liberty Island, New York, NY 10004',
    40.6892,
    -74.0445,
    'Iconic symbol of freedom and democracy, gift from France, accessible by ferry',
    180,
    23.00,
    4.6,
    96
FROM cities c WHERE c.name = 'New York' AND c.country_code = 'US'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- MATERIALIZED VIEWS (For performance - refresh periodically)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Popular Destinations Ranking
-- ----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW popular_destinations AS
SELECT 
    c.id AS city_id,
    c.name AS city_name,
    c.country_code,
    co.name AS country_name,
    COUNT(DISTINCT t.id) AS trip_count,
    COUNT(DISTINCT t.user_id) AS unique_travelers,
    AVG(tr.overall_rating) AS average_rating,
    c.popularity_score
FROM cities c
JOIN countries co ON c.country_code = co.country_code
LEFT JOIN trips t ON t.destinations @> jsonb_build_array(jsonb_build_object('city', c.name))
LEFT JOIN trip_reviews tr ON t.id = tr.trip_id
WHERE t.created_at > NOW() - INTERVAL '1 year' OR t.id IS NULL
GROUP BY c.id, c.name, c.country_code, co.name, c.popularity_score
ORDER BY trip_count DESC, c.popularity_score DESC;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX ON popular_destinations (city_id);

-- ----------------------------------------------------------------------------
-- Agent Performance Summary
-- ----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW agent_performance_summary AS
SELECT 
    agent_type,
    DATE_TRUNC('day', started_at) AS date,
    COUNT(*) AS total_runs,
    COUNT(*) FILTER (WHERE execution_status = 'completed') AS successful_runs,
    COUNT(*) FILTER (WHERE execution_status = 'failed') AS failed_runs,
    ROUND(100.0 * COUNT(*) FILTER (WHERE execution_status = 'completed') / NULLIF(COUNT(*), 0), 2) AS success_rate,
    ROUND(AVG(duration_ms), 2) AS avg_duration_ms,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms), 2) AS median_duration_ms,
    ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms), 2) AS p95_duration_ms,
    SUM((token_usage->>'total_tokens')::INTEGER) AS total_tokens,
    ROUND(SUM(cost_usd), 4) AS total_cost_usd
FROM agent_runs
WHERE started_at > NOW() - INTERVAL '30 days'
GROUP BY agent_type, DATE_TRUNC('day', started_at);

CREATE UNIQUE INDEX ON agent_performance_summary (agent_type, date);

-- ----------------------------------------------------------------------------
-- Daily Revenue Summary
-- ----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW daily_revenue_summary AS
SELECT 
    DATE_TRUNC('day', created_at) AS date,
    COUNT(*) AS total_payments,
    COUNT(*) FILTER (WHERE status = 'succeeded') AS successful_payments,
    COUNT(*) FILTER (WHERE status = 'failed') AS failed_payments,
    SUM(amount) FILTER (WHERE status = 'succeeded') AS total_revenue,
    AVG(amount) FILTER (WHERE status = 'succeeded') AS average_transaction,
    COUNT(DISTINCT user_id) AS unique_customers,
    COUNT(DISTINCT trip_id) AS unique_trips
FROM payments
WHERE created_at > NOW() - INTERVAL '1 year'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

CREATE UNIQUE INDEX ON daily_revenue_summary (date);

-- ============================================================================
-- SCHEDULED JOBS (Using pg_cron extension if available)
-- ============================================================================

-- Note: pg_cron needs to be enabled in Supabase dashboard
-- These are example scheduled tasks

-- Refresh materialized views daily at 2 AM
-- SELECT cron.schedule('refresh-popular-destinations', '0 2 * * *', 
--     'REFRESH MATERIALIZED VIEW CONCURRENTLY popular_destinations');

-- SELECT cron.schedule('refresh-agent-performance', '0 2 * * *', 
--     'REFRESH MATERIALIZED VIEW CONCURRENTLY agent_performance_summary');

-- SELECT cron.schedule('refresh-revenue-summary', '0 3 * * *', 
--     'REFRESH MATERIALIZED VIEW CONCURRENTLY daily_revenue_summary');

-- Clean up expired search cache daily at 3 AM
-- SELECT cron.schedule('cleanup-search-cache', '0 3 * * *', 
--     'DELETE FROM search_cache WHERE is_expired = TRUE AND created_at < NOW() - INTERVAL ''7 days''');

-- Clean up old activity logs monthly
-- SELECT cron.schedule('cleanup-activity-logs', '0 4 1 * *', 
--     'DELETE FROM user_activity_logs WHERE created_at < NOW() - INTERVAL ''6 months''');

-- ============================================================================
-- HELPER FUNCTIONS FOR APPLICATION LAYER
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Check if user can book trip (has payment method, verified email, etc.)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION can_user_book_trip(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE
AS $$
DECLARE
    user_record RECORD;
BEGIN
    SELECT 
        email_verified,
        status
    INTO user_record
    FROM users
    WHERE id = target_user_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check if user is active and email verified
    IF user_record.status != 'active' OR user_record.email_verified = FALSE THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$;

-- ----------------------------------------------------------------------------
-- Get trip progress percentage
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_trip_progress(trip_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql STABLE
AS $$
DECLARE
    progress INTEGER := 0;
    has_flights BOOLEAN;
    has_hotels BOOLEAN;
    has_itinerary BOOLEAN;
    has_payment BOOLEAN;
BEGIN
    SELECT 
        EXISTS(SELECT 1 FROM bookings WHERE trip_id = trip_id_param AND booking_type = 'flight' AND status = 'confirmed'),
        EXISTS(SELECT 1 FROM bookings WHERE trip_id = trip_id_param AND booking_type = 'hotel' AND status = 'confirmed'),
        (SELECT itinerary IS NOT NULL FROM trips WHERE id = trip_id_param),
        EXISTS(SELECT 1 FROM payments WHERE trip_id = trip_id_param AND status = 'succeeded')
    INTO has_flights, has_hotels, has_itinerary, has_payment;
    
    IF has_flights THEN progress := progress + 25; END IF;
    IF has_hotels THEN progress := progress + 25; END IF;
    IF has_itinerary THEN progress := progress + 25; END IF;
    IF has_payment THEN progress := progress + 25; END IF;
    
    RETURN progress;
END;
$$;

-- ----------------------------------------------------------------------------
-- Soft delete user (GDPR compliance)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION soft_delete_user(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    -- Mark user as deleted
    UPDATE users
    SET 
        status = 'deleted',
        deleted_at = NOW(),
        email = 'deleted_' || id || '@deleted.com',
        full_name = 'Deleted User',
        phone_number = NULL,
        avatar_url = NULL,
        bio = NULL
    WHERE id = target_user_id;
    
    -- Anonymize user activity logs
    UPDATE user_activity_logs
    SET user_id = NULL
    WHERE user_id = target_user_id;
    
    -- Keep financial records but anonymize personal data
    -- (Required for tax/legal compliance)
    
    RETURN TRUE;
END;
$$;

-- ----------------------------------------------------------------------------
-- Calculate recommendation score for destination
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_destination_score(
    target_user_id UUID,
    destination_name TEXT
)
RETURNS DECIMAL(5, 2)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
    base_score DECIMAL(5, 2);
    preference_boost DECIMAL(5, 2) := 0;
    history_boost DECIMAL(5, 2) := 0;
BEGIN
    -- Get base popularity score
    SELECT popularity_score INTO base_score
    FROM cities
    WHERE name = destination_name
    LIMIT 1;
    
    IF base_score IS NULL THEN
        base_score := 50; -- Default score
    END IF;
    
    -- Boost based on user preferences
    -- (Check if destination matches user interests)
    SELECT COALESCE(COUNT(*) * 5, 0) INTO preference_boost
    FROM user_preferences up, cities c
    WHERE up.user_id = target_user_id
        AND c.name = destination_name
        AND up.interests && ARRAY['culture', 'art', 'history']; -- Example matching
    
    -- Boost based on similar past trips
    SELECT COALESCE(COUNT(*) * 10, 0) INTO history_boost
    FROM user_travel_history uth
    WHERE uth.user_id = target_user_id
        AND uth.rating >= 4
        AND uth.destination ILIKE '%' || destination_name || '%';
    
    RETURN LEAST(base_score + preference_boost + history_boost, 100.0);
END;
$$;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE users IS 'Core user accounts, extends Supabase auth.users';
COMMENT ON TABLE user_preferences IS 'User travel preferences for personalization and RAG';
COMMENT ON TABLE conversations IS 'Chat sessions between users and AI';
COMMENT ON TABLE messages IS 'Individual messages within conversations';
COMMENT ON TABLE trips IS 'Main trip records with itineraries and bookings';
COMMENT ON TABLE bookings IS 'Individual bookings (flights, hotels, activities) within trips';
COMMENT ON TABLE payments IS 'Payment transactions via Stripe';
COMMENT ON TABLE agent_runs IS 'LangChain agent execution logs for observability';
COMMENT ON TABLE tool_calls IS 'Detailed logs of individual tool invocations by agents';
COMMENT ON TABLE travel_guides IS 'Static knowledge base for RAG retrieval';
COMMENT ON TABLE user_travel_history IS 'Past trip data used for learning user preferences';
COMMENT ON TABLE search_cache IS 'Cache for expensive API calls (Amadeus, Booking.com)';
COMMENT ON TABLE notifications IS 'In-app and email notifications';
COMMENT ON TABLE airports IS 'Reference data for flight searches';
COMMENT ON TABLE cities IS 'Popular travel destinations';
COMMENT ON TABLE attractions IS 'Points of interest for itinerary generation';

-- ============================================================================
-- GRANT PERMISSIONS (Supabase handles this automatically via RLS)
-- ============================================================================

-- Service role has full access
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Authenticated users have access based on RLS policies
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Anonymous users can only read reference data
GRANT SELECT ON airports, countries, cities, attractions, travel_guides TO anon;

-- ============================================================================
-- VERIFICATION QUERIES (Run these to verify schema installation)
-- ============================================================================

-- Check all tables are created
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check all indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Check all views
SELECT 
    schemaname,
    viewname,
    viewowner
FROM pg_views 
WHERE schemaname = 'public'
ORDER BY viewname;

-- Check all functions
SELECT 
    n.nspname AS schema,
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY function_name;

-- Check all triggers
SELECT 
    event_object_table AS table_name,
    trigger_name,
    event_manipulation AS trigger_event,
    action_timing AS trigger_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check vector extension and dimensions
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.udt_name
FROM information_schema.columns c
JOIN information_schema.tables t ON c.table_name = t.table_name
WHERE c.data_type = 'USER-DEFINED' 
    AND c.udt_name = 'vector'
    AND t.table_schema = 'public';

-- Count records in reference tables
SELECT 'airports' AS table_name, COUNT(*) AS record_count FROM airports
UNION ALL
SELECT 'countries', COUNT(*) FROM countries
UNION ALL
SELECT 'cities', COUNT(*) FROM cities
UNION ALL
SELECT 'attractions', COUNT(*) FROM attractions
UNION ALL
SELECT 'travel_guides', COUNT(*) FROM travel_guides;

-- ============================================================================
-- SAMPLE DATA FOR TESTING (Optional)
-- ============================================================================

-- Note: Replace with actual UUIDs after creating a test user via Supabase Auth
-- This section demonstrates the data structure for testing

/*
-- Example: Insert test user preferences
INSERT INTO user_preferences (
    user_id,
    travel_style,
    travel_pace,
    accommodation_preference,
    interests,
    dietary_preferences,
    typical_daily_budget_min,
    typical_daily_budget_max,
    preferred_airlines,
    seat_preference,
    preferred_flight_class,
    preference_text
) VALUES (
    'YOUR_USER_UUID_HERE', -- Replace with actual user UUID
    ARRAY['cultural', 'adventure']::travel_style[],
    'moderate',
    'moderate',
    ARRAY['museums', 'hiking', 'local_food', 'photography'],
    ARRAY['vegetarian']::dietary_preference[],
    100.00,
    200.00,
    ARRAY['Air France', 'Delta'],
    'window',
    'economy',
    'I love exploring museums and local cuisine. I prefer moderate-paced travel with a mix of planned activities and spontaneous exploration. Budget-conscious but willing to splurge on unique experiences.'
);

-- Example: Create a test conversation
INSERT INTO conversations (
    user_id,
    title,
    is_active
) VALUES (
    'YOUR_USER_UUID_HERE',
    'Planning Paris Trip',
    TRUE
) RETURNING id;

-- Example: Insert test messages
INSERT INTO messages (
    conversation_id,
    role,
    content,
    agent_type
) VALUES 
(
    'YOUR_CONVERSATION_UUID_HERE',
    'user',
    'I want to plan a 5-day trip to Paris in June with a budget of $3000',
    NULL
),
(
    'YOUR_CONVERSATION_UUID_HERE',
    'assistant',
    'I''d be happy to help you plan your Paris trip! Let me search for flights and hotels that fit your budget and preferences.',
    'planner'
);

-- Example: Create a test trip
INSERT INTO trips (
    user_id,
    conversation_id,
    title,
    description,
    destinations,
    start_date,
    end_date,
    trip_type,
    number_of_travelers,
    estimated_budget,
    currency,
    status
) VALUES (
    'YOUR_USER_UUID_HERE',
    'YOUR_CONVERSATION_UUID_HERE',
    'Paris Adventure - 5 Days',
    'Cultural exploration of Paris with focus on museums, local cuisine, and hidden gems',
    jsonb_build_array(
        jsonb_build_object(
            'city', 'Paris',
            'country', 'France',
            'iata', 'CDG'
        )
    ),
    '2025-06-15',
    '2025-06-20',
    'cultural',
    1,
    3000.00,
    'USD',
    'planning'
) RETURNING id;

-- Example: Create test bookings
INSERT INTO bookings (
    trip_id,
    user_id,
    booking_type,
    provider,
    details,
    price,
    currency,
    status
) VALUES 
(
    'YOUR_TRIP_UUID_HERE',
    'YOUR_USER_UUID_HERE',
    'flight',
    'Amadeus',
    jsonb_build_object(
        'origin', 'JFK',
        'destination', 'CDG',
        'departure', '2025-06-15T10:00:00Z',
        'arrival', '2025-06-15T22:30:00Z',
        'airline', 'Air France',
        'flight_number', 'AF007',
        'cabin_class', 'economy',
        'baggage', '1 checked bag included'
    ),
    650.00,
    'USD',
    'held'
),
(
    'YOUR_TRIP_UUID_HERE',
    'YOUR_USER_UUID_HERE',
    'hotel',
    'Booking.com',
    jsonb_build_object(
        'hotel_name', 'Hotel Le Marais',
        'address', '123 Rue de Rivoli, 75004 Paris',
        'checkin', '2025-06-15',
        'checkout', '2025-06-20',
        'room_type', 'Deluxe Double Room',
        'guests', 1,
        'amenities', ARRAY['WiFi', 'Breakfast', 'Air Conditioning']
    ),
    900.00,
    'USD',
    'held'
);

-- Example: Create agent run log
INSERT INTO agent_runs (
    conversation_id,
    user_id,
    agent_type,
    agent_name,
    execution_status,
    input,
    output,
    context,
    tools_called,
    duration_ms,
    token_usage,
    cost_usd
) VALUES (
    'YOUR_CONVERSATION_UUID_HERE',
    'YOUR_USER_UUID_HERE',
    'flight',
    'FlightSearchAgent',
    'completed',
    jsonb_build_object(
        'origin', 'JFK',
        'destination', 'CDG',
        'departure_date', '2025-06-15',
        'return_date', '2025-06-20',
        'passengers', 1,
        'cabin_class', 'economy'
    ),
    jsonb_build_object(
        'flights_found', 5,
        'best_price', 650.00,
        'recommendations', jsonb_build_array(
            jsonb_build_object(
                'airline', 'Air France',
                'price', 650.00,
                'duration', '7h 30m',
                'stops', 0
            )
        )
    ),
    jsonb_build_object(
        'user_preferences', jsonb_build_object(
            'preferred_airlines', ARRAY['Air France', 'Delta'],
            'seat_preference', 'window'
        )
    ),
    jsonb_build_array(
        jsonb_build_object(
            'tool', 'amadeus_flight_search',
            'input', jsonb_build_object('origin', 'JFK', 'destination', 'CDG'),
            'output', jsonb_build_object('results_count', 50),
            'duration_ms', 1234
        )
    ),
    2500,
    jsonb_build_object(
        'prompt_tokens', 1500,
        'completion_tokens', 800,
        'total_tokens', 2300
    ),
    0.0460
);
*/

-- ============================================================================
-- MONITORING QUERIES (Use these for observability)
-- ============================================================================

-- Check database size
SELECT 
    pg_size_pretty(pg_database_size(current_database())) AS database_size;

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check most active users (last 30 days)
SELECT 
    u.id,
    u.full_name,
    u.email,
    COUNT(DISTINCT c.id) AS conversation_count,
    COUNT(DISTINCT t.id) AS trip_count,
    COUNT(DISTINCT m.id) AS message_count,
    MAX(ual.created_at) AS last_activity
FROM users u
LEFT JOIN conversations c ON u.id = c.user_id
LEFT JOIN trips t ON u.id = t.user_id
LEFT JOIN messages m ON c.id = m.conversation_id AND m.role = 'user'
LEFT JOIN user_activity_logs ual ON u.id = ual.user_id
WHERE ual.created_at > NOW() - INTERVAL '30 days' OR ual.created_at IS NULL
GROUP BY u.id, u.full_name, u.email
ORDER BY message_count DESC
LIMIT 20;

-- Check agent performance (last 7 days)
SELECT 
    agent_type,
    COUNT(*) AS total_runs,
    COUNT(*) FILTER (WHERE execution_status = 'completed') AS successful,
    COUNT(*) FILTER (WHERE execution_status = 'failed') AS failed,
    ROUND(AVG(duration_ms), 2) AS avg_duration_ms,
    ROUND(SUM(cost_usd), 4) AS total_cost_usd
FROM agent_runs
WHERE started_at > NOW() - INTERVAL '7 days'
GROUP BY agent_type
ORDER BY total_runs DESC;

-- Check conversion funnel
SELECT 
    'Total Users' AS stage,
    COUNT(DISTINCT id) AS count,
    100.0 AS percentage
FROM users
WHERE status = 'active'

UNION ALL

SELECT 
    'Started Conversation',
    COUNT(DISTINCT user_id),
    ROUND(100.0 * COUNT(DISTINCT user_id) / (SELECT COUNT(*) FROM users WHERE status = 'active'), 2)
FROM conversations

UNION ALL

SELECT 
    'Created Trip',
    COUNT(DISTINCT user_id),
    ROUND(100.0 * COUNT(DISTINCT user_id) / (SELECT COUNT(*) FROM users WHERE status = 'active'), 2)
FROM trips

UNION ALL

SELECT 
    'Made Payment',
    COUNT(DISTINCT user_id),
    ROUND(100.0 * COUNT(DISTINCT user_id) / (SELECT COUNT(*) FROM users WHERE status = 'active'), 2)
FROM payments
WHERE status = 'succeeded'

UNION ALL

SELECT 
    'Completed Trip',
    COUNT(DISTINCT user_id),
    ROUND(100.0 * COUNT(DISTINCT user_id) / (SELECT COUNT(*) FROM users WHERE status = 'active'), 2)
FROM trips
WHERE status = 'completed';

-- Check API usage and costs (last 7 days)
SELECT 
    api_provider,
    COUNT(*) AS request_count,
    COUNT(*) FILTER (WHERE success = TRUE) AS successful_requests,
    COUNT(*) FILTER (WHERE success = FALSE) AS failed_requests,
    ROUND(AVG(response_time_ms), 2) AS avg_response_time_ms,
    ROUND(SUM(cost_usd), 4) AS total_cost_usd
FROM api_usage_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY api_provider
ORDER BY total_cost_usd DESC;

-- Check error rate by type (last 24 hours)
SELECT 
    error_type,
    severity,
    COUNT(*) AS error_count,
    COUNT(*) FILTER (WHERE resolved = TRUE) AS resolved_count
FROM error_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY error_type, severity
ORDER BY error_count DESC;

-- Check cache hit rate
SELECT 
    search_type,
    COUNT(*) AS total_searches,
    SUM(hit_count) AS total_hits,
    ROUND(100.0 * SUM(hit_count) / NULLIF(COUNT(*), 0), 2) AS cache_hit_rate_percent
FROM search_cache
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY search_type;

-- Check revenue by day (last 30 days)
SELECT 
    DATE(created_at) AS date,
    COUNT(*) AS payment_count,
    SUM(amount) FILTER (WHERE status = 'succeeded') AS daily_revenue,
    COUNT(DISTINCT user_id) AS unique_customers
FROM payments
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Check popular destinations (last 90 days)
SELECT 
    destinations->0->>'city' AS city,
    destinations->0->>'country' AS country,
    COUNT(*) AS trip_count,
    COUNT(DISTINCT user_id) AS unique_travelers,
    AVG((SELECT overall_rating FROM trip_reviews WHERE trip_id = trips.id)) AS avg_rating
FROM trips
WHERE created_at > NOW() - INTERVAL '90 days'
    AND destinations IS NOT NULL
GROUP BY destinations->0->>'city', destinations->0->>'country'
ORDER BY trip_count DESC
LIMIT 20;

-- ============================================================================
-- BACKUP AND MAINTENANCE QUERIES
-- ============================================================================

-- Vacuum analyze all tables (run periodically for performance)
-- VACUUM ANALYZE;

-- Reindex all tables (if experiencing slow queries)
-- REINDEX DATABASE your_database_name;

-- Check for missing indexes (slow queries)
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE schemaname = 'public'
    AND n_distinct > 100
    AND correlation < 0.1
ORDER BY n_distinct DESC;

-- Check for bloat in tables
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    n_live_tup AS live_tuples,
    n_dead_tup AS dead_tuples,
    ROUND(100 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_tuple_percent
FROM pg_stat_user_tables
WHERE schemaname = 'public'
    AND n_dead_tup > 1000
ORDER BY n_dead_tup DESC;

-- ============================================================================
-- SECURITY CHECKS
-- ============================================================================

-- Check RLS is enabled on all user tables
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'users', 'user_preferences', 'conversations', 'messages', 
        'trips', 'bookings', 'payments', 'notifications'
    );

-- Check for tables without RLS policies
SELECT 
    t.schemaname,
    t.tablename
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename
WHERE t.schemaname = 'public'
    AND t.rowsecurity = TRUE
    AND p.policyname IS NULL;

-- ============================================================================
-- CLEANUP QUERIES (Run periodically)
-- ============================================================================

-- Clean up expired cache entries
-- DELETE FROM search_cache 
-- WHERE is_expired = TRUE 
--     AND created_at < NOW() - INTERVAL '7 days';

-- Clean up old activity logs (keep 6 months)
-- DELETE FROM user_activity_logs 
-- WHERE created_at < NOW() - INTERVAL '6 months';

-- Clean up old error logs that are resolved (keep 3 months)
-- DELETE FROM error_logs 
-- WHERE resolved = TRUE 
--     AND created_at < NOW() - INTERVAL '3 months';

-- Clean up old notifications (keep 1 year)
-- DELETE FROM notifications 
-- WHERE created_at < NOW() - INTERVAL '1 year';

-- Archive completed trips older than 2 years
-- (Move to separate archive table or export to cold storage)

-- ============================================================================
-- PERFORMANCE OPTIMIZATION TIPS
-- ============================================================================

/*
1. INDEXES:
   - Created comprehensive indexes on foreign keys, status fields, and date columns
   - Vector indexes (ivfflat) for RAG similarity search
   - GIN indexes for JSONB columns and full-text search
   - Composite indexes for common query patterns

2. PARTITIONING (for large tables):
   - Consider partitioning user_activity_logs by month
   - Consider partitioning agent_runs by week
   - Use declarative partitioning in PostgreSQL 12+

3. CACHING:
   - Use Redis for session data
   - Cache API responses in search_cache table
   - Use materialized views for analytics queries

4. QUERY OPTIMIZATION:
   - Use EXPLAIN ANALYZE for slow queries
   - Avoid SELECT * - only query needed columns
   - Use prepared statements in application code
   - Batch insert operations when possible

5. CONNECTION POOLING:
   - Use pgBouncer or Supabase's built-in pooling
   - Set appropriate pool size based on load

6. MONITORING:
   - Set up alerts for slow queries (> 1s)
   - Monitor database size and growth rate
   - Track cache hit rates
   - Monitor connection count

7. BACKUP STRATEGY:
   - Supabase handles automated backups
   - Export critical data regularly
   - Test restoration procedures

8. SECURITY:
   - All RLS policies are in place
   - Use parameterized queries to prevent SQL injection
   - Regularly audit user permissions
   - Encrypt sensitive data at rest
*/

-- ============================================================================
-- SCHEMA VERSION TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS schema_version (
    id INTEGER PRIMARY KEY DEFAULT 1,
    version TEXT NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    description TEXT,
    CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO schema_version (version, description) 
VALUES ('1.0.0', 'Initial comprehensive schema for ORBIS AI')
ON CONFLICT (id) DO UPDATE 
SET version = EXCLUDED.version,
    applied_at = NOW(),
    description = EXCLUDED.description;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================

-- Verify schema version
SELECT * FROM schema_version;

-- Final verification: Count all database objects
SELECT 
    'Tables' AS object_type, 
    COUNT(*) AS count 
FROM pg_tables 
WHERE schemaname = 'public'

UNION ALL

SELECT 
    'Views', 
    COUNT(*) 
FROM pg_views 
WHERE schemaname = 'public'

UNION ALL

SELECT 
    'Materialized Views', 
    COUNT(*) 
FROM pg_matviews 
WHERE schemaname = 'public'

UNION ALL

SELECT 
    'Functions', 
    COUNT(*) 
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'

UNION ALL

SELECT 
    'Triggers', 
    COUNT(DISTINCT trigger_name) 
FROM information_schema.triggers
WHERE trigger_schema = 'public'

UNION ALL

SELECT 
    'Indexes', 
    COUNT(*) 
FROM pg_indexes 
WHERE schemaname = 'public'

UNION ALL

SELECT 
    'RLS Policies', 
    COUNT(*) 
FROM pg_policies
WHERE schemaname = 'public';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ORBIS AI Database Schema Installation Complete!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Schema Version: 1.0.0';
    RAISE NOTICE 'Installation Date: %', NOW();
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Enable pgvector extension in Supabase dashboard';
    RAISE NOTICE '2. Set up authentication in Supabase';
    RAISE NOTICE '3. Configure environment variables in your application';
    RAISE NOTICE '4. Run seed data scripts for testing';
    RAISE NOTICE '5. Test RLS policies with different user roles';
    RAISE NOTICE '6. Set up monitoring and alerts';
    RAISE NOTICE '========================================';
END $$;