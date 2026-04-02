
\restrict rAHYzX5K4VnhYWne53POmwmEUCsf8hPeVn3tkGIRNK5NbrvgdRjAIhQozKa1UJv


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";






CREATE TYPE "public"."accommodation_preference" AS ENUM (
    'budget',
    'moderate',
    'luxury',
    'boutique',
    'hostel'
);


ALTER TYPE "public"."accommodation_preference" OWNER TO "postgres";


CREATE TYPE "public"."agent_execution_status" AS ENUM (
    'pending',
    'running',
    'completed',
    'failed',
    'retrying'
);


ALTER TYPE "public"."agent_execution_status" OWNER TO "postgres";


CREATE TYPE "public"."agent_type" AS ENUM (
    'planner',
    'flight',
    'hotel',
    'itinerary',
    'booking',
    'verifier',
    'orchestrator'
);


ALTER TYPE "public"."agent_type" OWNER TO "postgres";


CREATE TYPE "public"."booking_status" AS ENUM (
    'searching',
    'held',
    'payment_pending',
    'confirmed',
    'cancelled',
    'refunded',
    'failed'
);


ALTER TYPE "public"."booking_status" OWNER TO "postgres";


CREATE TYPE "public"."booking_type" AS ENUM (
    'flight',
    'hotel',
    'car_rental',
    'activity',
    'transfer',
    'insurance'
);


ALTER TYPE "public"."booking_type" OWNER TO "postgres";


CREATE TYPE "public"."dietary_preference" AS ENUM (
    'none',
    'vegetarian',
    'vegan',
    'halal',
    'kosher',
    'gluten_free'
);


ALTER TYPE "public"."dietary_preference" OWNER TO "postgres";


CREATE TYPE "public"."message_role" AS ENUM (
    'user',
    'assistant',
    'system',
    'tool',
    'function'
);


ALTER TYPE "public"."message_role" OWNER TO "postgres";


CREATE TYPE "public"."notification_status" AS ENUM (
    'pending',
    'sent',
    'delivered',
    'failed',
    'read'
);


ALTER TYPE "public"."notification_status" OWNER TO "postgres";


CREATE TYPE "public"."notification_type" AS ENUM (
    'booking_confirmation',
    'payment_receipt',
    'trip_reminder',
    'flight_change',
    'hotel_change',
    'cancellation',
    'itinerary_update',
    'price_alert'
);


ALTER TYPE "public"."notification_type" OWNER TO "postgres";


CREATE TYPE "public"."payment_method" AS ENUM (
    'stripe',
    'paypal',
    'credit_card',
    'debit_card',
    'bank_transfer'
);


ALTER TYPE "public"."payment_method" OWNER TO "postgres";


CREATE TYPE "public"."payment_status" AS ENUM (
    'pending',
    'processing',
    'succeeded',
    'failed',
    'refunded',
    'partially_refunded'
);


ALTER TYPE "public"."payment_status" OWNER TO "postgres";


CREATE TYPE "public"."travel_pace" AS ENUM (
    'relaxed',
    'moderate',
    'fast_paced'
);


ALTER TYPE "public"."travel_pace" OWNER TO "postgres";


CREATE TYPE "public"."travel_style" AS ENUM (
    'adventure',
    'cultural',
    'relaxation',
    'business',
    'family',
    'romantic',
    'solo'
);


ALTER TYPE "public"."travel_style" OWNER TO "postgres";


