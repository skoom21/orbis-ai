"""Redis service for caching and session management."""

from typing import Optional, Any, Dict
import json
import asyncio
import time
from dataclasses import dataclass, field
import redis.asyncio as redis
from app.config import settings

from app.logging_config import get_logger

logger = get_logger("redis")

@dataclass
class CircuitBreaker:
    """Simple circuit breaker for Redis operations."""
    failure_threshold: int = 5
    recovery_timeout: int = 60
    failures: int = field(default=0)
    last_failure_time: float = field(default=0)
    state: str = field(default="closed")  # closed, open, half_open
    
    def should_attempt(self) -> bool:
        """Check if we should attempt the operation."""
        if self.state == "closed":
            return True
        elif self.state == "open":
            if time.time() - self.last_failure_time > self.recovery_timeout:
                self.state = "half_open"
                return True
            return False
        else:  # half_open
            return True
    
    def record_success(self):
        """Record successful operation."""
        self.failures = 0
        self.state = "closed"
    
    def record_failure(self):
        """Record failed operation."""
        self.failures += 1
        self.last_failure_time = time.time()
        if self.failures >= self.failure_threshold:
            self.state = "open"
            logger.warning(f"Circuit breaker opened after {self.failures} failures")

class RedisService:
    """Handles Redis operations for caching and session management."""
    
    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        self.circuit_breaker = CircuitBreaker()
        # In-memory fallback for critical operations
        self._memory_cache: Dict[str, tuple[Any, float]] = {}  # (value, expiry_time)
        self._max_memory_items = 1000
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize Redis client with resilience settings."""
        try:
            if settings.REDIS_URL:
                # Clean up the Redis URL if needed
                redis_url = settings.REDIS_URL.strip().rstrip('"').strip('"')
                
                self.redis_client = redis.from_url(
                    redis_url,
                    decode_responses=True,
                    socket_connect_timeout=5,
                    socket_timeout=10,
                    retry_on_timeout=True,
                    health_check_interval=30
                )
                logger.info("Redis client initialized with resilience settings")
            else:
                logger.warning("Redis URL not configured - using memory fallback only")
        except Exception as e:
            logger.error("Failed to initialize Redis client", error=str(e))
            self.redis_client = None
    
    def _cleanup_memory_cache(self):
        """Clean up expired items from memory cache."""
        current_time = time.time()
        expired_keys = [key for key, (_, expiry) in self._memory_cache.items() 
                       if expiry < current_time]
        
        for key in expired_keys:
            del self._memory_cache[key]
        
        # Limit cache size
        if len(self._memory_cache) > self._max_memory_items:
            # Remove oldest items (simple FIFO)
            items_to_remove = len(self._memory_cache) - self._max_memory_items
            keys_to_remove = list(self._memory_cache.keys())[:items_to_remove]
            for key in keys_to_remove:
                del self._memory_cache[key]
    
    def _set_memory_cache(self, key: str, value: Any, expiry_seconds: int) -> bool:
        """Set value in memory cache with expiry."""
        try:
            self._cleanup_memory_cache()
            expiry_time = time.time() + expiry_seconds
            self._memory_cache[key] = (value, expiry_time)
            logger.debug("Memory cache set", key=key, expiry=expiry_seconds)
            return True
        except Exception as e:
            logger.error("Error setting memory cache", key=key, error=str(e))
            return False
    
    def _get_memory_cache(self, key: str) -> Optional[Any]:
        """Get value from memory cache."""
        try:
            self._cleanup_memory_cache()
            if key in self._memory_cache:
                value, expiry_time = self._memory_cache[key]
                if expiry_time > time.time():
                    return value
                else:
                    del self._memory_cache[key]
            return None
        except Exception as e:
            logger.error("Error getting memory cache", key=key, error=str(e))
            return None
    
    async def _execute_with_fallback(self, redis_op, fallback_op=None, *args, **kwargs):
        """Execute Redis operation with circuit breaker and fallback."""
        if not self.circuit_breaker.should_attempt():
            logger.warning("Circuit breaker open, using fallback")
            return fallback_op(*args, **kwargs) if fallback_op else None
        
        try:
            if not self.redis_client:
                raise redis.ConnectionError("Redis client not available")
            
            result = await redis_op(*args, **kwargs)
            self.circuit_breaker.record_success()
            return result
            
        except (redis.ConnectionError, redis.TimeoutError, 
                redis.RedisError, asyncio.TimeoutError) as e:
            logger.error("Redis operation failed", error=str(e), operation=redis_op.__name__)
            self.circuit_breaker.record_failure()
            
            # Try fallback if available
            if fallback_op:
                logger.info("Using fallback operation")
                return fallback_op(*args, **kwargs)
            return None
        
        except Exception as e:
            logger.error("Unexpected error in Redis operation", error=str(e))
            return fallback_op(*args, **kwargs) if fallback_op else None
    
    async def ping(self) -> bool:
        """Check Redis connection with timeout."""
        try:
            if self.redis_client:
                await asyncio.wait_for(self.redis_client.ping(), timeout=5.0)
                self.circuit_breaker.record_success()
                return True
            return False
        except (redis.ConnectionError, redis.TimeoutError, asyncio.TimeoutError) as e:
            logger.error("Redis ping failed", error=str(e))
            self.circuit_breaker.record_failure()
            return False
        except Exception as e:
            logger.error("Unexpected error in ping", error=str(e))
            return False
    
    async def set_cache(self, key: str, value: Any, expiry_seconds: int = 3600) -> bool:
        """Set a value in cache with expiry and memory fallback."""
        async def redis_set():
            if isinstance(value, (dict, list)):
                json_value = json.dumps(value)
            else:
                json_value = value
            await self.redis_client.setex(key, expiry_seconds, json_value)
            return True
        
        def memory_fallback():
            return self._set_memory_cache(key, value, expiry_seconds)
        
        result = await self._execute_with_fallback(redis_set, memory_fallback)
        if result:
            logger.debug("Cache set successfully", key=key, expiry=expiry_seconds)
        return result or False
    
    async def get_cache(self, key: str) -> Optional[Any]:
        """Get a value from cache with memory fallback."""
        async def redis_get():
            value = await self.redis_client.get(key)
            if value is None:
                return None
            
            # Try to parse as JSON
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value
        
        def memory_fallback():
            return self._get_memory_cache(key)
        
        result = await self._execute_with_fallback(redis_get, memory_fallback)
        return result
    
    async def delete_cache(self, key: str) -> bool:
        """Delete a key from cache."""
        try:
            if not self.redis_client:
                return False
            
            result = await self.redis_client.delete(key)
            logger.debug("Cache deleted", key=key, deleted=bool(result))
            return bool(result)
            
        except Exception as e:
            logger.error("Error deleting cache", key=key, error=str(e))
            return False
    
    async def set_session(self, session_id: str, session_data: Dict[str, Any], expiry_seconds: int = 86400) -> bool:
        """Set session data."""
        session_key = f"session:{session_id}"
        return await self.set_cache(session_key, session_data, expiry_seconds)
    
    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session data."""
        session_key = f"session:{session_id}"
        return await self.get_cache(session_key)
    
    async def delete_session(self, session_id: str) -> bool:
        """Delete session data."""
        session_key = f"session:{session_id}"
        return await self.delete_cache(session_key)
    
    async def cache_conversation(self, conversation_id: str, messages: list, expiry_seconds: int = 3600) -> bool:
        """Cache conversation messages for quick retrieval."""
        cache_key = f"conversation:{conversation_id}"
        return await self.set_cache(cache_key, messages, expiry_seconds)
    
    async def get_cached_conversation(self, conversation_id: str) -> Optional[list]:
        """Get cached conversation messages."""
        cache_key = f"conversation:{conversation_id}"
        return await self.get_cache(cache_key)
    
    async def cache_user_preferences(self, user_id: str, preferences: Dict[str, Any], expiry_seconds: int = 86400) -> bool:
        """Cache user preferences."""
        cache_key = f"user_prefs:{user_id}"
        return await self.set_cache(cache_key, preferences, expiry_seconds)
    
    async def get_cached_user_preferences(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get cached user preferences."""
        cache_key = f"user_prefs:{user_id}"
        return await self.get_cache(cache_key)
    
    async def increment_counter(self, key: str, expiry_seconds: int = 3600) -> int:
        """Increment a counter with automatic expiry."""
        try:
            if not self.redis_client:
                return 1
            
            # Use pipeline for atomic operation
            pipe = self.redis_client.pipeline()
            pipe.incr(key)
            pipe.expire(key, expiry_seconds)
            results = await pipe.execute()
            
            return results[0] if results else 1
            
        except Exception as e:
            logger.error("Error incrementing counter", key=key, error=str(e))
            return 1
    
    async def get_counter(self, key: str) -> int:
        """Get counter value."""
        try:
            if not self.redis_client:
                return 0
            
            value = await self.redis_client.get(key)
            return int(value) if value else 0
            
        except Exception as e:
            logger.error("Error getting counter", key=key, error=str(e))
            return 0

# Global Redis service instance
redis_service = RedisService()