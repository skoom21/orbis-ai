"""
Unit tests for app.services.rag_service.RAGService

All external I/O (Gemini embedding API, Supabase RPC, Redis) is mocked.
"""

import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def _make_rag(gemini_mock=None, db_mock=None, redis_mock=None):
    """Build a RAGService with fully-mocked dependencies."""
    from app.services.rag_service import RAGService

    gemini = gemini_mock or MagicMock()
    db = db_mock or MagicMock()
    redis = redis_mock or MagicMock()
    return RAGService(gemini_service=gemini, db_service=db, redis_service=redis)


def _fake_embedding(dim: int = 768) -> list:
    return [0.1] * dim


# ---------------------------------------------------------------------------
# embed_text
# ---------------------------------------------------------------------------

class TestEmbedText:
    @pytest.mark.asyncio
    async def test_returns_embedding_on_success(self):
        gemini = MagicMock()
        gemini.get_embedding = AsyncMock(return_value=_fake_embedding())

        redis = MagicMock()
        redis.client = MagicMock()
        redis.client.get.return_value = None       # cache miss
        redis.client.setex = MagicMock()

        rag = _make_rag(gemini_mock=gemini, redis_mock=redis)
        result = await rag.embed_text("hotels in Tokyo")

        assert result is not None
        assert len(result) == 768
        gemini.get_embedding.assert_called_once_with("hotels in Tokyo")

    @pytest.mark.asyncio
    async def test_returns_cached_embedding_without_calling_gemini(self):
        cached = json.dumps(_fake_embedding())
        gemini = MagicMock()
        gemini.get_embedding = AsyncMock()

        redis = MagicMock()
        redis.client = MagicMock()
        redis.client.get.return_value = cached.encode()  # cache hit

        rag = _make_rag(gemini_mock=gemini, redis_mock=redis)
        result = await rag.embed_text("hotels in Tokyo")

        assert result is not None
        gemini.get_embedding.assert_not_called()

    @pytest.mark.asyncio
    async def test_returns_none_when_gemini_fails(self):
        gemini = MagicMock()
        gemini.get_embedding = AsyncMock(return_value=None)

        redis = MagicMock()
        redis.client = MagicMock()
        redis.client.get.return_value = None

        rag = _make_rag(gemini_mock=gemini, redis_mock=redis)
        result = await rag.embed_text("irrelevant query")

        assert result is None


# ---------------------------------------------------------------------------
# build_prompt_context
# ---------------------------------------------------------------------------

class TestBuildPromptContext:
    @pytest.mark.asyncio
    async def test_includes_travel_guide_section(self):
        gemini = MagicMock()
        gemini.get_embedding = AsyncMock(return_value=_fake_embedding())

        supabase_mock = MagicMock()
        supabase_mock.rpc.return_value.execute.return_value = MagicMock(
            data=[
                {
                    "destination": "Tokyo",
                    "title": "Top Food Spots",
                    "content": "Try tsukemen at...",
                    "similarity": 0.82,
                }
            ]
        )
        db = MagicMock()
        db.supabase = supabase_mock

        redis = MagicMock()
        redis.client = MagicMock()
        redis.client.get.return_value = None
        redis.client.setex = MagicMock()

        rag = _make_rag(gemini_mock=gemini, db_mock=db, redis_mock=redis)
        ctx = await rag.build_prompt_context("best food in Tokyo")

        assert "## Relevant Travel Knowledge" in ctx
        assert "Tokyo" in ctx
        assert "Top Food Spots" in ctx

    @pytest.mark.asyncio
    async def test_returns_empty_string_when_no_guides_found(self):
        gemini = MagicMock()
        gemini.get_embedding = AsyncMock(return_value=_fake_embedding())

        supabase_mock = MagicMock()
        supabase_mock.rpc.return_value.execute.return_value = MagicMock(data=[])
        db = MagicMock()
        db.supabase = supabase_mock

        redis = MagicMock()
        redis.client = MagicMock()
        redis.client.get.return_value = None

        rag = _make_rag(gemini_mock=gemini, db_mock=db, redis_mock=redis)
        ctx = await rag.build_prompt_context("hello")

        assert ctx == ""

    @pytest.mark.asyncio
    async def test_returns_empty_string_when_embedding_fails(self):
        gemini = MagicMock()
        gemini.get_embedding = AsyncMock(return_value=None)

        redis = MagicMock()
        redis.client = MagicMock()
        redis.client.get.return_value = None  # cache miss so embedding is attempted

        rag = _make_rag(gemini_mock=gemini, redis_mock=redis)
        ctx = await rag.build_prompt_context("anything")

        assert ctx == ""

    @pytest.mark.asyncio
    async def test_returns_cached_context_without_hitting_supabase(self):
        cached_ctx = "## Relevant Travel Knowledge\nCached content"
        gemini = MagicMock()
        gemini.get_embedding = AsyncMock()

        redis = MagicMock()
        redis.client = MagicMock()
        redis.client.get.return_value = cached_ctx.encode()

        db = MagicMock()
        rag = _make_rag(gemini_mock=gemini, db_mock=db, redis_mock=redis)
        ctx = await rag.build_prompt_context("any query")

        assert ctx == cached_ctx
        gemini.get_embedding.assert_not_called()
        db.supabase.rpc.assert_not_called()
