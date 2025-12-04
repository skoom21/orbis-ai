from typing import Optional, AsyncGenerator, Dict, Any
import os
from supabase import create_client, Client
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
import structlog
import redis.asyncio as redis

from app.config import settings

logger = structlog.get_logger()

# Global clients
supabase: Optional[Client] = None
engine = None
async_session_maker = None
redis_client: Optional[redis.Redis] = None

def init_supabase() -> Client:
    """Initialize Supabase client"""
    global supabase
    if not supabase and settings.SUPABASE_URL and settings.SUPABASE_ANON_KEY:
        try:
            supabase = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_ANON_KEY
            )
            logger.info("Supabase client initialized")
        except Exception as e:
            logger.error("Failed to initialize Supabase", error=str(e))
    return supabase

def init_database():
    """Initialize database engine and session maker"""
    global engine, async_session_maker
    
    if not engine:
        try:
            # Handle different database URL formats
            database_url = settings.DATABASE_URL
            if database_url.startswith("postgresql://"):
                database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")
            
            engine = create_async_engine(
                database_url,
                echo=settings.DATABASE_ECHO,
                pool_size=settings.DATABASE_POOL_SIZE,
                max_overflow=settings.DATABASE_MAX_OVERFLOW,
            )
            
            async_session_maker = sessionmaker(
                engine, class_=AsyncSession, expire_on_commit=False
            )
            
            logger.info("Database engine initialized", url=database_url.split("@")[-1])  # Hide credentials
        except Exception as e:
            logger.error("Failed to initialize database", error=str(e))

async def init_redis():
    """Initialize Redis client"""
    global redis_client
    if not redis_client:
        try:
            redis_client = redis.from_url(settings.REDIS_URL)
            # Test connection
            await redis_client.ping()
            logger.info("Redis client initialized")
        except Exception as e:
            logger.warning("Failed to initialize Redis", error=str(e))
            redis_client = None

async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Get database session for dependency injection"""
    if not async_session_maker:
        init_database()
    
    if async_session_maker:
        async with async_session_maker() as session:
            try:
                yield session
            except Exception as e:
                await session.rollback()
                logger.error("Database session error", error=str(e))
                raise
            finally:
                await session.close()
    else:
        # Fallback for when database is not available
        logger.warning("Database session not available")
        yield None

def get_supabase() -> Optional[Client]:
    """Get Supabase client for dependency injection"""
    return init_supabase()

async def get_redis() -> Optional[redis.Redis]:
    """Get Redis client for dependency injection"""
    if not redis_client:
        await init_redis()
    return redis_client