# Orbis AI Backend - Quick Start Guide

## Phase 1.1 Complete! ✅

All foundational infrastructure is now set up. Here's what's ready:

### ✅ Completed Components

1. **FastAPI Backend Structure**
   - Clean service architecture with circuit breakers
   - Gemini AI integration (gemini-2.5-flash)
   - Database service with Supabase + memory fallback
   - Redis caching with memory fallback
   - Chat service with conversation management

2. **Docker Compose Environment**
   - PostgreSQL 15 with pgvector extension
   - Redis 7 with persistence
   - FastAPI app with hot reload
   - Volume mounts for development

3. **Configuration Management**
   - Pydantic Settings with environment variables
   - `.env.example` template provided
   - Comprehensive logging with structlog
   - Rich console output for development
   - Rotating file handlers for production

4. **Code Quality Tools**
   - Pre-commit hooks configured
   - Black (formatter)
   - isort (import sorting)
   - Flake8 (linting)
   - Mypy (type checking)
   - Bandit (security scanning)
   - Prettier (frontend)

5. **CORS & Security**
   - CORS middleware configured
   - Configurable allowed origins
   - Request/response logging middleware
   - Health check endpoints

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd apps/api
pip install -r requirements.txt
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
# Edit .env with your actual credentials:
# - SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY
# - GOOGLE_API_KEY (for Gemini)
# - SECRET_KEY (generate a secure random key)
```

### 3. Install Pre-commit Hooks

```bash
pre-commit install
```

This will automatically run code quality checks before each commit.

### 4. Start Development Environment

```bash
# Start all services (FastAPI, PostgreSQL, Redis)
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

### 5. Access the Application

- **API Docs (Swagger):** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc
- **Health Check:** http://localhost:8000/health
- **Test Chat Interface:** http://localhost:8000/

---

## 📁 Project Structure

```
apps/api/
├── app/
│   ├── main.py                 # FastAPI app entry point
│   ├── config.py               # Pydantic settings
│   ├── logging_config.py       # Logging setup
│   ├── routers/
│   │   ├── chat.py            # Chat endpoints
│   │   └── health.py          # Health check endpoints
│   └── services/
│       ├── chat_service.py    # Chat orchestration
│       ├── gemini.py          # Gemini AI client
│       ├── database.py        # Supabase client
│       ├── redis.py           # Redis client
│       └── memory_fallback.py # In-memory fallback
├── tests/                      # Test suite (to be created)
├── docker-compose.yml          # Local dev environment
├── Dockerfile                  # Production image
├── requirements.txt            # Python dependencies
├── pyproject.toml             # Tool configurations
└── .env.example               # Environment template
```

---

## 🧪 Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_chat.py
```

**Note:** Test suite will be implemented in Phase 1.3 and Phase 8.

---

## 🛠️ Development Workflow

### Code Quality Checks

Pre-commit hooks will automatically run on `git commit`, but you can also run them manually:

```bash
# Run all hooks on all files
pre-commit run --all-files

# Run specific hook
pre-commit run black --all-files
pre-commit run flake8 --all-files
```

### Manual Formatting

```bash
# Format code with black
black apps/api/app

# Sort imports
isort apps/api/app

# Type check
mypy apps/api/app

# Lint
flake8 apps/api/app

# Security scan
bandit -r apps/api/app
```

---

## 🔧 Configuration Options

### Logging Levels

In `.env`, set `LOG_LEVEL`:
- `DEBUG` - Verbose logging (development)
- `INFO` - Standard logging (default)
- `WARNING` - Warnings and errors only
- `ERROR` - Errors only

### Logs Directory

All logs are written to `apps/api/logs/`:
- `orbis_ai.log` - Main application log
- `api_requests.log` - HTTP request/response log
- `ai_interactions.log` - Gemini AI interactions
- `database.log` - Database operations
- `errors.log` - All errors across services

### Docker Compose Services

- **api:** FastAPI app on port 8000
- **db:** PostgreSQL with pgvector on port 5432
- **redis:** Redis cache on port 6379

---

## 📊 Service Health Monitoring

The backend includes comprehensive health checks:

```bash
# Check overall health
curl http://localhost:8000/health

# Example response:
{
  "status": "healthy",
  "timestamp": "2025-01-XX",
  "services": {
    "api": "operational",
    "database": "operational",
    "cache": "operational",
    "gemini": "operational"
  }
}
```

On startup, the application logs service connection status:
- ✅ Service connected and operational
- ❌ Service unavailable (memory fallback active)
- ⚠️ Service degraded

---

## 🔥 Circuit Breaker Pattern

Both Redis and Supabase services include circuit breakers:

- **Automatic fallback** to in-memory storage on failure
- **Exponential backoff** for retries
- **Graceful degradation** instead of crashes
- **Self-healing** when services recover

This ensures the API remains responsive even if external services fail.

---

## 🎯 Next Steps

Phase 1.1 is **COMPLETE**. Ready to proceed with:

### Phase 1.2: Database Connection & Services
- [ ] Connection pooling with pgbouncer
- [ ] Alembic migrations setup
- [ ] Database seed scripts for reference data

### Phase 1.3: Authentication & Authorization
- [ ] Supabase Auth integration
- [ ] JWT middleware
- [ ] User registration/login endpoints

### Phase 1.4: Redis Caching Enhancement
- [ ] Cache invalidation strategies
- [ ] Cache warming
- [ ] Pub/sub for real-time updates

### Phase 2: RAG Pipeline
- [ ] OpenAI embeddings integration
- [ ] Vector similarity search
- [ ] Travel guide ingestion

---

## 🐛 Troubleshooting

### Database Connection Issues

If you see foreign key errors, ensure conversations are created with proper `user_id`:
```python
# Fixed in database.py and chat_service.py
db_service.add_message(conversation_id, content, role, metadata, user_id)
```

### Gemini API Errors

The `close()` method error is already fixed - client is auto-managed by Google SDK.

### Port Conflicts

If ports 8000, 5432, or 6379 are in use:
```bash
# Find process using port
lsof -i :8000

# Or change ports in docker-compose.yml
```

---

## 📚 Documentation

- [API Guide](./API_GUIDE.md) - Complete API endpoint documentation
- [Backend TODO](./BACKEND_TODO.md) - Full development roadmap
- [Database Schema](../db_schema.sql) - PostgreSQL schema with pgvector

---

**Status:** Phase 1.1 Complete ✅  
**Next Phase:** 1.2 - Database Connection & Services  
**Overall Progress:** ~8% of total backend tasks
