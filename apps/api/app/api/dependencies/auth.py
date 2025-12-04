"""
Authentication dependencies for FastAPI.

Provides dependency injection for protected endpoints.
"""

from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.auth import auth_service, supabase_auth_service, AuthService
from app.services.database import db_service
from app.logging_config import get_logger

logger = get_logger("api.auth")

# HTTP Bearer token security scheme
security = HTTPBearer()


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    auth_svc: AuthService = Depends(lambda: auth_service)
) -> str:
    """
    Dependency to get current user ID from JWT token.
    
    Args:
        credentials: HTTP Bearer token from Authorization header
        auth_svc: Auth service instance
        
    Returns:
        User ID from token
        
    Raises:
        HTTPException: If token is invalid or missing
    """
    token = credentials.credentials
    
    # Verify and decode token
    user_id = auth_svc.verify_token(token)
    
    if user_id is None:
        logger.warning("Invalid token provided")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user_id


async def get_current_user(
    user_id: str = Depends(get_current_user_id),
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """
    Dependency to get current user data from database.
    Auto-creates user if authenticated via OAuth but not yet in database.
    
    Args:
        user_id: User ID from token
        credentials: HTTP Bearer token (used to get user info from Supabase if needed)
        
    Returns:
        User data dictionary
        
    Raises:
        HTTPException: If user not found or cannot be created
    """
    try:
        # Get user from database
        user = await db_service.get_user_by_id(user_id)
        
        if not user:
            logger.info("User not in database, attempting to sync from Supabase Auth", user_id=user_id)
            
            # Try to get user info from Supabase Auth and create local user
            if supabase_auth_service:
                try:
                    # Get user from Supabase Auth
                    token = credentials.credentials
                    supabase_user = await supabase_auth_service.get_user(token)
                    
                    if supabase_user and "user" in supabase_user:
                        user_data = supabase_user["user"]
                        email = user_data.get("email", "")
                        full_name = user_data.get("user_metadata", {}).get("full_name", email.split("@")[0])
                        
                        # Create user in our database
                        created_user_id = await db_service.create_user(
                            email=email,
                            full_name=full_name,
                            preferences={"auth_provider": "oauth"}
                        )
                        
                        if created_user_id:
                            logger.info("OAuth user synced to database", user_id=user_id, email=email)
                            # Fetch the newly created user
                            user = await db_service.get_user_by_id(user_id)
                            
                except Exception as sync_error:
                    logger.error("Failed to sync OAuth user", user_id=user_id, error=str(sync_error))
            
            # If still no user, return 404
            if not user:
                logger.warning("User not found and could not be synced", user_id=user_id)
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
        
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get user", user_id=user_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user data"
        )


async def get_current_active_user(
    current_user: dict = Depends(get_current_user)
) -> dict:
    """
    Dependency to get current active user.
    
    Args:
        current_user: User data from get_current_user
        
    Returns:
        User data dictionary
        
    Raises:
        HTTPException: If user is inactive
    """
    if not current_user.get("is_active", True):
        logger.warning("Inactive user attempted access", user_id=current_user.get("id"))
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    
    return current_user


async def get_current_admin_user(
    current_user: dict = Depends(get_current_active_user)
) -> dict:
    """
    Dependency to ensure current user has admin role.
    
    Args:
        current_user: User data from get_current_active_user
        
    Returns:
        User data dictionary
        
    Raises:
        HTTPException: If user is not an admin
    """
    user_role = current_user.get("role", "user")
    
    if user_role != "admin":
        logger.warning(
            "Non-admin user attempted admin access", 
            user_id=current_user.get("id"),
            role=user_role
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    
    return current_user


async def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    auth_svc: AuthService = Depends(lambda: auth_service)
) -> Optional[dict]:
    """
    Dependency to get current user if authenticated, None otherwise.
    Useful for endpoints that work both with and without authentication.
    
    Args:
        credentials: Optional HTTP Bearer token
        auth_svc: Auth service instance
        
    Returns:
        User data dictionary or None
    """
    if credentials is None:
        return None
    
    token = credentials.credentials
    user_id = auth_svc.verify_token(token)
    
    if user_id is None:
        return None
    
    try:
        user = await db_service.get_user_by_id(user_id)
        return user
    except Exception as e:
        logger.error("Failed to get optional user", user_id=user_id, error=str(e))
        return None


def require_role(required_role: str):
    """
    Dependency factory to require a specific role.
    
    Args:
        required_role: Role required to access the endpoint
        
    Returns:
        Dependency function
        
    Example:
        @router.get("/premium", dependencies=[Depends(require_role("premium"))])
    """
    async def role_checker(current_user: dict = Depends(get_current_active_user)) -> dict:
        user_role = current_user.get("role", "user")
        
        if user_role != required_role:
            logger.warning(
                "User lacks required role",
                user_id=current_user.get("id"),
                required_role=required_role,
                user_role=user_role
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{required_role}' required"
            )
        
        return current_user
    
    return role_checker


def require_any_role(*allowed_roles: str):
    """
    Dependency factory to require any of the specified roles.
    
    Args:
        *allowed_roles: One or more roles that can access the endpoint
        
    Returns:
        Dependency function
        
    Example:
        @router.get("/content", dependencies=[Depends(require_any_role("admin", "moderator"))])
    """
    async def role_checker(current_user: dict = Depends(get_current_active_user)) -> dict:
        user_role = current_user.get("role", "user")
        
        if user_role not in allowed_roles:
            logger.warning(
                "User lacks required roles",
                user_id=current_user.get("id"),
                allowed_roles=list(allowed_roles),
                user_role=user_role
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"One of these roles required: {', '.join(allowed_roles)}"
            )
        
        return current_user
    
    return role_checker