CREATE TYPE "public"."trip_status" AS ENUM (
    'planning',
    'options_held',
    'payment_pending',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."trip_status" OWNER TO "postgres";


CREATE TYPE "public"."user_status" AS ENUM (
    'active',
    'suspended',
    'deleted'
);


ALTER TYPE "public"."user_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_generate_trip_title"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."auto_generate_trip_title"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_destination_score"("target_user_id" "uuid", "destination_name" "text") RETURNS numeric
    LANGUAGE "plpgsql" STABLE
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


ALTER FUNCTION "public"."calculate_destination_score"("target_user_id" "uuid", "destination_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_trip_cost"("trip_id_param" "uuid") RETURNS TABLE("total_cost" numeric, "flight_cost" numeric, "hotel_cost" numeric, "activity_cost" numeric, "other_cost" numeric)
    LANGUAGE "sql" STABLE
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


ALTER FUNCTION "public"."calculate_trip_cost"("trip_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_user_book_trip"("target_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE
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


ALTER FUNCTION "public"."can_user_book_trip"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_booking_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."create_booking_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."find_similar_trips"("target_user_id" "uuid", "destination_query" "text", "match_count" integer DEFAULT 5) RETURNS TABLE("trip_id" "uuid", "title" "text", "destination" "text", "start_date" "date", "rating" integer, "similarity_score" double precision)
    LANGUAGE "plpgsql" STABLE
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


ALTER FUNCTION "public"."find_similar_trips"("target_user_id" "uuid", "destination_query" "text", "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_trip_progress"("trip_id_param" "uuid") RETURNS integer
    LANGUAGE "plpgsql" STABLE
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


ALTER FUNCTION "public"."get_trip_progress"("trip_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_travel_profile"("target_user_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" STABLE
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


ALTER FUNCTION "public"."get_user_travel_profile"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, email_verified, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.email_confirmed_at IS NOT NULL,
        NEW.created_at,
        NEW.updated_at
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        email_verified = EXCLUDED.email_verified,
        updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_user_updated"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    UPDATE public.users SET
        email_verified = NEW.email_confirmed_at IS NOT NULL,
        updated_at = NOW()
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_user_updated"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_travel_guides"("query_embedding" "public"."vector", "match_threshold" double precision DEFAULT 0.7, "match_count" integer DEFAULT 10, "destination_filter" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "destination" "text", "title" "text", "content" "text", "category" "text", "similarity" double precision)
    LANGUAGE "sql" STABLE
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


ALTER FUNCTION "public"."match_travel_guides"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "destination_filter" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_user_preferences"("query_embedding" "public"."vector", "target_user_id" "uuid", "match_threshold" double precision DEFAULT 0.7, "match_count" integer DEFAULT 5) RETURNS TABLE("id" "uuid", "preference_text" "text", "similarity" double precision)
    LANGUAGE "sql" STABLE
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


ALTER FUNCTION "public"."match_user_preferences"("query_embedding" "public"."vector", "target_user_id" "uuid", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_search_cache_is_expired"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.is_expired := (NEW.expires_at < NOW());
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."refresh_search_cache_is_expired"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."soft_delete_user"("target_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."soft_delete_user"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_conversation_last_message"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE conversations
    SET last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_conversation_last_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_trip_actual_cost"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."update_trip_actual_cost"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."active_trips" AS
SELECT
    NULL::"uuid" AS "id",
    NULL::"uuid" AS "user_id",
    NULL::"uuid" AS "conversation_id",
    NULL::"text" AS "title",
    NULL::"text" AS "description",
    NULL::"jsonb" AS "destinations",
    NULL::"date" AS "start_date",
    NULL::"date" AS "end_date",
    NULL::integer AS "duration_days",
    NULL::"public"."travel_style" AS "trip_type",
    NULL::boolean AS "is_multi_city",
    NULL::integer AS "number_of_travelers",
    NULL::"jsonb" AS "traveler_details",
    NULL::numeric(10,2) AS "estimated_budget",
    NULL::numeric(10,2) AS "actual_cost",
    NULL::"text" AS "currency",
    NULL::"public"."trip_status" AS "status",
    NULL::"jsonb" AS "itinerary",
    NULL::timestamp with time zone AS "itinerary_generated_at",
    NULL::boolean AS "has_flights",
    NULL::boolean AS "has_hotels",
    NULL::boolean AS "has_activities",
    NULL::boolean AS "is_shared",
    NULL::"uuid"[] AS "shared_with",
    NULL::"text" AS "share_token",
    NULL::"text" AS "ics_file_url",
    NULL::"text" AS "pdf_itinerary_url",
    NULL::"jsonb" AS "metadata",
    NULL::timestamp with time zone AS "created_at",
    NULL::timestamp with time zone AS "updated_at",
    NULL::timestamp with time zone AS "confirmed_at",
    NULL::timestamp with time zone AS "completed_at",
    NULL::timestamp with time zone AS "cancelled_at",
    NULL::"text" AS "user_name",
    NULL::"text" AS "user_email",
    NULL::bigint AS "booking_count",
    NULL::numeric AS "total_booking_cost";


ALTER VIEW "public"."active_trips" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_users" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'moderator'::"text" NOT NULL,
    "permissions" "text"[] DEFAULT '{}'::"text"[],
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "last_active_at" timestamp with time zone
);


ALTER TABLE "public"."admin_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_feedback" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "agent_run_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "message_id" "uuid",
    "feedback_type" "text" NOT NULL,
    "rating" integer,
    "comment" "text",
    "issues" "text"[] DEFAULT '{}'::"text"[],
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "agent_feedback_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."agent_feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_runs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "conversation_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "agent_type" "public"."agent_type" NOT NULL,
    "agent_name" "text",
    "parent_run_id" "uuid",
    "execution_status" "public"."agent_execution_status" DEFAULT 'pending'::"public"."agent_execution_status",
    "input" "jsonb" NOT NULL,
    "output" "jsonb",
    "context" "jsonb" DEFAULT '{}'::"jsonb",
    "tools_called" "jsonb" DEFAULT '[]'::"jsonb",
    "duration_ms" integer,
    "token_usage" "jsonb",
    "cost_usd" numeric(10,4),
    "error" "text",
    "retry_count" integer DEFAULT 0,
    "max_retries" integer DEFAULT 3,
    "trace_id" "uuid",
    "span_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "started_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "failed_at" timestamp with time zone
);


ALTER TABLE "public"."agent_runs" OWNER TO "postgres";


COMMENT ON TABLE "public"."agent_runs" IS 'LangChain agent execution logs for observability';



CREATE OR REPLACE VIEW "public"."agent_performance" AS
 SELECT "agent_type",
    "date_trunc"('day'::"text", "started_at") AS "date",
    "count"(*) AS "total_runs",
    "count"(*) FILTER (WHERE ("execution_status" = 'completed'::"public"."agent_execution_status")) AS "successful_runs",
    "count"(*) FILTER (WHERE ("execution_status" = 'failed'::"public"."agent_execution_status")) AS "failed_runs",
    "round"("avg"("duration_ms"), 2) AS "avg_duration_ms",
    "round"("sum"("cost_usd"), 4) AS "total_cost_usd",
    "round"("avg"("retry_count"), 2) AS "avg_retry_count"
   FROM "public"."agent_runs"
  GROUP BY "agent_type", ("date_trunc"('day'::"text", "started_at"));


ALTER VIEW "public"."agent_performance" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."agent_performance_summary" AS
 SELECT "agent_type",
    "date_trunc"('day'::"text", "started_at") AS "date",
    "count"(*) AS "total_runs",
    "count"(*) FILTER (WHERE ("execution_status" = 'completed'::"public"."agent_execution_status")) AS "successful_runs",
    "count"(*) FILTER (WHERE ("execution_status" = 'failed'::"public"."agent_execution_status")) AS "failed_runs",
    "round"(((100.0 * ("count"(*) FILTER (WHERE ("execution_status" = 'completed'::"public"."agent_execution_status")))::numeric) / (NULLIF("count"(*), 0))::numeric), 2) AS "success_rate",
    "round"("avg"("duration_ms"), 2) AS "avg_duration_ms",
    "round"(("percentile_cont"((0.5)::double precision) WITHIN GROUP (ORDER BY (("duration_ms")::double precision)))::numeric, 2) AS "median_duration_ms",
    "round"(("percentile_cont"((0.95)::double precision) WITHIN GROUP (ORDER BY (("duration_ms")::double precision)))::numeric, 2) AS "p95_duration_ms",
    "sum"((("token_usage" ->> 'total_tokens'::"text"))::integer) AS "total_tokens",
    "round"("sum"("cost_usd"), 4) AS "total_cost_usd"
   FROM "public"."agent_runs"
  WHERE ("started_at" > ("now"() - '30 days'::interval))
  GROUP BY "agent_type", ("date_trunc"('day'::"text", "started_at"))
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."agent_performance_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."airports" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "iata_code" "text" NOT NULL,
    "icao_code" "text",
    "name" "text" NOT NULL,
    "city" "text" NOT NULL,
    "country" "text" NOT NULL,
    "country_code" "text" NOT NULL,
    "latitude" numeric(10,6),
    "longitude" numeric(10,6),
    "timezone" "text",
    "airport_type" "text",
    "popularity_score" integer DEFAULT 0,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."airports" OWNER TO "postgres";


COMMENT ON TABLE "public"."airports" IS 'Reference data for flight searches';



CREATE TABLE IF NOT EXISTS "public"."api_usage_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "api_provider" "text" NOT NULL,
    "api_endpoint" "text",
    "http_method" "text",
    "request_count" integer DEFAULT 1,
    "cost_usd" numeric(10,4),
    "http_status_code" integer,
    "response_time_ms" integer,
    "success" boolean DEFAULT true,
    "user_id" "uuid",
    "agent_run_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."api_usage_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attractions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "city_id" "uuid",
    "category" "text" NOT NULL,
    "subcategory" "text",
    "address" "text",
    "latitude" numeric(10,6),
    "longitude" numeric(10,6),
    "description" "text",
    "average_visit_duration" integer,
    "estimated_cost" numeric(10,2),
    "opening_hours" "jsonb",
    "best_time_to_visit" "text",
    "rating" numeric(3,2),
    "review_count" integer DEFAULT 0,
    "popularity_score" integer DEFAULT 0,
    "photo_urls" "text"[] DEFAULT '{}'::"text"[],
    "google_place_id" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "description_embedding" "public"."vector"(768)
);


ALTER TABLE "public"."attractions" OWNER TO "postgres";


COMMENT ON TABLE "public"."attractions" IS 'Points of interest for itinerary generation';



CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "admin_user_id" "uuid",
    "action" "text" NOT NULL,
    "entity_type" "text",
    "entity_id" "uuid",
    "old_values" "jsonb",
    "new_values" "jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bookings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "booking_type" "public"."booking_type" NOT NULL,
    "provider" "text" NOT NULL,
    "provider_booking_id" "text",
    "confirmation_code" "text",
    "details" "jsonb" NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text",
    "taxes" numeric(10,2) DEFAULT 0,
    "fees" numeric(10,2) DEFAULT 0,
    "total_price" numeric(10,2) GENERATED ALWAYS AS ((("price" + COALESCE("taxes", (0)::numeric)) + COALESCE("fees", (0)::numeric))) STORED,
    "status" "public"."booking_status" DEFAULT 'searching'::"public"."booking_status",
    "held_until" timestamp with time zone,
    "hold_token" "text",
    "is_refundable" boolean DEFAULT true,
    "cancellation_policy" "jsonb",
    "cancellation_deadline" timestamp with time zone,
    "ticket_url" "text",
    "voucher_url" "text",
    "invoice_url" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "confirmed_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone
);


ALTER TABLE "public"."bookings" OWNER TO "postgres";


COMMENT ON TABLE "public"."bookings" IS 'Individual bookings (flights, hotels, activities) within trips';



CREATE TABLE IF NOT EXISTS "public"."cities" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "country_code" "text" NOT NULL,
    "latitude" numeric(10,6),
    "longitude" numeric(10,6),
    "timezone" "text",
    "population" integer,
    "primary_airport_iata" "text",
    "description" "text",
    "best_time_to_visit" "text",
    "average_daily_budget" numeric(10,2),
    "popularity_score" integer DEFAULT 0,
    "tourist_rating" numeric(3,2),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."cities" OWNER TO "postgres";


COMMENT ON TABLE "public"."cities" IS 'Popular travel destinations';



CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text",
    "summary" "text",
    "trip_id" "uuid",
    "context" "jsonb" DEFAULT '{}'::"jsonb",
    "is_active" boolean DEFAULT true,
    "archived" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_message_at" timestamp with time zone
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


COMMENT ON TABLE "public"."conversations" IS 'Chat sessions between users and AI';



CREATE TABLE IF NOT EXISTS "public"."countries" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "country_code" "text" NOT NULL,
    "country_code_3" "text" NOT NULL,
    "name" "text" NOT NULL,
    "official_name" "text",
    "region" "text",
    "subregion" "text",
    "capital" "text",
    "currency" "text",
    "languages" "text"[] DEFAULT '{}'::"text"[],
    "visa_requirements" "jsonb",
    "travel_advisories" "jsonb",
    "popularity_score" integer DEFAULT 0,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."countries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "trip_id" "uuid",
    "booking_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "amount" numeric(10,2) NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text",
    "payment_method" "public"."payment_method" NOT NULL,
    "provider_payment_id" "text",
    "provider_customer_id" "text",
    "status" "public"."payment_status" DEFAULT 'pending'::"public"."payment_status",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "refund_amount" numeric(10,2),
    "refunded_at" timestamp with time zone,
    "refund_reason" "text",
    "receipt_url" "text",
    "invoice_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "succeeded_at" timestamp with time zone,
    "failed_at" timestamp with time zone
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


COMMENT ON TABLE "public"."payments" IS 'Payment transactions via Stripe';



CREATE MATERIALIZED VIEW "public"."daily_revenue_summary" AS
 SELECT "date_trunc"('day'::"text", "created_at") AS "date",
    "count"(*) AS "total_payments",
    "count"(*) FILTER (WHERE ("status" = 'succeeded'::"public"."payment_status")) AS "successful_payments",
    "count"(*) FILTER (WHERE ("status" = 'failed'::"public"."payment_status")) AS "failed_payments",
    "sum"("amount") FILTER (WHERE ("status" = 'succeeded'::"public"."payment_status")) AS "total_revenue",
    "avg"("amount") FILTER (WHERE ("status" = 'succeeded'::"public"."payment_status")) AS "average_transaction",
    "count"(DISTINCT "user_id") AS "unique_customers",
    "count"(DISTINCT "trip_id") AS "unique_trips"
   FROM "public"."payments"
  WHERE ("created_at" > ("now"() - '1 year'::interval))
  GROUP BY ("date_trunc"('day'::"text", "created_at"))
  ORDER BY ("date_trunc"('day'::"text", "created_at")) DESC
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."daily_revenue_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "notification_id" "uuid",
    "to_email" "text" NOT NULL,
    "from_email" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "email_provider" "text" DEFAULT 'resend'::"text",
    "provider_message_id" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "sent_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "bounced_at" timestamp with time zone,
    "failed_at" timestamp with time zone
);


ALTER TABLE "public"."email_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."error_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "error_type" "text" NOT NULL,
    "error_message" "text" NOT NULL,
    "error_stack" "text",
    "user_id" "uuid",
    "conversation_id" "uuid",
    "agent_run_id" "uuid",
    "endpoint" "text",
    "http_method" "text",
    "request_body" "jsonb",
    "severity" "text" DEFAULT 'error'::"text",
    "resolved" boolean DEFAULT false,
    "resolved_at" timestamp with time zone,
    "resolution_notes" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."error_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feature_flags" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "flag_key" "text" NOT NULL,
    "flag_name" "text" NOT NULL,
    "description" "text",
    "is_enabled" boolean DEFAULT false,
    "rollout_percentage" integer DEFAULT 0,
    "user_whitelist" "uuid"[] DEFAULT '{}'::"uuid"[],
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "feature_flags_rollout_percentage_check" CHECK ((("rollout_percentage" >= 0) AND ("rollout_percentage" <= 100)))
);


ALTER TABLE "public"."feature_flags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "role" "public"."message_role" NOT NULL,
    "content" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "agent_type" "public"."agent_type",
    "agent_run_id" "uuid",
    "prompt_tokens" integer,
    "completion_tokens" integer,
    "total_tokens" integer,
    "user_rating" integer,
    "user_feedback" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "parent_message_id" "uuid",
    CONSTRAINT "messages_user_rating_check" CHECK ((("user_rating" >= 1) AND ("user_rating" <= 5)))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


COMMENT ON TABLE "public"."messages" IS 'Individual messages within conversations';



CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "public"."notification_type" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "trip_id" "uuid",
    "booking_id" "uuid",
    "status" "public"."notification_status" DEFAULT 'pending'::"public"."notification_status",
    "delivery_channel" "text"[] DEFAULT '{in_app}'::"text"[],
    "email_sent" boolean DEFAULT false,
    "email_sent_at" timestamp with time zone,
    "email_opened" boolean DEFAULT false,
    "email_opened_at" timestamp with time zone,
    "action_url" "text",
    "action_label" "text",
    "priority" "text" DEFAULT 'normal'::"text",
    "read" boolean DEFAULT false,
    "read_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "delivered_at" timestamp with time zone
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."notifications" IS 'In-app and email notifications';



CREATE TABLE IF NOT EXISTS "public"."trip_reviews" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "overall_rating" integer NOT NULL,
    "planning_experience_rating" integer,
    "ai_accuracy_rating" integer,
    "value_for_money_rating" integer,
    "title" "text",
    "review_text" "text",
    "what_went_well" "text",
    "what_could_improve" "text",
    "would_recommend" boolean,
    "would_use_again" boolean,
    "photo_urls" "text"[] DEFAULT '{}'::"text"[],
    "sentiment_score" numeric(3,2),
    "is_public" boolean DEFAULT false,
    "is_approved" boolean DEFAULT true,
    "moderated_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "review_embedding" "public"."vector"(768),
    CONSTRAINT "trip_reviews_ai_accuracy_rating_check" CHECK ((("ai_accuracy_rating" >= 1) AND ("ai_accuracy_rating" <= 5))),
    CONSTRAINT "trip_reviews_overall_rating_check" CHECK ((("overall_rating" >= 1) AND ("overall_rating" <= 5))),
    CONSTRAINT "trip_reviews_planning_experience_rating_check" CHECK ((("planning_experience_rating" >= 1) AND ("planning_experience_rating" <= 5))),
    CONSTRAINT "trip_reviews_value_for_money_rating_check" CHECK ((("value_for_money_rating" >= 1) AND ("value_for_money_rating" <= 5)))
);


ALTER TABLE "public"."trip_reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trips" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "conversation_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "destinations" "jsonb" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "duration_days" integer GENERATED ALWAYS AS ((("end_date" - "start_date") + 1)) STORED,
    "trip_type" "public"."travel_style",
    "is_multi_city" boolean DEFAULT false,
    "number_of_travelers" integer DEFAULT 1,
    "traveler_details" "jsonb" DEFAULT '[]'::"jsonb",
    "estimated_budget" numeric(10,2),
    "actual_cost" numeric(10,2),
    "currency" "text" DEFAULT 'USD'::"text",
    "status" "public"."trip_status" DEFAULT 'planning'::"public"."trip_status",
    "itinerary" "jsonb",
    "itinerary_generated_at" timestamp with time zone,
    "has_flights" boolean DEFAULT false,
    "has_hotels" boolean DEFAULT false,
    "has_activities" boolean DEFAULT false,
    "is_shared" boolean DEFAULT false,
    "shared_with" "uuid"[],
    "share_token" "text",
    "ics_file_url" "text",
    "pdf_itinerary_url" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "confirmed_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone
);


ALTER TABLE "public"."trips" OWNER TO "postgres";


COMMENT ON TABLE "public"."trips" IS 'Main trip records with itineraries and bookings';



CREATE MATERIALIZED VIEW "public"."popular_destinations" AS
 SELECT "c"."id" AS "city_id",
    "c"."name" AS "city_name",
    "c"."country_code",
    "co"."name" AS "country_name",
    "count"(DISTINCT "t"."id") AS "trip_count",
    "count"(DISTINCT "t"."user_id") AS "unique_travelers",
    "avg"("tr"."overall_rating") AS "average_rating",
    "c"."popularity_score"
   FROM ((("public"."cities" "c"
     JOIN "public"."countries" "co" ON (("c"."country_code" = "co"."country_code")))
     LEFT JOIN "public"."trips" "t" ON (("t"."destinations" @> "jsonb_build_array"("jsonb_build_object"('city', "c"."name")))))
     LEFT JOIN "public"."trip_reviews" "tr" ON (("t"."id" = "tr"."trip_id")))
  WHERE (("t"."created_at" > ("now"() - '1 year'::interval)) OR ("t"."id" IS NULL))
  GROUP BY "c"."id", "c"."name", "c"."country_code", "co"."name", "c"."popularity_score"
  ORDER BY ("count"(DISTINCT "t"."id")) DESC, "c"."popularity_score" DESC
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."popular_destinations" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."revenue_analytics" AS
 SELECT "date_trunc"('day'::"text", "created_at") AS "date",
    "count"(*) AS "total_payments",
    "count"(*) FILTER (WHERE ("status" = 'succeeded'::"public"."payment_status")) AS "successful_payments",
    "sum"("amount") FILTER (WHERE ("status" = 'succeeded'::"public"."payment_status")) AS "total_revenue",
    "avg"("amount") FILTER (WHERE ("status" = 'succeeded'::"public"."payment_status")) AS "average_transaction",
    "count"(DISTINCT "user_id") AS "unique_customers"
   FROM "public"."payments"
  GROUP BY ("date_trunc"('day'::"text", "created_at"));


ALTER VIEW "public"."revenue_analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."search_cache" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "cache_key" "text" NOT NULL,
    "search_type" "text" NOT NULL,
    "parameters" "jsonb" NOT NULL,
    "results" "jsonb" NOT NULL,
    "provider" "text",
    "result_count" integer,
    "expires_at" timestamp with time zone NOT NULL,
    "is_expired" boolean DEFAULT false,
    "hit_count" integer DEFAULT 0,
    "last_accessed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."search_cache" OWNER TO "postgres";


COMMENT ON TABLE "public"."search_cache" IS 'Cache for expensive API calls (Amadeus, Booking.com)';



CREATE TABLE IF NOT EXISTS "public"."tool_calls" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "agent_run_id" "uuid" NOT NULL,
    "tool_name" "text" NOT NULL,
    "tool_type" "text",
    "input" "jsonb" NOT NULL,
    "output" "jsonb",
    "duration_ms" integer,
    "success" boolean DEFAULT true,
    "error" "text",
    "api_endpoint" "text",
    "http_method" "text",
    "http_status_code" integer,
    "called_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone
);


