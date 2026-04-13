"""Base utilities shared across all agent tools."""

import json
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
