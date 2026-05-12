"""Base utilities shared across all agent tools."""

import json
import time
import functools
from typing import Any, Callable
from app.logging_config import get_logger

logger = get_logger("agents.tools.base")


def tool_error_handler(func: Callable) -> Callable:
    """Decorator that catches all exceptions and returns a JSON error string instead of raising."""
    @functools.wraps(func)
    async def wrapper(*args, **kwargs) -> str:
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            logger.error(f"Tool error in {func.__name__}", error=str(e))
            return json.dumps({"error": str(e), "tool": func.__name__})
    return wrapper


def format_result(data: Any, label: str = "result") -> str:
    """Serialize a result dict/list to a compact JSON string for LLM consumption."""
    try:
        return json.dumps({label: data}, ensure_ascii=False, default=str)
    except Exception:
        return str(data)


def log_tool_call(func: Callable) -> Callable:
    """
    Decorator that records each tool invocation to the `tool_calls` Supabase table.

    Captures: tool_name, input args, output (truncated), duration_ms.
    Logging failures are swallowed — they must NEVER break the actual tool call.

    Usage:
        @tool
        @log_tool_call
        async def my_tool(...) -> str: ...
    """
    @functools.wraps(func)
    async def wrapper(*args, **kwargs) -> str:
        start = time.perf_counter()
        result: str = ""
        error: str | None = None
        try:
            result = await func(*args, **kwargs)
            return result
        except Exception as e:
            error = str(e)
            raise
        finally:
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            _write_tool_call_log(
                tool_name=func.__name__,
                input_data={"args": args, "kwargs": kwargs},
                output=result,
                duration_ms=duration_ms,
                error=error,
            )

    return wrapper


def _write_tool_call_log(
    tool_name: str,
    input_data: dict,
    output: str,
    duration_ms: float,
    error: str | None = None,
) -> None:
    """Fire-and-forget: write a tool_calls row to Supabase. Never raises."""
    try:
        from app.services.database import db_service  # lazy import to avoid circular

        if not db_service.supabase:
            return

        # Truncate large inputs / outputs so they fit in the DB column
        input_str = json.dumps(input_data, default=str)[:2000]
        output_str = (output or "")[:4000]

        db_service.supabase.table("tool_calls").insert({
            "tool_name": tool_name,
            "input": input_str,
            "output": output_str,
            "duration_ms": duration_ms,
            "error": error,
            "status": "error" if error else "success",
        }).execute()

        logger.debug(
            "tool_call logged",
            tool=tool_name,
            duration_ms=duration_ms,
            status="error" if error else "success",
        )
    except Exception as log_err:
        # Absolutely must not propagate
        logger.warning("Failed to log tool_call to DB", tool=tool_name, error=str(log_err))
