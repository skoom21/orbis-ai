from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime
from app.services.chat_service import chat_service
from app.logging_config import get_logger

logger = get_logger("api.health")

router = APIRouter()

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    version: str
    services: dict

@router.get("/", response_model=HealthResponse)
async def health_check():
    """Comprehensive health check endpoint for monitoring"""
    
    try:
        # Check chat service
        chat_status = await chat_service.health_check()
        
        # Check integrated services
        from app.services.gemini import gemini_service
        from app.services.database import db_service
        
        services_health = {
            "chat": chat_status,
            "gemini": "healthy",  # Basic check - could enhance
            "database": db_service.health_check()
        }
        
        # Determine overall status
        overall_status = "healthy"
        for service_name, service_status in services_health.items():
            if isinstance(service_status, dict) and not service_status.get("supabase_available", True):
                overall_status = "degraded"
                break
            elif isinstance(service_status, str) and "unhealthy" in service_status:
                overall_status = "degraded"
                break
        
        return HealthResponse(
            status=overall_status,
            timestamp=datetime.utcnow().isoformat(),
            version="2.0.0",
            services=services_health
        )
        
    except Exception as e:
        return HealthResponse(
            status="unhealthy",
            timestamp=datetime.utcnow().isoformat(),
            version="2.0.0",
            services={
                "error": f"Health check failed: {str(e)[:100]}"
            }
        )

@router.get("/ready")
async def readiness_check():
    """Simple readiness check for load balancers"""
    try:
        # Basic connectivity checks
        from app.services.database import db_service
        from app.services.redis import redis_service
        
        checks = {}
        
        # Check database
        try:
            await db_service.get_user_by_email("readiness_check@example.com")
            checks["database"] = "ok"
        except Exception as e:
            checks["database"] = f"error: {str(e)[:50]}"
        
        # Check Redis
        try:
            redis_ok = await redis_service.ping()
            checks["redis"] = "ok" if redis_ok else "error"
        except Exception as e:
            checks["redis"] = f"error: {str(e)[:50]}"
        
        # Determine readiness
        ready = all(status == "ok" for status in checks.values())
        
        return {
            "status": "ready" if ready else "not_ready", 
            "checks": checks
        }
        
    except Exception as e:
        return {
            "status": "not_ready", 
            "checks": {"error": str(e)[:100]}
        }

@router.get("/database")
async def database_health():
    """Detailed database health check"""
    from app.services.database import db_service
    from app.db.connection import engine, async_session_maker
    import time
    
    health = {
        "status": "unknown",
        "checks": {},
        "metrics": {}
    }
    
    try:
        # Check Supabase connection
        start = time.time()
        supabase_check = db_service.health_check()
        health["checks"]["supabase"] = supabase_check
        health["metrics"]["supabase_response_time_ms"] = round((time.time() - start) * 1000, 2)
        
        # Check connection pool status
        if engine:
            pool = engine.pool
            health["metrics"]["pool_size"] = pool.size()
            health["metrics"]["pool_checked_in"] = pool.checkedin()
            health["metrics"]["pool_checked_out"] = pool.checkedout()
            health["metrics"]["pool_overflow"] = pool.overflow()
            health["checks"]["connection_pool"] = "configured"
        else:
            health["checks"]["connection_pool"] = "not_configured"
        
        # Test query performance
        start = time.time()
        try:
            # Simple query to test database response
            result = db_service.supabase.table("users").select("id").limit(1).execute()
            query_time = round((time.time() - start) * 1000, 2)
            health["metrics"]["query_response_time_ms"] = query_time
            health["checks"]["query_test"] = "ok" if query_time < 100 else "slow"
        except Exception as e:
            health["checks"]["query_test"] = f"error: {str(e)[:50]}"
        
        # Check circuit breaker status
        if hasattr(db_service, 'circuit_breaker'):
            cb = db_service.circuit_breaker
            health["metrics"]["circuit_breaker_state"] = cb.state
            health["metrics"]["circuit_breaker_failures"] = cb.failures
            health["checks"]["circuit_breaker"] = cb.state
        
        # Overall status
        if all(
            check in ["ok", "slow", "configured", "closed"] 
            or (isinstance(check, dict) and check.get("supabase_available"))
            for check in health["checks"].values()
        ):
            health["status"] = "healthy"
        else:
            health["status"] = "degraded"
        
    except Exception as e:
        health["status"] = "unhealthy"
        health["error"] = str(e)[:200]
    
    return health