ALTER TABLE "public"."tool_calls" OWNER TO "postgres";


COMMENT ON TABLE "public"."tool_calls" IS 'Detailed logs of individual tool invocations by agents';



CREATE TABLE IF NOT EXISTS "public"."travel_guides" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "destination" "text" NOT NULL,
    "city" "text",
    "country" "text",
    "region" "text",
    "iata_code" "text",
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "category" "text",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "language" "text" DEFAULT 'en'::"text",
    "source" "text",
    "is_verified" boolean DEFAULT false,
    "quality_score" numeric(3,2),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "content_embedding" "public"."vector"(768)
);


ALTER TABLE "public"."travel_guides" OWNER TO "postgres";


COMMENT ON TABLE "public"."travel_guides" IS 'Static knowledge base for RAG retrieval';



CREATE TABLE IF NOT EXISTS "public"."user_activity_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "activity_type" "text" NOT NULL,
    "activity_name" "text",
    "page_url" "text",
    "referrer" "text",
    "user_agent" "text",
    "ip_address" "inet",
    "device_type" "text",
    "browser" "text",
    "os" "text",
    "session_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_activity_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_preferences" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "travel_style" "public"."travel_style"[] DEFAULT '{}'::"public"."travel_style"[],
    "travel_pace" "public"."travel_pace" DEFAULT 'moderate'::"public"."travel_pace",
    "accommodation_preference" "public"."accommodation_preference" DEFAULT 'moderate'::"public"."accommodation_preference",
    "preferred_hotel_brands" "text"[] DEFAULT '{}'::"text"[],
    "interests" "text"[] DEFAULT '{}'::"text"[],
    "dietary_preferences" "public"."dietary_preference"[] DEFAULT '{}'::"public"."dietary_preference"[],
    "accessibility_requirements" "text"[] DEFAULT '{}'::"text"[],
    "typical_daily_budget_min" numeric(10,2),
    "typical_daily_budget_max" numeric(10,2),
    "typical_trip_budget_min" numeric(10,2),
    "typical_trip_budget_max" numeric(10,2),
    "preferred_airlines" "text"[] DEFAULT '{}'::"text"[],
    "seat_preference" "text",
    "preferred_flight_class" "text" DEFAULT 'economy'::"text",
    "max_layovers" integer DEFAULT 1,
    "preferred_destinations" "text"[] DEFAULT '{}'::"text"[],
    "avoided_destinations" "text"[] DEFAULT '{}'::"text"[],
    "typical_travel_companions" "text",
    "number_of_travelers" integer DEFAULT 1,
    "preference_text" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "preference_embedding" "public"."vector"(768)
);


