from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field
import os

class Settings(BaseSettings):
    """Application settings"""
    
    # Environment
    ENVIRONMENT: str = Field(default="development", description="Environment name")
    DEBUG: bool = Field(default=True, description="Debug mode")
    
    # API Configuration
    API_HOST: str = Field(default="0.0.0.0", description="API host")
    API_PORT: int = Field(default=8000, description="API port")
    SECRET_KEY: str = Field(default="dev-secret-key", description="Secret key for JWT")
    ALLOWED_ORIGINS: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:8000"],
        description="Allowed CORS origins"
    )
    
    # Supabase Configuration
    SUPABASE_URL: str = Field(default="", description="Supabase project URL")
    SUPABASE_ANON_KEY: str = Field(default="", description="Supabase anon key")
    SUPABASE_SERVICE_KEY: str = Field(default="", description="Supabase service role key")
    SUPABASE_JWT_SECRET: str = Field(default="", description="Supabase JWT secret for token verification")
    
    # Database Configuration
    DATABASE_URL: str = Field(default="sqlite:///./orbis_ai.db", description="PostgreSQL database URL")
    DATABASE_ECHO: bool = Field(default=False, description="Echo SQL queries")
    DATABASE_POOL_SIZE: int = Field(default=10, description="Database pool size")
    DATABASE_MAX_OVERFLOW: int = Field(default=20, description="Database max overflow")
    
    # Google Gemini Configuration
    GOOGLE_API_KEY: str = Field(default="", description="Google AI API key")
    GEMINI_MODEL: str = Field(default="gemini-2.0-flash-exp", description="Gemini model name")
    GEMINI_EMBEDDING_MODEL: str = Field(
        default="models/embedding-001", 
        description="Gemini embedding model"
    )
    EMBEDDING_DIMENSION: int = Field(default=768, description="Embedding dimension")
    
    # Redis Configuration
    REDIS_URL: str = Field(
        default="redis://localhost:6379",
        description="Redis connection URL"
    )
    
    # JWT Configuration
    JWT_SECRET_KEY: str = Field(default="dev-secret-key", description="JWT secret key")
    JWT_ALGORITHM: str = Field(default="HS256", description="JWT algorithm")
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30, description="JWT token expiry minutes")
    
    # External APIs (for future use)
    AMADEUS_API_KEY: Optional[str] = Field(default=None, description="Amadeus API key")
    AMADEUS_API_SECRET: Optional[str] = Field(default=None, description="Amadeus API secret")
    
    # Logging
    LOG_LEVEL: str = Field(default="INFO", description="Logging level")
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = Field(default=100, description="Requests per minute")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()