"""
API v1 router.

Combines all v1 endpoint routers.
"""

from fastapi import APIRouter
from app.api.v1.endpoints import auth

router = APIRouter(prefix="/v1")

# Include all endpoint routers
router.include_router(auth.router)