ALTER TABLE "public"."user_preferences" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_preferences" IS 'User travel preferences for personalization and RAG';



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "phone_number" "text",
    "date_of_birth" "date",
    "avatar_url" "text",
    "bio" "text",
    "preferred_language" "text" DEFAULT 'en'::"text",
    "timezone" "text" DEFAULT 'UTC'::"text",
    "preferred_currency" "text" DEFAULT 'USD'::"text",
    "home_airport" "text",
    "status" "public"."user_status" DEFAULT 'active'::"public"."user_status",
    "email_verified" boolean DEFAULT false,
    "phone_verified" boolean DEFAULT false,
    "onboarding_completed" boolean DEFAULT false,
    "cold_start_completed" boolean DEFAULT false,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_login_at" timestamp with time zone,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON TABLE "public"."users" IS 'Core user accounts, extends Supabase auth.users';



CREATE OR REPLACE VIEW "public"."user_statistics" AS
 SELECT "u"."id" AS "user_id",
    "u"."full_name",
    "u"."email",
    "count"(DISTINCT "t"."id") AS "total_trips",
    "count"(DISTINCT
        CASE
            WHEN ("t"."status" = 'completed'::"public"."trip_status") THEN "t"."id"
            ELSE NULL::"uuid"
        END) AS "completed_trips",
    "count"(DISTINCT "c"."id") AS "total_conversations",
    "count"(DISTINCT "m"."id") AS "total_messages",
    "sum"("p"."amount") AS "total_spent",
    "avg"("tr"."overall_rating") AS "average_trip_rating",
    "max"("t"."created_at") AS "last_trip_date",
    "u"."created_at" AS "member_since"
   FROM ((((("public"."users" "u"
     LEFT JOIN "public"."trips" "t" ON (("u"."id" = "t"."user_id")))
     LEFT JOIN "public"."conversations" "c" ON (("u"."id" = "c"."user_id")))
     LEFT JOIN "public"."messages" "m" ON ((("c"."id" = "m"."conversation_id") AND ("m"."role" = 'user'::"public"."message_role"))))
     LEFT JOIN "public"."payments" "p" ON ((("u"."id" = "p"."user_id") AND ("p"."status" = 'succeeded'::"public"."payment_status"))))
     LEFT JOIN "public"."trip_reviews" "tr" ON (("t"."id" = "tr"."trip_id")))
  GROUP BY "u"."id", "u"."full_name", "u"."email", "u"."created_at";


