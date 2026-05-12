# Backend Audit - Orbis AI API

**Date**: December 6, 2025  
**Purpose**: Identify active vs legacy code, redundant files, and cleanup opportunities

---

## 🎯 Current Active Architecture

### **Entry Point**
- `app/main.py` - ✅ **ACTIVE** - Main FastAPI application

### **Active Routers** (Registered in main.py)
1. `app/routers/health.py` - ✅ **ACTIVE** - Health checks
2. `app/routers/chat_stream.py` - ✅ **ACTIVE** - **PRIMARY CHAT ENDPOINT** (SSE streaming)
3. `app/routers/conversations.py` - ✅ **ACTIVE** - CRUD for conversations/messages
4. `app/api/v1/endpoints/auth.py` - ✅ **ACTIVE** - Authentication (via api_v1_router)

### **Active Services**
1. `app/services/gemini.py` - ✅ **ACTIVE** - Gemini AI service (NEW SDK)
2. `app/services/database.py` - ✅ **ACTIVE** - Supabase with circuit breaker
3. `app/services/redis.py` - ✅ **ACTIVE** - Redis caching
4. `app/services/memory_fallback.py` - ✅ **ACTIVE** - In-memory fallback
5. `app/services/chat_service.py` - ⚠️ **PARTIALLY USED** - Only for health checks

### **Active Agents** (LangGraph Multi-Agent)
1. `app/agents/langgraph_orchestrator.py` - ✅ **ACTIVE** - **PRIMARY ORCHESTRATOR**
2. `app/agents/base.py` - ✅ **ACTIVE** - Base agent classes

### **Active Configuration**
1. `app/config.py` - ✅ **ACTIVE** - Settings and environment
2. `app/logging_config.py` - ✅ **ACTIVE** - Comprehensive logging
3. `app/core/auth.py` - ✅ **ACTIVE** - Supabase auth service

---

## ❌ LEGACY / UNUSED CODE

### **Legacy Routers** (NOT REGISTERED)
```
📁 app/routers/chat.py
├── Status: ❌ UNUSED - NOT registered in main.py
├── Purpose: Old non-streaming chat endpoint
├── Uses: orchestrator_simple.py, chat_service
├── Replaced by: chat_stream.py (SSE streaming)
└── Recommendation: 🗑️ DELETE
```

### **Legacy Agents**
```
📁 app/agents/orchestrator_simple.py
├── Status: ⚠️ LEGACY - Still imported by routers/chat.py (unused)
├── Purpose: Old orchestrator without LangGraph
├── Version: 3.0 (manual routing, no proper graph)
├── Replaced by: langgraph_orchestrator.py
└── Recommendation: 🗑️ DELETE (after removing chat.py)
```

### **Legacy LLM Directory** (Empty/Obsolete)
```
📁 app/llm/
├── gemini.py - ❌ DUPLICATE of services/gemini.py
├── gemini_client.py - ❌ OLD client (used by orchestrator_simple.py)
├── base_client.py - ❌ Unused base class
├── embeddings/ - ❌ EMPTY folder
├── langgraph/ - ❌ EMPTY folder
├── prompts/ - ❌ EMPTY folder
└── tools/ - ❌ EMPTY folder

Recommendation: 🗑️ DELETE ENTIRE DIRECTORY
```

### **Empty Utility Directory**
```
📁 app/utils/
└── Status: ❌ COMPLETELY EMPTY

Recommendation: 🗑️ DELETE DIRECTORY
```

### **Legacy Database Structure** (Possibly Unused)
```
📁 app/db/
├── connection.py - ⚠️ Check if used (may be for SQLAlchemy)
├── migrations/ - ⚠️ Check contents (Alembic migrations?)
├── models/ - ⚠️ Check if used (SQLAlchemy models?)
├── schemas/ - ⚠️ Check contents
├── seeds/ - ⚠️ Check if used
└── vector/ - ⚠️ Check if used for vector embeddings

Status: 🔍 NEEDS INVESTIGATION
Note: We use Supabase client directly, may not need SQLAlchemy layer
```

### **Test Files in Root**
```
📁 apps/api/ (root)
├── test_fixes.py - ❓ One-off test script
├── test_gemini.py - ❓ Manual test script
└── test_integration.py - ❓ Manual test script

Recommendation: ⚠️ Move to tests/ directory or DELETE if obsolete
```

---

## 📊 Current Request Flow

### **Chat Streaming (ACTIVE)**
```
Frontend Request
    ↓
app/main.py (FastAPI)
    ↓
app/routers/chat_stream.py (/api/v1/chat/stream)
    ↓
app/services/database.py (save user message)
    ↓
app/agents/langgraph_orchestrator.py (LangGraph StateGraph)
    ↓ (intent analysis)
app/services/gemini.py (analyze_intent)
    ↓ (route to agent)
LangGraph conditional edges → agent node
    ↓
app/services/gemini.py (generate_response)
    ↓ (stream back)
SSE events → Frontend
    ↓
app/services/database.py (save assistant message)
```

### **UNUSED Flow (chat.py)**
```
❌ NOT ACCESSIBLE (router not registered)
    ↓
app/routers/chat.py
    ↓
app/agents/orchestrator_simple.py
    ↓
app/llm/gemini_client.py (OLD SDK)
    ↓
app/services/chat_service.py
```

---

## 🧹 Cleanup Recommendations

### **Priority 1: Delete Immediately** 🔴
These files are definitely not used and should be removed:

1. **`app/routers/chat.py`** - Old non-streaming endpoint (not registered)
2. **`app/agents/orchestrator_simple.py`** - Legacy orchestrator (replaced)
3. **`app/llm/` entire directory** - Duplicate/unused LLM code
   - `gemini.py`
   - `gemini_client.py`
   - `base_client.py`
   - `embeddings/` (empty)
   - `langgraph/` (empty)
   - `prompts/` (empty)
   - `tools/` (empty)
4. **`app/utils/` directory** - Completely empty

**Estimated savings**: ~800 lines of dead code

---

### **Priority 2: Investigate & Decide** 🟡

#### **A. Database Layer (`app/db/`)**
Current status: Supabase client used directly in `services/database.py`

**Check if needed:**
```bash
grep -r "from app.db" apps/api/app/
grep -r "import.*db.models" apps/api/app/
grep -r "alembic" apps/api/app/
```

**Questions:**
- Are SQLAlchemy models used anywhere?
- Are Alembic migrations active?
- Do we need vector embeddings?

**If NOT used → 🗑️ DELETE**

#### **B. Chat Service (`app/services/chat_service.py`)**
Currently only used for health checks.

**Options:**
1. **Keep** - If health checks are important
2. **Simplify** - Remove orchestration logic, keep health only
3. **Delete** - Move health check logic to health.py

**Recommendation:** Simplify to just health check wrapper

---

### **Priority 3: Reorganize** 🟢

#### **Move Test Scripts**
```bash
# Move to tests directory
mv apps/api/test_*.py apps/api/tests/manual/
```

Or delete if they're one-off scripts that are no longer needed.

---

## 📝 File Status Summary

### ✅ **Keep (Active)**
```
app/
├── main.py                          ✅ Entry point
├── config.py                        ✅ Configuration
├── logging_config.py                ✅ Logging
├── agents/
│   ├── base.py                      ✅ Base classes
│   └── langgraph_orchestrator.py   ✅ ACTIVE orchestrator
├── api/v1/
│   ├── router.py                    ✅ API v1 router
│   └── endpoints/auth.py            ✅ Auth endpoint
├── core/
│   └── auth.py                      ✅ Auth service
├── routers/
│   ├── chat_stream.py               ✅ ACTIVE streaming
│   ├── conversations.py             ✅ CRUD endpoints
│   └── health.py                    ✅ Health checks
└── services/
    ├── gemini.py                    ✅ AI service (NEW)
    ├── database.py                  ✅ Supabase
    ├── redis.py                     ✅ Caching
    ├── memory_fallback.py           ✅ Fallback
    └── chat_service.py              ⚠️ Partially used
```

### 🗑️ **Delete (Dead Code)**
```
app/
├── routers/
│   └── chat.py                      ❌ DELETE
├── agents/
│   └── orchestrator_simple.py       ❌ DELETE
├── llm/                             ❌ DELETE ENTIRE DIR
│   ├── gemini.py
│   ├── gemini_client.py
│   ├── base_client.py
│   ├── embeddings/
│   ├── langgraph/
│   ├── prompts/
│   └── tools/
└── utils/                           ❌ DELETE EMPTY DIR

Root:
├── test_fixes.py                    ❌ DELETE or MOVE
├── test_gemini.py                   ❌ DELETE or MOVE
└── test_integration.py              ❌ DELETE or MOVE
```

### 🔍 **Investigate**
```
app/
└── db/                              🔍 Check usage
    ├── connection.py
    ├── migrations/
    ├── models/
    ├── schemas/
    ├── seeds/
    └── vector/
```

---

## 🎯 Recommended Cleanup Plan

### **Phase 1: Safe Deletions** (No dependencies)
```bash
# Delete unused routers
rm apps/api/app/routers/chat.py

# Delete legacy agents
rm apps/api/app/agents/orchestrator_simple.py

# Delete entire llm directory
rm -rf apps/api/app/llm

# Delete empty utils directory
rm -rf apps/api/app/utils

# Move or delete test scripts
rm apps/api/test_*.py  # or move to tests/
```

**Impact:** Zero - these files aren't imported anywhere active

---

### **Phase 2: Investigate db/** (Check dependencies)
```bash
# Check if db module is used
grep -r "from app.db" apps/api/app/
grep -r "import.*db\." apps/api/app/

# If not used, delete
rm -rf apps/api/app/db
```

**Check manually:**
- Do any active files import from `app.db`?
- Are Alembic migrations running?
- Do we need SQLAlchemy models?

---

### **Phase 3: Simplify chat_service.py**
Keep only health check logic, remove orchestration code.

---

## 📈 Expected Benefits

After cleanup:
- ✅ **~1000 lines** of dead code removed
- ✅ Clearer codebase structure
- ✅ Faster IDE indexing
- ✅ Reduced confusion for developers
- ✅ No duplicate Gemini implementations
- ✅ Clear single responsibility per file

---

## ⚠️ Important Notes

1. **Don't delete** anything until you confirm it's not used
2. **Run tests** after each phase
3. **Git commit** after each phase (easy rollback)
4. **Check imports** before deleting files:
   ```bash
   grep -r "from app.llm" apps/api/app/
   grep -r "orchestrator_simple" apps/api/app/
   ```

---

## 🔗 Dependencies Check

Before deleting, run:
```bash
# Check what imports each file
cd apps/api
grep -r "from app.routers.chat import" app/
grep -r "from app.agents.orchestrator_simple import" app/
grep -r "from app.llm" app/
grep -r "from app.db" app/
grep -r "chat_service" app/
```

If output is empty or only shows deleted files → **SAFE TO DELETE**
