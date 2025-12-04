"""Enhanced logging configuration for Orbis AI backend."""

import os
import sys
import logging
import logging.handlers
from pathlib import Path
from typing import Any
import structlog
from rich.console import Console
from rich.logging import RichHandler
from app.config import settings

# Create logs directory
LOGS_DIR = Path("logs")
LOGS_DIR.mkdir(exist_ok=True)

# Rich console for beautiful output
console = Console()

def setup_logging():
    """Set up comprehensive logging system."""
    
    # Clear any existing handlers
    structlog.reset_defaults()
    
    # Determine log level
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    
    # Configure standard library logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=log_level,
    )
    
    # Set up file handlers for different components
    handlers = setup_file_handlers()
    
    # Configure processors based on environment
    if settings.ENVIRONMENT == "development":
        processors = get_development_processors()
    else:
        processors = get_production_processors()
    
    # Configure structlog
    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(log_level),
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

def setup_file_handlers():
    """Set up rotating file handlers for different log types."""
    
    handlers = {}
    
    # Main application log
    handlers['main'] = logging.handlers.RotatingFileHandler(
        LOGS_DIR / "orbis_ai.log",
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5,
        encoding='utf-8'
    )
    
    # API requests log
    handlers['api'] = logging.handlers.RotatingFileHandler(
        LOGS_DIR / "api_requests.log",
        maxBytes=5*1024*1024,   # 5MB
        backupCount=3,
        encoding='utf-8'
    )
    
    # AI interactions log
    handlers['ai'] = logging.handlers.RotatingFileHandler(
        LOGS_DIR / "ai_interactions.log",
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5,
        encoding='utf-8'
    )
    
    # Database operations log
    handlers['database'] = logging.handlers.RotatingFileHandler(
        LOGS_DIR / "database.log",
        maxBytes=5*1024*1024,   # 5MB
        backupCount=3,
        encoding='utf-8'
    )
    
    # Error log (all errors)
    handlers['errors'] = logging.handlers.RotatingFileHandler(
        LOGS_DIR / "errors.log",
        maxBytes=10*1024*1024,  # 10MB
        backupCount=10,
        encoding='utf-8'
    )
    
    # Set formatters for file handlers
    file_formatter = logging.Formatter(
        '%(asctime)s | %(levelname)-8s | %(name)-20s | %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    for handler in handlers.values():
        handler.setFormatter(file_formatter)
    
    return handlers

def get_development_processors():
    """Get processors for development environment (rich console + files)."""
    return [
        # Add context and metadata
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.StackInfoRenderer(),
        
        # Filter and route to appropriate handlers
        filter_and_route_processor,
        
        # Console output (pretty formatted)
        structlog.dev.ConsoleRenderer(
            colors=True,
            exception_formatter=structlog.dev.plain_traceback,
        ),
    ]

def get_production_processors():
    """Get processors for production environment (JSON logs)."""
    return [
        # Add context and metadata
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        
        # Filter and route to appropriate handlers
        filter_and_route_processor,
        
        # JSON output for production
        structlog.processors.JSONRenderer(),
    ]

def filter_and_route_processor(logger, method_name, event_dict):
    """Custom processor to route logs to appropriate files."""
    
    # Get the logger name to determine routing
    logger_name = event_dict.get('logger', '')
    level = event_dict.get('level', 'info')
    
    # Route to error log for all errors
    if level in ['error', 'critical']:
        write_to_file('errors', event_dict)
    
    # Route based on logger name/component
    if 'gemini' in logger_name or 'orchestrator' in logger_name or event_dict.get('event', '').startswith(('Generated response', 'Processing message')):
        write_to_file('ai', event_dict)
    elif 'database' in logger_name or 'supabase' in logger_name:
        write_to_file('database', event_dict)
    elif 'chat' in logger_name or 'api' in logger_name or 'router' in logger_name:
        write_to_file('api', event_dict)
    else:
        write_to_file('main', event_dict)
    
    return event_dict

def write_to_file(log_type: str, event_dict: dict):
    """Write log entry to specific file."""
    try:
        handlers = getattr(write_to_file, '_handlers', None)
        if not handlers:
            write_to_file._handlers = setup_file_handlers()
            handlers = write_to_file._handlers
        
        if log_type in handlers:
            # Format for file output
            timestamp = event_dict.get('timestamp', '')
            level = event_dict.get('level', 'info').upper()
            logger_name = event_dict.get('logger', 'unknown')[:20]
            event = event_dict.get('event', '')
            
            # Add any additional context
            context_parts = []
            for key, value in event_dict.items():
                if key not in ['timestamp', 'level', 'logger', 'event']:
                    context_parts.append(f"{key}={value}")
            
            context_str = " | ".join(context_parts) if context_parts else ""
            
            log_message = f"{timestamp} | {level:8} | {logger_name:20} | {event}"
            if context_str:
                log_message += f" | {context_str}"
            
            handlers[log_type].emit(logging.LogRecord(
                name=logger_name,
                level=getattr(logging, level, logging.INFO),
                pathname="",
                lineno=0,
                msg=log_message,
                args=(),
                exc_info=None
            ))
    except Exception as e:
        # Fallback - don't break logging if file write fails
        print(f"Log write error: {e}")

def get_logger(name: str = None):
    """Get a configured logger instance."""
    return structlog.get_logger(name)

def log_request_response(request: Any, response: Any, duration: float):
    """Log API request/response for monitoring."""
    logger = get_logger("api.requests")
    logger.info(
        "API Request",
        method=request.method,
        url=str(request.url),
        status_code=getattr(response, 'status_code', 'unknown'),
        duration_ms=round(duration * 1000, 2),
        user_agent=request.headers.get('user-agent', ''),
        client_ip=getattr(request, 'client', {}).host if hasattr(request, 'client') else 'unknown'
    )

def log_ai_interaction(agent_type: str, user_message: str, ai_response: str, duration: float, metadata: dict = None):
    """Log AI interactions for analysis."""
    logger = get_logger("ai.interactions")
    logger.info(
        "AI Interaction",
        agent_type=agent_type,
        user_message_length=len(user_message),
        ai_response_length=len(ai_response),
        duration_ms=round(duration * 1000, 2),
        metadata=metadata or {}
    )

def log_database_operation(operation: str, table: str, duration: float, success: bool, error: str = None):
    """Log database operations."""
    logger = get_logger("database.operations")
    if success:
        logger.info(
            "Database Operation",
            operation=operation,
            table=table,
            duration_ms=round(duration * 1000, 2),
            status="success"
        )
    else:
        logger.error(
            "Database Operation Failed",
            operation=operation,
            table=table,
            duration_ms=round(duration * 1000, 2),
            error=error,
            status="failed"
        )

# Initialize logging when module is imported
setup_logging()