ALTER VIEW "public"."user_statistics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_travel_history" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "trip_id" "uuid",
    "destination" "text" NOT NULL,
    "country" "text",
    "visit_date" "date",
    "duration_days" integer,
    "rating" integer,
    "review" "text",
    "would_revisit" boolean,
    "preferred_activities" "text"[] DEFAULT '{}'::"text"[],
    "favorite_places" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "experience_embedding" "public"."vector"(768),
    CONSTRAINT "user_travel_history_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."user_travel_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_travel_history" IS 'Past trip data used for learning user preferences';



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."agent_feedback"
    ADD CONSTRAINT "agent_feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_runs"
    ADD CONSTRAINT "agent_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."airports"
    ADD CONSTRAINT "airports_iata_code_key" UNIQUE ("iata_code");



ALTER TABLE ONLY "public"."airports"
    ADD CONSTRAINT "airports_icao_code_key" UNIQUE ("icao_code");



ALTER TABLE ONLY "public"."airports"
    ADD CONSTRAINT "airports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."api_usage_logs"
    ADD CONSTRAINT "api_usage_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attractions"
    ADD CONSTRAINT "attractions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cities"
    ADD CONSTRAINT "cities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."countries"
    ADD CONSTRAINT "countries_country_code_3_key" UNIQUE ("country_code_3");



ALTER TABLE ONLY "public"."countries"
    ADD CONSTRAINT "countries_country_code_key" UNIQUE ("country_code");



ALTER TABLE ONLY "public"."countries"
    ADD CONSTRAINT "countries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_logs"
    ADD CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."error_logs"
    ADD CONSTRAINT "error_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feature_flags"
    ADD CONSTRAINT "feature_flags_flag_key_key" UNIQUE ("flag_key");



ALTER TABLE ONLY "public"."feature_flags"
    ADD CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."search_cache"
    ADD CONSTRAINT "search_cache_cache_key_key" UNIQUE ("cache_key");



ALTER TABLE ONLY "public"."search_cache"
    ADD CONSTRAINT "search_cache_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tool_calls"
    ADD CONSTRAINT "tool_calls_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."travel_guides"
    ADD CONSTRAINT "travel_guides_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trip_reviews"
    ADD CONSTRAINT "trip_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trips"
    ADD CONSTRAINT "trips_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trips"
    ADD CONSTRAINT "trips_share_token_key" UNIQUE ("share_token");



ALTER TABLE ONLY "public"."user_activity_logs"
    ADD CONSTRAINT "user_activity_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_travel_history"
    ADD CONSTRAINT "user_travel_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "agent_performance_summary_agent_type_date_idx" ON "public"."agent_performance_summary" USING "btree" ("agent_type", "date");



CREATE UNIQUE INDEX "daily_revenue_summary_date_idx" ON "public"."daily_revenue_summary" USING "btree" ("date");



CREATE INDEX "idx_admin_users_role" ON "public"."admin_users" USING "btree" ("role");



CREATE INDEX "idx_admin_users_user_id" ON "public"."admin_users" USING "btree" ("user_id");



CREATE INDEX "idx_agent_feedback_agent_run_id" ON "public"."agent_feedback" USING "btree" ("agent_run_id");



CREATE INDEX "idx_agent_feedback_created_at" ON "public"."agent_feedback" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_agent_feedback_type" ON "public"."agent_feedback" USING "btree" ("feedback_type");



CREATE INDEX "idx_agent_feedback_user_id" ON "public"."agent_feedback" USING "btree" ("user_id");



CREATE INDEX "idx_agent_runs_agent_type" ON "public"."agent_runs" USING "btree" ("agent_type");



CREATE INDEX "idx_agent_runs_conversation_id" ON "public"."agent_runs" USING "btree" ("conversation_id");



CREATE INDEX "idx_agent_runs_started_at" ON "public"."agent_runs" USING "btree" ("started_at" DESC);



CREATE INDEX "idx_agent_runs_status" ON "public"."agent_runs" USING "btree" ("execution_status");



CREATE INDEX "idx_agent_runs_trace_id" ON "public"."agent_runs" USING "btree" ("trace_id");



CREATE INDEX "idx_agent_runs_user_id" ON "public"."agent_runs" USING "btree" ("user_id");



CREATE INDEX "idx_agent_runs_user_status" ON "public"."agent_runs" USING "btree" ("user_id", "execution_status");



CREATE INDEX "idx_airports_city" ON "public"."airports" USING "btree" ("city");



CREATE INDEX "idx_airports_country" ON "public"."airports" USING "btree" ("country");



CREATE INDEX "idx_airports_iata" ON "public"."airports" USING "btree" ("iata_code");



CREATE INDEX "idx_airports_popularity" ON "public"."airports" USING "btree" ("popularity_score" DESC);



CREATE INDEX "idx_airports_search" ON "public"."airports" USING "gin" ("to_tsvector"('"english"'::"regconfig", (((((("name" || ' '::"text") || "city") || ' '::"text") || "country") || ' '::"text") || "iata_code")));



CREATE INDEX "idx_api_usage_logs_created_at" ON "public"."api_usage_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_api_usage_logs_provider" ON "public"."api_usage_logs" USING "btree" ("api_provider");



CREATE INDEX "idx_api_usage_logs_user_id" ON "public"."api_usage_logs" USING "btree" ("user_id");



CREATE INDEX "idx_attractions_category" ON "public"."attractions" USING "btree" ("category");



CREATE INDEX "idx_attractions_city" ON "public"."attractions" USING "btree" ("city_id");



CREATE INDEX "idx_attractions_embedding" ON "public"."attractions" USING "ivfflat" ("description_embedding" "public"."vector_cosine_ops") WITH ("lists"='100');



CREATE INDEX "idx_attractions_popularity" ON "public"."attractions" USING "btree" ("popularity_score" DESC);



CREATE INDEX "idx_attractions_rating" ON "public"."attractions" USING "btree" ("rating" DESC);



CREATE INDEX "idx_attractions_search" ON "public"."attractions" USING "gin" ("to_tsvector"('"english"'::"regconfig", (("name" || ' '::"text") || COALESCE("description", ''::"text"))));



CREATE INDEX "idx_audit_logs_action" ON "public"."audit_logs" USING "btree" ("action");



CREATE INDEX "idx_audit_logs_created_at" ON "public"."audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_audit_logs_entity" ON "public"."audit_logs" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_audit_logs_user_id" ON "public"."audit_logs" USING "btree" ("user_id");



CREATE INDEX "idx_bookings_booking_type" ON "public"."bookings" USING "btree" ("booking_type");



CREATE INDEX "idx_bookings_confirmation_code" ON "public"."bookings" USING "btree" ("confirmation_code");



CREATE INDEX "idx_bookings_details" ON "public"."bookings" USING "gin" ("details");



CREATE INDEX "idx_bookings_provider" ON "public"."bookings" USING "btree" ("provider");



CREATE INDEX "idx_bookings_status" ON "public"."bookings" USING "btree" ("status");



CREATE INDEX "idx_bookings_trip_id" ON "public"."bookings" USING "btree" ("trip_id");



