# ORBIS AI — Full Tech Stack Overview

## Frontend

* **Next.js** (App Router)
* React + TypeScript
* TailwindCSS
* Shadcn/UI Components
* Deployed on Vercel

## Backend

* **Core API**: FastAPI (Python)
* **Optional Realtime / High-throughput Services**: ElysiaJS (Bun) for agents / streaming events
* REST + WebSocket endpoints

## AI & RAG Layer

* Python-based RAG pipelines
* pgvector embeddings in PostgreSQL (Supabase)
* Redis Upstash for caching + message queues (BullMQ equivalent)
* OpenAI APIs / LLM provider for itinerary generation

## Database

* **Supabase PostgreSQL**
* pgvector for semantic search
* Row-level security for user data

## Caching / Queueing

* Redis Upstash
* Task queues (BullMQ / RSMQ depending on JS/Python integration)

## File Storage

* Supabase Storage (tickets, trip PDFs, user files)

## Infrastructure & Deployment

* Frontend → Vercel
* Backend (FastAPI / ElysiaJS) → Fly.io or Render or Railway
* Background workers → Dockerized services on Railway / Fly.io

## DevOps & Tooling

* Docker & Docker Compose
* GitHub Actions for CI/CD
* Pre-commit hooks (Black, Ruff for Python; ESLint/Prettier for JS)

## Observability / Logging

* Sentry for error monitoring
* Supabase logs for DB insights
* Prometheus-compatible metrics (optional)

## Optional Enhancements

* NATS / Kafka for future agent-to-agent messaging
* Feature flagging with Flagsmith
* Analytics with PostHog
