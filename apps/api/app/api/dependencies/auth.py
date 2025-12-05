"""
Authentication dependencies for FastAPI.

Provides dependency injection for protected endpoints.
Rebuilt from scratch with proper error handling.
"""

from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.auth import auth_service, supabase_auth_service
from app.services.database import db_service
from app.logging_config import get_logger

logger = get_logger("api.auth.dependencies")

# HTTP Bearer token security scheme
security = HTTPBearer()


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    """
    Extract and verify user ID from JWT token.
    
    Args:
        credentials: HTTP Bearer token from Authorization header
        
    Returns:
        User ID (UUID string)
        
    Raises:
        HTTPException 401: If token is invalid or missing
    """
    token = credentials.credentials
    
    # Verify token and get user ID
    user_id = auth_service.verify_token(token)
    
    if not user_id:
        logger.warning("Invalid or expired token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Invalid or expired token", "code": "INVALID_TOKEN"},
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    logger.debug("Token verified", user_id=user_id)
    return user_id


async def get_current_user(
    user_id: str = Depends(get_current_user_id),
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """
    Get current user data from database.
    
    If user exists in auth.users but not in public.users, 
    the database trigger should have synced them automatically.
    
    Args:
        user_id: User ID from token verification
        credentials: HTTP Bearer token (for Supabase user lookup if needed)
        
    Returns:
        User data dictionary from public.users
        
    Raises:
        HTTPException 404: If user not found in database
        HTTPException 500: If database error occurs
    """
    try:
        # Try to get user from our database
        user = await db_service.get_user_by_id(user_id)
        
        if user:
            logger.debug("User found in database", user_id=user_id)
            return user
        
        # User not in public.users - this shouldn't happen if trigger is working
        # Try to manually sync from Supabase Auth as fallback
        logger.warning("User not in database, attempting manual sync", user_id=user_id)
        
        if supabase_auth_service:
            try:
                token = credentials.credentials
                supabase_user = await supabase_auth_service.get_user(token)
                
                if supabase_user:
                    # Create user in our database
                    email = supabase_user.email
                    user_metadata = getattr(supabase_user, "user_metadata", {}) or {}
                    full_name = user_metadata.get("full_name", email.split("@")[0])
                    
                    created_id = await db_service.create_user(
                        user_id=user_id,  # Use the auth user ID
                        email=email,
                        full_name=full_name
                    )
                    
                    if created_id:
                        logger.info("Manually synced user to database", user_id=user_id)
                        user = await db_service.get_user_by_id(user_id)
                        if user:
                            return user
                            
            except Exception as sync_error:
                logger.error("Manual user sync failed", user_id=user_id, error=str(sync_error))
        
        # Still no user - return 404
        logger.error("User not found in database", user_id=user_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "User not found", "code": "USER_NOT_FOUND"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Database error getting user", user_id=user_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Failed to retrieve user", "code": "DATABASE_ERROR"}
        )


async def get_current_active_user(
    current_user: dict = Depends(get_current_user)
) -> dict:
    """
    Get current user and verify they are active.
    
    Args:
        current_user: User data from get_current_user
        
    Returns:
        User data dictionary
        
    Raises:
        HTTPException 403: If user is inactive/banned
    """
    user_status = current_user.get("status", "active")
    
    if user_status == "inactive" or user_status == "banned":
        logger.warning("Inactive user attempted access", 
                      user_id=current_user.get("id"), 
                      status=user_status)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "Account is inactive", "code": "ACCOUNT_INACTIVE"}
        )
    
    # Check if deleted
    if current_user.get("deleted_at"):
        logger.warning("Deleted user attempted access", user_id=current_user.get("id"))
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "Account has been deleted", "code": "ACCOUNT_DELETED"}
        )
    
    return current_user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)
    )
) -> Optional[dict]:
    """
    Optionally get current user if authenticated.
    
    Use this for endpoints that work both authenticated and unauthenticated.
    
    Returns:
        User data dictionary if authenticated, None otherwise
    """
    if not credentials:
        return None
    
    try:
        user_id = auth_service.verify_token(credentials.credentials)
        if not user_id:
            return None
        
        user = await db_service.get_user_by_id(user_id)
        return user
        
    except Exception as e:
        logger.debug("Optional auth failed", error=str(e))
        return None