CREATE INDEX "idx_bookings_trip_status" ON "public"."bookings" USING "btree" ("trip_id", "status");



CREATE INDEX "idx_bookings_user_id" ON "public"."bookings" USING "btree" ("user_id");



CREATE INDEX "idx_bookings_user_status" ON "public"."bookings" USING "btree" ("user_id", "status");



CREATE INDEX "idx_cities_airport" ON "public"."cities" USING "btree" ("primary_airport_iata");



CREATE INDEX "idx_cities_country" ON "public"."cities" USING "btree" ("country_code");



CREATE INDEX "idx_cities_name" ON "public"."cities" USING "btree" ("name");



CREATE INDEX "idx_cities_popularity" ON "public"."cities" USING "btree" ("popularity_score" DESC);



CREATE INDEX "idx_cities_search" ON "public"."cities" USING "gin" ("to_tsvector"('"english"'::"regconfig", (("name" || ' '::"text") || COALESCE("description", ''::"text"))));



CREATE INDEX "idx_conversations_active" ON "public"."conversations" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_conversations_last_message_at" ON "public"."conversations" USING "btree" ("last_message_at" DESC);



CREATE INDEX "idx_conversations_trip_id" ON "public"."conversations" USING "btree" ("trip_id");



CREATE INDEX "idx_conversations_user_id" ON "public"."conversations" USING "btree" ("user_id");



CREATE INDEX "idx_countries_code" ON "public"."countries" USING "btree" ("country_code");



CREATE INDEX "idx_countries_popularity" ON "public"."countries" USING "btree" ("popularity_score" DESC);



CREATE INDEX "idx_countries_region" ON "public"."countries" USING "btree" ("region");



CREATE INDEX "idx_email_logs_created_at" ON "public"."email_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_email_logs_status" ON "public"."email_logs" USING "btree" ("status");



CREATE INDEX "idx_email_logs_to_email" ON "public"."email_logs" USING "btree" ("to_email");



CREATE INDEX "idx_email_logs_user_id" ON "public"."email_logs" USING "btree" ("user_id");



CREATE INDEX "idx_error_logs_created_at" ON "public"."error_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_error_logs_resolved" ON "public"."error_logs" USING "btree" ("resolved") WHERE ("resolved" = false);



CREATE INDEX "idx_error_logs_severity" ON "public"."error_logs" USING "btree" ("severity");



CREATE INDEX "idx_error_logs_type" ON "public"."error_logs" USING "btree" ("error_type");



CREATE INDEX "idx_error_logs_user_id" ON "public"."error_logs" USING "btree" ("user_id");



CREATE INDEX "idx_feature_flags_enabled" ON "public"."feature_flags" USING "btree" ("is_enabled");



CREATE INDEX "idx_feature_flags_key" ON "public"."feature_flags" USING "btree" ("flag_key");



CREATE INDEX "idx_messages_agent_run_id" ON "public"."messages" USING "btree" ("agent_run_id");



CREATE INDEX "idx_messages_conversation_created" ON "public"."messages" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "idx_messages_conversation_id" ON "public"."messages" USING "btree" ("conversation_id");



CREATE INDEX "idx_messages_conversation_tree" ON "public"."messages" USING "btree" ("conversation_id", "parent_message_id");



CREATE INDEX "idx_messages_created_at" ON "public"."messages" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_messages_parent" ON "public"."messages" USING "btree" ("parent_message_id");



CREATE INDEX "idx_messages_role" ON "public"."messages" USING "btree" ("role");



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_read" ON "public"."notifications" USING "btree" ("read") WHERE ("read" = false);



CREATE INDEX "idx_notifications_status" ON "public"."notifications" USING "btree" ("status");



CREATE INDEX "idx_notifications_type" ON "public"."notifications" USING "btree" ("type");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_user_read" ON "public"."notifications" USING "btree" ("user_id", "read") WHERE ("read" = false);



CREATE INDEX "idx_payments_created_at" ON "public"."payments" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_payments_provider_payment_id" ON "public"."payments" USING "btree" ("provider_payment_id");



CREATE INDEX "idx_payments_status" ON "public"."payments" USING "btree" ("status");



CREATE INDEX "idx_payments_trip_id" ON "public"."payments" USING "btree" ("trip_id");



CREATE INDEX "idx_payments_user_id" ON "public"."payments" USING "btree" ("user_id");



CREATE INDEX "idx_search_cache_cleanup" ON "public"."search_cache" USING "btree" ("created_at") WHERE ("is_expired" = true);



CREATE INDEX "idx_search_cache_expired" ON "public"."search_cache" USING "btree" ("is_expired") WHERE ("is_expired" = false);



CREATE INDEX "idx_search_cache_expires_at" ON "public"."search_cache" USING "btree" ("expires_at");



CREATE INDEX "idx_search_cache_key" ON "public"."search_cache" USING "btree" ("cache_key");



CREATE INDEX "idx_search_cache_type" ON "public"."search_cache" USING "btree" ("search_type");



CREATE INDEX "idx_tool_calls_agent_run_id" ON "public"."tool_calls" USING "btree" ("agent_run_id");



CREATE INDEX "idx_tool_calls_called_at" ON "public"."tool_calls" USING "btree" ("called_at" DESC);



CREATE INDEX "idx_tool_calls_success" ON "public"."tool_calls" USING "btree" ("success");



CREATE INDEX "idx_tool_calls_tool_name" ON "public"."tool_calls" USING "btree" ("tool_name");



CREATE INDEX "idx_travel_guides_category" ON "public"."travel_guides" USING "btree" ("category");



CREATE INDEX "idx_travel_guides_city" ON "public"."travel_guides" USING "btree" ("city");



CREATE INDEX "idx_travel_guides_destination" ON "public"."travel_guides" USING "btree" ("destination");



CREATE INDEX "idx_travel_guides_embedding" ON "public"."travel_guides" USING "ivfflat" ("content_embedding" "public"."vector_cosine_ops") WITH ("lists"='100');



CREATE INDEX "idx_travel_guides_search" ON "public"."travel_guides" USING "gin" ("to_tsvector"('"english"'::"regconfig", (("title" || ' '::"text") || "content")));



CREATE INDEX "idx_travel_guides_tags" ON "public"."travel_guides" USING "gin" ("tags");



CREATE INDEX "idx_trip_reviews_embedding" ON "public"."trip_reviews" USING "ivfflat" ("review_embedding" "public"."vector_cosine_ops") WITH ("lists"='100');



CREATE INDEX "idx_trip_reviews_public" ON "public"."trip_reviews" USING "btree" ("is_public") WHERE ("is_public" = true);



CREATE INDEX "idx_trip_reviews_rating" ON "public"."trip_reviews" USING "btree" ("overall_rating");



CREATE INDEX "idx_trip_reviews_trip_id" ON "public"."trip_reviews" USING "btree" ("trip_id");



CREATE INDEX "idx_trip_reviews_user_id" ON "public"."trip_reviews" USING "btree" ("user_id");



CREATE INDEX "idx_trips_conversation_id" ON "public"."trips" USING "btree" ("conversation_id");



CREATE INDEX "idx_trips_created_at" ON "public"."trips" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_trips_destinations" ON "public"."trips" USING "gin" ("destinations");



CREATE INDEX "idx_trips_search" ON "public"."trips" USING "gin" ("to_tsvector"('"english"'::"regconfig", (("title" || ' '::"text") || COALESCE("description", ''::"text"))));



CREATE INDEX "idx_trips_start_date" ON "public"."trips" USING "btree" ("start_date");



CREATE INDEX "idx_trips_status" ON "public"."trips" USING "btree" ("status");



CREATE INDEX "idx_trips_user_id" ON "public"."trips" USING "btree" ("user_id");



