from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime
from app.services.chat_service import chat_service
from app.logging_config import get_logger

logger = get_logger("api.health")
from app.agents.orchestrator_simple import OrchestratorAgent

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
        
        # Check orchestrator and integrated services
        orchestrator = OrchestratorAgent()
        orchestrator_health = await orchestrator.health_check()
        
        # Determine overall status
        all_services = {
            "chat": chat_status,
            **orchestrator_health.get("services", {})
        }
        
        overall_status = "healthy"
        for service_name, service_status in all_services.items():
            if isinstance(service_status, str) and "unhealthy" in service_status:
                overall_status = "degraded"
                break
        
        return HealthResponse(
            status=overall_status,
            timestamp=datetime.utcnow().isoformat(),
            version="2.0.0",
            services=all_services
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