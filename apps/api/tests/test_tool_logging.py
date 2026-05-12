"""
Unit tests for app.agents.tools.base.log_tool_call

Tests verify:
  1. A successful tool call writes a 'success' row to tool_calls.
  2. A failing tool call writes an 'error' row and re-raises the exception.
  3. If the DB insert itself fails, the decorator swallows the error — it
     must NEVER break the wrapped tool.
  4. The tool's return value passes through unmodified.
"""

import pytest
from unittest.mock import MagicMock, patch, AsyncMock


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_insert_chain(supabase_mock):
    """Wire supabase_mock.table().insert().execute() chain."""
    table_mock = MagicMock()
    insert_mock = MagicMock()
    execute_mock = MagicMock(return_value=MagicMock(data=[{"id": "fake-id"}]))
    table_mock.insert.return_value = insert_mock
    insert_mock.execute = execute_mock
    supabase_mock.table.return_value = table_mock
    return supabase_mock, execute_mock


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestLogToolCallDecorator:

    @pytest.mark.asyncio
    async def test_passes_return_value_through(self):
        """Decorator must not alter the tool's return value."""
        from app.agents.tools.base import log_tool_call

        @log_tool_call
        async def my_tool() -> str:
            return '{"result": "ok"}'

        supabase_mock = MagicMock()
        _make_insert_chain(supabase_mock)

        with patch("app.services.database.db_service") as db_mock:
            db_mock.supabase = supabase_mock
            result = await my_tool()

        assert result == '{"result": "ok"}'

    @pytest.mark.asyncio
    async def test_writes_success_row_to_supabase(self):
        """On success, a row with status='success' is inserted."""
        from app.agents.tools.base import log_tool_call

        @log_tool_call
        async def tool_with_result() -> str:
            return '{"data": "hello"}'

        supabase_mock = MagicMock()
        _, execute_mock = _make_insert_chain(supabase_mock)

        with patch("app.services.database.db_service") as db_mock:
            db_mock.supabase = supabase_mock
            await tool_with_result()

        execute_mock.assert_called_once()
        inserted = supabase_mock.table.return_value.insert.call_args[0][0]
        assert inserted["tool_name"] == "tool_with_result"
        assert inserted["status"] == "success"
        assert inserted["error"] is None

    @pytest.mark.asyncio
    async def test_writes_error_row_and_reraises(self):
        """On tool failure, error row is logged AND the exception propagates."""
        from app.agents.tools.base import log_tool_call

        @log_tool_call
        async def failing_tool() -> str:
            raise ValueError("Something broke")

        supabase_mock = MagicMock()
        _, execute_mock = _make_insert_chain(supabase_mock)

        with patch("app.services.database.db_service") as db_mock:
            db_mock.supabase = supabase_mock
            with pytest.raises(ValueError, match="Something broke"):
                await failing_tool()

        execute_mock.assert_called_once()
        inserted = supabase_mock.table.return_value.insert.call_args[0][0]
        assert inserted["status"] == "error"
        assert "Something broke" in inserted["error"]

    @pytest.mark.asyncio
    async def test_does_not_raise_when_db_logging_fails(self):
        """If DB insert throws, the decorator must swallow it silently."""
        from app.agents.tools.base import log_tool_call

        @log_tool_call
        async def healthy_tool() -> str:
            return '{"ok": true}'

        supabase_mock = MagicMock()
        table_mock = MagicMock()
        insert_mock = MagicMock()
        # Make execute() raise a DB error
        insert_mock.execute.side_effect = Exception("DB connection lost")
        table_mock.insert.return_value = insert_mock
        supabase_mock.table.return_value = table_mock

        with patch("app.services.database.db_service") as db_mock:
            db_mock.supabase = supabase_mock
            # Should complete without raising despite DB failure
            result = await healthy_tool()

        assert result == '{"ok": true}'

    @pytest.mark.asyncio
    async def test_works_when_supabase_is_none(self):
        """If supabase is None (not configured), tool still executes normally."""
        from app.agents.tools.base import log_tool_call

        @log_tool_call
        async def simple_tool() -> str:
            return '{"result": "value"}'

        with patch("app.services.database.db_service") as db_mock:
            db_mock.supabase = None
            result = await simple_tool()

        assert result == '{"result": "value"}'