CREATE INDEX "idx_trips_user_status_date" ON "public"."trips" USING "btree" ("user_id", "status", "start_date");



CREATE INDEX "idx_user_activity_logs_created_at" ON "public"."user_activity_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_user_activity_logs_session" ON "public"."user_activity_logs" USING "btree" ("session_id");



CREATE INDEX "idx_user_activity_logs_type" ON "public"."user_activity_logs" USING "btree" ("activity_type");



CREATE INDEX "idx_user_activity_logs_user_id" ON "public"."user_activity_logs" USING "btree" ("user_id");



CREATE INDEX "idx_user_preferences_embedding" ON "public"."user_preferences" USING "ivfflat" ("preference_embedding" "public"."vector_cosine_ops") WITH ("lists"='100');



CREATE INDEX "idx_user_preferences_user_id" ON "public"."user_preferences" USING "btree" ("user_id");



CREATE INDEX "idx_user_travel_history_destination" ON "public"."user_travel_history" USING "btree" ("destination");



CREATE INDEX "idx_user_travel_history_embedding" ON "public"."user_travel_history" USING "ivfflat" ("experience_embedding" "public"."vector_cosine_ops") WITH ("lists"='100');



CREATE INDEX "idx_user_travel_history_user_id" ON "public"."user_travel_history" USING "btree" ("user_id");



CREATE INDEX "idx_users_created_at" ON "public"."users" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");



CREATE INDEX "idx_users_status" ON "public"."users" USING "btree" ("status");



CREATE UNIQUE INDEX "popular_destinations_city_id_idx" ON "public"."popular_destinations" USING "btree" ("city_id");



CREATE OR REPLACE VIEW "public"."active_trips" AS
 SELECT "t"."id",
    "t"."user_id",
    "t"."conversation_id",
    "t"."title",
    "t"."description",
    "t"."destinations",
    "t"."start_date",
    "t"."end_date",
    "t"."duration_days",
    "t"."trip_type",
    "t"."is_multi_city",
    "t"."number_of_travelers",
    "t"."traveler_details",
    "t"."estimated_budget",
    "t"."actual_cost",
    "t"."currency",
    "t"."status",
    "t"."itinerary",
    "t"."itinerary_generated_at",
    "t"."has_flights",
    "t"."has_hotels",
    "t"."has_activities",
    "t"."is_shared",
    "t"."shared_with",
    "t"."share_token",
    "t"."ics_file_url",
    "t"."pdf_itinerary_url",
    "t"."metadata",
    "t"."created_at",
    "t"."updated_at",
    "t"."confirmed_at",
    "t"."completed_at",
    "t"."cancelled_at",
    "u"."full_name" AS "user_name",
    "u"."email" AS "user_email",
    "count"(DISTINCT "b"."id") AS "booking_count",
    "sum"("b"."total_price") AS "total_booking_cost"
   FROM (("public"."trips" "t"
     JOIN "public"."users" "u" ON (("t"."user_id" = "u"."id")))
     LEFT JOIN "public"."bookings" "b" ON ((("t"."id" = "b"."trip_id") AND ("b"."status" = 'confirmed'::"public"."booking_status"))))
  WHERE (("t"."status" = ANY (ARRAY['confirmed'::"public"."trip_status", 'in_progress'::"public"."trip_status"])) AND ("t"."start_date" >= (CURRENT_DATE - '7 days'::interval)))
  GROUP BY "t"."id", "u"."full_name", "u"."email";



CREATE OR REPLACE TRIGGER "auto_title_trip" BEFORE INSERT ON "public"."trips" FOR EACH ROW EXECUTE FUNCTION "public"."auto_generate_trip_title"();



CREATE OR REPLACE TRIGGER "create_booking_notification_trigger" AFTER INSERT OR UPDATE ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."create_booking_notification"();



CREATE OR REPLACE TRIGGER "refresh_search_cache_is_expired_trigger" BEFORE INSERT OR UPDATE ON "public"."search_cache" FOR EACH ROW EXECUTE FUNCTION "public"."refresh_search_cache_is_expired"();



CREATE OR REPLACE TRIGGER "update_bookings_updated_at" BEFORE UPDATE ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_conversation_last_message_trigger" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_conversation_last_message"();



CREATE OR REPLACE TRIGGER "update_conversations_updated_at" BEFORE UPDATE ON "public"."conversations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_payments_updated_at" BEFORE UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_trip_cost_on_booking" AFTER INSERT OR DELETE OR UPDATE ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."update_trip_actual_cost"();



CREATE OR REPLACE TRIGGER "update_trip_reviews_updated_at" BEFORE UPDATE ON "public"."trip_reviews" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_trips_updated_at" BEFORE UPDATE ON "public"."trips" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_preferences_updated_at" BEFORE UPDATE ON "public"."user_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_feedback"
    ADD CONSTRAINT "agent_feedback_agent_run_id_fkey" FOREIGN KEY ("agent_run_id") REFERENCES "public"."agent_runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_feedback"
    ADD CONSTRAINT "agent_feedback_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_feedback"
    ADD CONSTRAINT "agent_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_runs"
    ADD CONSTRAINT "agent_runs_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_runs"
    ADD CONSTRAINT "agent_runs_parent_run_id_fkey" FOREIGN KEY ("parent_run_id") REFERENCES "public"."agent_runs"("id");



ALTER TABLE ONLY "public"."agent_runs"
    ADD CONSTRAINT "agent_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."api_usage_logs"
    ADD CONSTRAINT "api_usage_logs_agent_run_id_fkey" FOREIGN KEY ("agent_run_id") REFERENCES "public"."agent_runs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."api_usage_logs"
    ADD CONSTRAINT "api_usage_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."attractions"
    ADD CONSTRAINT "attractions_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cities"
    ADD CONSTRAINT "cities_country_code_fkey" FOREIGN KEY ("country_code") REFERENCES "public"."countries"("country_code");



ALTER TABLE ONLY "public"."cities"
    ADD CONSTRAINT "cities_primary_airport_iata_fkey" FOREIGN KEY ("primary_airport_iata") REFERENCES "public"."airports"("iata_code");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_logs"
    ADD CONSTRAINT "email_logs_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."email_logs"
    ADD CONSTRAINT "email_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."error_logs"
    ADD CONSTRAINT "error_logs_agent_run_id_fkey" FOREIGN KEY ("agent_run_id") REFERENCES "public"."agent_runs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."error_logs"
    ADD CONSTRAINT "error_logs_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."error_logs"
    ADD CONSTRAINT "error_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_parent_message_id_fkey" FOREIGN KEY ("parent_message_id") REFERENCES "public"."messages"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tool_calls"
    ADD CONSTRAINT "tool_calls_agent_run_id_fkey" FOREIGN KEY ("agent_run_id") REFERENCES "public"."agent_runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_reviews"
    ADD CONSTRAINT "trip_reviews_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_reviews"
    ADD CONSTRAINT "trip_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trips"
    ADD CONSTRAINT "trips_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."trips"
    ADD CONSTRAINT "trips_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_activity_logs"
    ADD CONSTRAINT "user_activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_travel_history"
    ADD CONSTRAINT "user_travel_history_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_travel_history"
    ADD CONSTRAINT "user_travel_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."agent_feedback" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "agent_feedback_all_own" ON "public"."agent_feedback" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."airports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "airports_select_all" ON "public"."airports" FOR SELECT USING (true);



ALTER TABLE "public"."attractions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "attractions_select_all" ON "public"."attractions" FOR SELECT USING (true);



