"""
RAG (Retrieval-Augmented Generation) service.

Retrieves relevant travel guide content and user preference context,
then formats it into a prompt-ready string to be injected into agent prompts.
"""

import hashlib
import json
from typing import Optional

from app.services.gemini import GeminiService
from app.services.database import DatabaseService
from app.services.redis import RedisService
from app.logging_config import get_logger

logger = get_logger("rag")

# Module-level service singletons (injected or created lazily)
_gemini: Optional[GeminiService] = None
_db: Optional[DatabaseService] = None
_redis: Optional[RedisService] = None


def _get_services():
    global _gemini, _db, _redis
    if _gemini is None:
        _gemini = GeminiService()
    if _db is None:
        _db = DatabaseService()
    if _redis is None:
        _redis = RedisService()
    return _gemini, _db, _redis


class RAGService:
    """
    Orchestrates the RAG pipeline:
    1. Embed the user query via Gemini
    2. Search travel_guides (semantic similarity)
    3. Search user_preferences (personalisation)
    4. Return formatted context string for injection into LLM prompts
    """

    EMBEDDING_TTL = 86400  # 24 hours
    CONTEXT_TTL = 300       # 5 minutes per query

    def __init__(
        self,
        gemini_service: Optional[GeminiService] = None,
        db_service: Optional[DatabaseService] = None,
        redis_service: Optional[RedisService] = None,
    ):
        if gemini_service and db_service and redis_service:
            self._gemini = gemini_service
            self._db = db_service
            self._redis = redis_service
        else:
            self._gemini, self._db, self._redis = _get_services()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def build_prompt_context(
        self,
        query: str,
        user_id: Optional[str] = None,
        match_threshold: float = 0.5,
        guide_limit: int = 4,
        pref_limit: int = 2,
    ) -> str:
        """
        Return a formatted context string ready to be prepended to an LLM system prompt.

        Args:
            query: The user's latest message / query.
            user_id: If provided, also fetch personalised preference context.
            match_threshold: Minimum cosine similarity for results (0–1).
            guide_limit: Max number of travel guide snippets to retrieve.
            pref_limit: Max number of user preference records to retrieve.

        Returns:
            A formatted string like:
                ## Relevant Travel Knowledge
                [guide snippets]

                ## Your Travel Preferences
                [preference text]
        """
        # Cache key based on query + user_id
        cache_key = f"rag:context:{hashlib.sha256(f'{query}:{user_id}'.encode()).hexdigest()[:16]}"
        cached = await self._redis_get(cache_key)
        if cached:
            logger.debug("RAG context cache hit", cache_key=cache_key)
            return cached

        embedding = await self._get_embedding_cached(query)
        if not embedding:
            logger.warning("Could not generate embedding for RAG query", query_preview=query[:80])
            return ""

        parts = []

        # 1. Travel guide context
        guide_context = await self._retrieve_travel_guides(embedding, match_threshold, guide_limit)
        if guide_context:
            parts.append("## Relevant Travel Knowledge\n" + guide_context)

        # 2. User preference context (personalisation)
        if user_id:
            pref_context = await self._retrieve_user_preferences(embedding, user_id, match_threshold, pref_limit)
            if pref_context:
                parts.append("## Your Travel Preferences\n" + pref_context)

        result = "\n\n".join(parts)
        if result:
            await self._redis_set(cache_key, result, ttl=self.CONTEXT_TTL)
        return result

    async def embed_text(self, text: str) -> Optional[list]:
        """Public helper to generate and cache an embedding for arbitrary text."""
        return await self._get_embedding_cached(text)

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    async def _get_embedding_cached(self, text: str) -> Optional[list]:
        """Generate embedding with Redis caching to save API quota."""
        cache_key = f"emb:{hashlib.sha256(text.encode()).hexdigest()}"
        cached = await self._redis_get(cache_key)
        if cached:
            try:
                return json.loads(cached)
            except Exception:
                pass

        embedding = await self._gemini.get_embedding(text)
        if embedding:
            await self._redis_set(cache_key, json.dumps(embedding), ttl=self.EMBEDDING_TTL)
        return embedding

    async def _retrieve_travel_guides(
        self,
        embedding: list,
        threshold: float,
        limit: int,
    ) -> str:
        """Call match_travel_guides RPC and format results."""
        try:
            if not self._db.supabase:
                return ""
            result = self._db.supabase.rpc(
                "match_travel_guides",
                {
                    "query_embedding": embedding,
                    "match_threshold": threshold,
                    "match_count": limit,
                },
            ).execute()

            if not result.data:
                return ""

            snippets = []
            for row in result.data:
                dest = row.get("destination", "")
                title = row.get("title", "")
                content = row.get("content", "")
                sim = round(row.get("similarity", 0), 3)
                snippets.append(f"[{dest} — {title} (relevance: {sim})]\n{content}")

            logger.info("RAG retrieved travel guides", count=len(snippets))
            return "\n\n".join(snippets)

        except Exception as e:
            logger.error("Error retrieving travel guides via RAG", error=str(e))
            return ""

    async def _retrieve_user_preferences(
        self,
        embedding: list,
        user_id: str,
        threshold: float,
        limit: int,
    ) -> str:
        """Call match_user_preferences RPC and format results."""
        try:
            if not self._db.supabase:
                return ""
            result = self._db.supabase.rpc(
                "match_user_preferences",
                {
                    "query_embedding": embedding,
                    "target_user_id": user_id,
                    "match_threshold": threshold,
                    "match_count": limit,
                },
            ).execute()

            if not result.data:
                return ""

            texts = [row.get("preference_text", "") for row in result.data if row.get("preference_text")]
            logger.info("RAG retrieved user preferences", count=len(texts))
            return "\n".join(texts)

        except Exception as e:
            logger.error("Error retrieving user preferences via RAG", error=str(e))
            return ""

    async def _redis_get(self, key: str) -> Optional[str]:
        try:
            if self._redis and self._redis.client:
                val = self._redis.client.get(key)
                return val.decode() if isinstance(val, bytes) else val
        except Exception:
            pass
        return None

    async def _redis_set(self, key: str, value: str, ttl: int = 300):
        try:
            if self._redis and self._redis.client:
                self._redis.client.setex(key, ttl, value)
        except Exception:
            pass


# ------------------------------------------------------------------
# Script: embed all travel guides (run once)
# ------------------------------------------------------------------

async def embed_all_travel_guides():
    """
    One-time script to generate and store embeddings for all travel_guides rows
    that currently have NULL content_embedding.

    Usage:
        cd apps/api && python -m app.services.rag_service
    """
    import asyncio

    gemini, db, _ = _get_services()

    if not db.supabase:
        print("ERROR: Supabase not connected")
        return

    rows = db.supabase.table("travel_guides").select("id, title, destination, content").execute()
    if not rows.data:
        print("No travel guides found")
        return

    print(f"Found {len(rows.data)} travel guides. Generating embeddings...")
    updated = 0
    for guide in rows.data:
        gid = guide["id"]
        text = f"{guide.get('destination', '')} — {guide.get('title', '')}\n{guide.get('content', '')}"
        embedding = await gemini.get_embedding(text)
        if embedding:
            db.supabase.table("travel_guides").update({"content_embedding": embedding}).eq("id", gid).execute()
            updated += 1
            print(f"  ✓ Embedded: {guide.get('title')}")
        else:
            print(f"  ✗ Failed:   {guide.get('title')}")

    print(f"\nDone. {updated}/{len(rows.data)} guides embedded.")


if __name__ == "__main__":
    import asyncio
    asyncio.run(embed_all_travel_guides())
