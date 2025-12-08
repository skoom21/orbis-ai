# Legacy Code Archive

This directory contains deprecated code that has been replaced by newer implementations but is preserved for reference.

**Date Moved:** December 6, 2024

## Directory Structure

### `routers/`
- **`chat.py`** (200 lines)
  - **Status:** Deprecated, not registered in `main.py`
  - **Replaced by:** `routers/chat_stream.py` (SSE streaming endpoint)
  - **Reason:** Non-streaming implementation replaced by SSE-based streaming chat

### `agents/`
- **`orchestrator_simple.py`** (306 lines)
  - **Status:** Deprecated
  - **Replaced by:** `agents/langgraph_orchestrator.py` (LangGraph StateGraph implementation)
  - **Reason:** Simple orchestration replaced by LangGraph multi-agent orchestration with conditional routing

### `llm/`
Entire directory moved - contained duplicate/outdated LLM implementations:
- **`gemini.py`** - Duplicate of `services/gemini.py`
- **`gemini_client.py`** - Old Gemini client implementation
- **`base_client.py`** - Base LLM client class
- **`embeddings/`** - Empty directory
- **`langgraph/`** - Empty directory
- **`prompts/`** - Empty directory
- **`tools/`** - Empty directory

**Replaced by:** `services/gemini.py` (centralized Gemini service with new SDK)

### `utils/`
- **Status:** Completely empty directory
- **Reason:** Never implemented, moved for cleanup

### `db/`
SQLAlchemy database layer - **Status under investigation**
- May be unused since Supabase is accessed directly via `services/database.py`
- Needs verification before removal

## Current Architecture (Active Code)

The current backend uses:
- **API:** FastAPI with SSE streaming (`routers/chat_stream.py`)
- **Orchestration:** LangGraph StateGraph (`agents/langgraph_orchestrator.py`)
- **AI:** Gemini via new SDK (`services/gemini.py`)
- **Database:** Supabase with circuit breaker (`services/database.py`)
- **Logging:** structlog with rotating file handlers (`logging_config.py`)

## Notes

- All legacy files preserved without deletion per user request
- No active imports should reference these files
- If needed for reference, files can be temporarily restored
- Eventually these files can be safely deleted after final review

## Audit Document

See `claude-docs/BACKEND_AUDIT.md` for comprehensive analysis of all backend files.