ALTER TABLE "public"."bookings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bookings_all_own" ON "public"."bookings" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."cities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cities_select_all" ON "public"."cities" FOR SELECT USING (true);



ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "conversations_all_own" ON "public"."conversations" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."countries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "countries_select_all" ON "public"."countries" FOR SELECT USING (true);



ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "messages_all_own" ON "public"."messages" USING (("auth"."uid"() IN ( SELECT "conversations"."user_id"
   FROM "public"."conversations"
  WHERE ("conversations"."id" = "messages"."conversation_id"))));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_all_own" ON "public"."notifications" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payments_all_own" ON "public"."payments" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."travel_guides" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "travel_guides_select_all" ON "public"."travel_guides" FOR SELECT USING (true);



ALTER TABLE "public"."trip_reviews" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "trip_reviews_manage_own" ON "public"."trip_reviews" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "trip_reviews_select_public" ON "public"."trip_reviews" FOR SELECT USING ((("is_public" = true) OR ("auth"."uid"() = "user_id")));



ALTER TABLE "public"."trips" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "trips_all_own" ON "public"."trips" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "trips_select_own" ON "public"."trips" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("auth"."uid"() = ANY ("shared_with"))));



ALTER TABLE "public"."user_preferences" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_preferences_all_own" ON "public"."user_preferences" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_select_own" ON "public"."users" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "users_update_own" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id"));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."auto_generate_trip_title"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_generate_trip_title"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_generate_trip_title"() TO "service_role";



GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_destination_score"("target_user_id" "uuid", "destination_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_destination_score"("target_user_id" "uuid", "destination_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_destination_score"("target_user_id" "uuid", "destination_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_trip_cost"("trip_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_trip_cost"("trip_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_trip_cost"("trip_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_user_book_trip"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_user_book_trip"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_user_book_trip"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_booking_notification"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_booking_notification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_booking_notification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."find_similar_trips"("target_user_id" "uuid", "destination_query" "text", "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."find_similar_trips"("target_user_id" "uuid", "destination_query" "text", "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_similar_trips"("target_user_id" "uuid", "destination_query" "text", "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_trip_progress"("trip_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_trip_progress"("trip_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_trip_progress"("trip_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_travel_profile"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_travel_profile"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_travel_profile"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_user_updated"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_user_updated"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_user_updated"() TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."match_travel_guides"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "destination_filter" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."match_travel_guides"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "destination_filter" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_travel_guides"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "destination_filter" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."match_user_preferences"("query_embedding" "public"."vector", "target_user_id" "uuid", "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_user_preferences"("query_embedding" "public"."vector", "target_user_id" "uuid", "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_user_preferences"("query_embedding" "public"."vector", "target_user_id" "uuid", "match_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_search_cache_is_expired"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_search_cache_is_expired"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_search_cache_is_expired"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "postgres";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "anon";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "service_role";



GRANT ALL ON FUNCTION "public"."show_limit"() TO "postgres";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."soft_delete_user"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."soft_delete_user"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."soft_delete_user"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_conversation_last_message"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_conversation_last_message"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_conversation_last_message"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_trip_actual_cost"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_trip_actual_cost"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_trip_actual_cost"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "service_role";












GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "service_role";









GRANT ALL ON TABLE "public"."active_trips" TO "anon";
GRANT ALL ON TABLE "public"."active_trips" TO "authenticated";
GRANT ALL ON TABLE "public"."active_trips" TO "service_role";



GRANT ALL ON TABLE "public"."admin_users" TO "anon";
GRANT ALL ON TABLE "public"."admin_users" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_users" TO "service_role";



GRANT ALL ON TABLE "public"."agent_feedback" TO "anon";
GRANT ALL ON TABLE "public"."agent_feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_feedback" TO "service_role";



GRANT ALL ON TABLE "public"."agent_runs" TO "anon";
GRANT ALL ON TABLE "public"."agent_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_runs" TO "service_role";



GRANT ALL ON TABLE "public"."agent_performance" TO "anon";
GRANT ALL ON TABLE "public"."agent_performance" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_performance" TO "service_role";



GRANT ALL ON TABLE "public"."agent_performance_summary" TO "anon";
GRANT ALL ON TABLE "public"."agent_performance_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_performance_summary" TO "service_role";



GRANT ALL ON TABLE "public"."airports" TO "anon";
GRANT ALL ON TABLE "public"."airports" TO "authenticated";
GRANT ALL ON TABLE "public"."airports" TO "service_role";



GRANT ALL ON TABLE "public"."api_usage_logs" TO "anon";
GRANT ALL ON TABLE "public"."api_usage_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."api_usage_logs" TO "service_role";



GRANT ALL ON TABLE "public"."attractions" TO "anon";
GRANT ALL ON TABLE "public"."attractions" TO "authenticated";
GRANT ALL ON TABLE "public"."attractions" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."bookings" TO "anon";
GRANT ALL ON TABLE "public"."bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."bookings" TO "service_role";



GRANT ALL ON TABLE "public"."cities" TO "anon";
GRANT ALL ON TABLE "public"."cities" TO "authenticated";
GRANT ALL ON TABLE "public"."cities" TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."countries" TO "anon";
GRANT ALL ON TABLE "public"."countries" TO "authenticated";
GRANT ALL ON TABLE "public"."countries" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."daily_revenue_summary" TO "anon";
GRANT ALL ON TABLE "public"."daily_revenue_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_revenue_summary" TO "service_role";



GRANT ALL ON TABLE "public"."email_logs" TO "anon";
GRANT ALL ON TABLE "public"."email_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."email_logs" TO "service_role";



GRANT ALL ON TABLE "public"."error_logs" TO "anon";
GRANT ALL ON TABLE "public"."error_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."error_logs" TO "service_role";



GRANT ALL ON TABLE "public"."feature_flags" TO "anon";
GRANT ALL ON TABLE "public"."feature_flags" TO "authenticated";
GRANT ALL ON TABLE "public"."feature_flags" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."trip_reviews" TO "anon";
GRANT ALL ON TABLE "public"."trip_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."trip_reviews" TO "service_role";



GRANT ALL ON TABLE "public"."trips" TO "anon";
GRANT ALL ON TABLE "public"."trips" TO "authenticated";
GRANT ALL ON TABLE "public"."trips" TO "service_role";



GRANT ALL ON TABLE "public"."popular_destinations" TO "anon";
GRANT ALL ON TABLE "public"."popular_destinations" TO "authenticated";
GRANT ALL ON TABLE "public"."popular_destinations" TO "service_role";



GRANT ALL ON TABLE "public"."revenue_analytics" TO "anon";
GRANT ALL ON TABLE "public"."revenue_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."revenue_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."search_cache" TO "anon";
GRANT ALL ON TABLE "public"."search_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."search_cache" TO "service_role";



GRANT ALL ON TABLE "public"."tool_calls" TO "anon";
GRANT ALL ON TABLE "public"."tool_calls" TO "authenticated";
GRANT ALL ON TABLE "public"."tool_calls" TO "service_role";



GRANT ALL ON TABLE "public"."travel_guides" TO "anon";
GRANT ALL ON TABLE "public"."travel_guides" TO "authenticated";
GRANT ALL ON TABLE "public"."travel_guides" TO "service_role";



GRANT ALL ON TABLE "public"."user_activity_logs" TO "anon";
GRANT ALL ON TABLE "public"."user_activity_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."user_activity_logs" TO "service_role";



GRANT ALL ON TABLE "public"."user_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."user_statistics" TO "anon";
GRANT ALL ON TABLE "public"."user_statistics" TO "authenticated";
GRANT ALL ON TABLE "public"."user_statistics" TO "service_role";



GRANT ALL ON TABLE "public"."user_travel_history" TO "anon";
GRANT ALL ON TABLE "public"."user_travel_history" TO "authenticated";
GRANT ALL ON TABLE "public"."user_travel_history" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























\unrestrict rAHYzX5K4VnhYWne53POmwmEUCsf8hPeVn3tkGIRNK5NbrvgdRjAIhQozKa1UJv

RESET ALL;
