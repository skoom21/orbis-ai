# 🧠 RAG Pipeline Implementation Report

> Generated: December 6, 2025

## 1. Current Status Analysis

### 🔍 Database Schema vs. Configuration
We detected a critical mismatch between the repository schema definition and the live database/backend configuration.

| Component | Setting | Status | Notes |
|-----------|---------|--------|-------|
| **Repo Schema** (`db_schema.sql`) | `VECTOR(1536)` | ❌ **Incorrect** | Configured for OpenAI (`text-embedding-ada-002`) |
| **Live Database** | `VECTOR(768)` | ✅ **Correct** | Matches Gemini embedding dimensions |
| **Backend Config** (`config.py`) | `768` | ✅ **Correct** | `GEMINI_EMBEDDING_MODEL="models/embedding-001"` |

**Impact**: If the `db_schema.sql` is used to reset or deploy a new database, it will create columns with the wrong dimensions (1536), causing runtime errors when the backend tries to insert Gemini embeddings (768).

### 🧩 Missing Components
1.  **Vector Search Functions**: The `db_schema.sql` file does not contain the necessary PostgreSQL functions (RPCs) to perform similarity searches (e.g., `match_documents` or `match_user_preferences`).
2.  **Embedding Generation**: The `GeminiService` class in `apps/api/app/services/gemini.py` currently lacks a method to generate embeddings from text.

---

## 2. Implementation Plan

### Step 1: Update Database Schema
We need to update `db_schema.sql` to reflect the correct embedding dimension (768) and add the missing search functions.

#### 1.1 Update Vector Dimensions
Find all occurrences of `VECTOR(1536)` and replace them with `VECTOR(768)`.

#### 1.2 Create Search Functions
Add the following SQL functions to `db_schema.sql` to enable RAG retrieval via Supabase RPC:

```sql
-- Function to match user preferences
create or replace function match_user_preferences (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  user_id uuid,
  preference_text text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    user_preferences.id,
    user_preferences.user_id,
    user_preferences.preference_text,
    1 - (user_preferences.preference_embedding <=> query_embedding) as similarity
  from user_preferences
  where 1 - (user_preferences.preference_embedding <=> query_embedding) > match_threshold
  order by user_preferences.preference_embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Function to match travel guides (if applicable)
create or replace function match_travel_guides (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  title text,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    travel_guides.id,
    travel_guides.title,
    travel_guides.content,
    1 - (travel_guides.content_embedding <=> query_embedding) as similarity
  from travel_guides
  where 1 - (travel_guides.content_embedding <=> query_embedding) > match_threshold
  order by travel_guides.content_embedding <=> query_embedding
  limit match_count;
end;
$$;
```

### Step 2: Update Backend Service (`GeminiService`)
Add the embedding generation capability to `apps/api/app/services/gemini.py`.

```python
    async def get_embedding(self, text: str) -> Optional[List[float]]:
        """Generate embedding for the given text."""
        try:
            if not self.client:
                return None
                
            # Clean text
            text = text.replace("\n", " ")
            
            response = self.client.models.embed_content(
                model=settings.GEMINI_EMBEDDING_MODEL,
                content=text,
            )
            
            if response and response.embedding:
                return response.embedding.values
            return None
            
        except Exception as e:
            logger.error("Error generating embedding", error=str(e))
            return None
```

### Step 3: Create RAG Service
Create a new service `apps/api/app/services/rag_service.py` to orchestrate the retrieval process.

**Workflow**:
1.  **Input**: User query (e.g., "Plan a trip to Paris for a foodie").
2.  **Embed**: Call `GeminiService.get_embedding(query)`.
3.  **Search**: Call Supabase RPC `match_travel_guides` and `match_user_preferences` with the vector.
4.  **Contextualize**: Format the retrieved rows into a context string.
5.  **Generate**: Pass the context + query to the LLM.

### Step 4: Data Ingestion Strategy
To make RAG effective, we need to populate the vector tables.

1.  **User Preferences**:
    *   When a user updates their profile/preferences, trigger a background task to generate a natural language summary (e.g., "User likes hiking and budget hotels") and embed it into `user_preferences.preference_embedding`.
2.  **Travel Content**:
    *   Create a script to ingest travel guides/destinations.
    *   Chunk long content into smaller segments (e.g., 500-1000 tokens).
    *   Generate embeddings for each chunk and store them.

---

## 3. Action Items Checklist

- [ ] **Fix Schema**: Update `db_schema.sql` (1536 -> 768).
- [ ] **Add RPCs**: Add `match_user_preferences` and other search functions to schema.
- [ ] **Update GeminiService**: Implement `get_embedding` method.
- [ ] **Create RAGService**: Implement retrieval logic.
- [ ] **Migration**: Run the schema update on the live database (if not already done).
