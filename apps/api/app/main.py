from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import time
import os

from app.config import settings
from app.routers import chat, health
from app.api.v1 import router as api_v1_router
# Import our enhanced logging system
from app.logging_config import get_logger, log_request_response

logger = get_logger("main")

# Create FastAPI application
app = FastAPI(
    title="Orbis AI Backend",
    description="Intelligent travel planning system with multi-agent AI architecture",
    version="2.0.0",
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
)

# Add request/response logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    # Log the request/response
    log_request_response(request, response, process_time)
    
    # Add timing header
    response.headers["X-Process-Time"] = str(process_time)
    return response

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for test interface
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

# Include routers
app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(chat.router, prefix="/api/v1/chat", tags=["chat"])
app.include_router(api_v1_router.router, prefix="/api")

@app.get("/", response_class=HTMLResponse)
async def root():
    """Serve simple test chat interface"""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Orbis AI Test Chat</title>
        <link rel="stylesheet" href="/static/style.css">
    </head>
    <body>
        <div class="chat-container">
            <div class="chat-header">
                <h1>🌍 Orbis AI</h1>
                <p>Your intelligent travel planning assistant</p>
                <button onclick="newConversation()" class="new-chat-btn">New Chat</button>
            </div>
            <div id="messages" class="messages-container"></div>
            <div class="quick-actions">
                <button class="quick-btn" onclick="quickMessage('I want to plan a trip to Paris')">Plan Paris Trip</button>
                <button class="quick-btn" onclick="quickMessage('Find flights to Tokyo')">Flights to Tokyo</button>
                <button class="quick-btn" onclick="quickMessage('Book hotel in New York')">NYC Hotels</button>
                <button class="quick-btn" onclick="quickMessage('Create 7-day Italy itinerary')">Italy Itinerary</button>
            </div>
            <div class="input-container">
                <input type="text" id="message-input" placeholder="Ask about travel plans...">
                <button id="send-button" onclick="sendMessage()">Send</button>
            </div>
        </div>
        <script src="/static/script.js"></script>
    </body>
    </html>
    """

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info(
        "🚀 Starting Orbis AI Backend",
        environment=settings.ENVIRONMENT,
        version="2.0.0",
        api_host=settings.API_HOST,
        api_port=settings.API_PORT,
        debug=settings.DEBUG
    )
    
    # Test service connections with comprehensive health check
    from app.services.gemini import gemini_service
    from app.services.redis import redis_service
    from app.services.database import db_service
    from app.services.chat_service import chat_service
    
    logger.info("🔧 Testing service connections...")
    
    # Test Gemini
    if gemini_service.client:
        logger.info("✅ Gemini AI service connected")
    else:
        logger.warning("❌ Gemini AI service not configured")
    
    # Test Redis with circuit breaker
    try:
        redis_ok = await redis_service.ping()
        if redis_ok:
            logger.info("✅ Redis cache service connected")
        else:
            logger.warning("❌ Redis cache service not responding - memory fallback active")
    except Exception as e:
        logger.warning("❌ Redis cache service failed - memory fallback active", error=str(e))
    
    # Test Database with circuit breaker
    try:
        health = db_service.health_check()
        if health["supabase_available"]:
            logger.info("✅ Supabase database service connected")
        else:
            logger.warning("❌ Supabase database service failed - memory fallback active")
    except Exception as e:
        logger.warning("❌ Supabase database service failed - memory fallback active", error=str(e))
    
    # Test overall chat service health
    try:
        chat_health = await chat_service.health_check()
        status = chat_health.get("status", "unknown")
        if status == "healthy":
            logger.info("✅ Chat service fully operational")
        elif status == "partial":
            logger.warning("⚠️ Chat service partially operational - some degraded services")
        elif status == "degraded":
            logger.warning("🔄 Chat service in degraded mode - using memory fallback")
        else:
            logger.error("❌ Chat service unhealthy")
    except Exception as e:
        logger.error("❌ Chat service health check failed", error=str(e))
    
    logger.info("🎯 Orbis AI Backend startup complete!")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("🛑 Shutting down Orbis AI Backend...")
    
    # Cleanup resources
    from app.services.gemini import gemini_service
    try:
        gemini_service.close()
        logger.info("✅ Gemini service closed")
    except Exception as e:
        logger.error("❌ Error closing Gemini service", error=str(e))
    
    logger.info("👋 Orbis AI Backend shutdown complete")