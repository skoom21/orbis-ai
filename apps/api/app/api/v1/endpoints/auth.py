"""
Authentication endpoints for Orbis AI.

Handles user registration, login, logout, and profile management.
Rebuilt from scratch with comprehensive error handling.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Header
from pydantic import BaseModel, EmailStr, Field, field_validator

from app.core.auth import (
    auth_service, 
    supabase_auth_service, 
    AuthError
)
from app.services.database import db_service
from app.api.dependencies.auth import get_current_user, get_current_active_user
from app.logging_config import get_logger

logger = get_logger("api.v1.auth")

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ============== Request/Response Models ==============

class RegisterRequest(BaseModel):
    """User registration request."""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, description="Password (min 8 chars)")
    full_name: str = Field(..., min_length=1, max_length=255, description="Full name")
    
    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class LoginRequest(BaseModel):
    """User login request."""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password")


class TokenResponse(BaseModel):
    """Token response after login."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshRequest(BaseModel):
    """Token refresh request."""
    refresh_token: str


class UserResponse(BaseModel):
    """User data response."""
    id: str
    email: str
    full_name: str
    role: str = "user"
    is_active: bool = True
    email_verified: bool = False
    created_at: Optional[str] = None


class MessageResponse(BaseModel):
    """Generic message response."""
    message: str
    code: Optional[str] = None


class ErrorResponse(BaseModel):
    """Error response."""
    error: str
    code: str
    detail: Optional[str] = None


# ============== Helper Functions ==============

def _ensure_auth_service():
    """Ensure Supabase auth service is available."""
    if not supabase_auth_service:
        logger.error("Supabase auth service not available")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable"
        )


# ============== Endpoints ==============

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"model": ErrorResponse},
        409: {"model": ErrorResponse},
        503: {"model": ErrorResponse}
    }
)
async def register(data: RegisterRequest):
    """
    Register a new user account.
    
    - Validates email and password
    - Creates user in Supabase Auth
    - User record in public.users is auto-created by database trigger
    - Returns user info (email verification may be required to login)
    """
    _ensure_auth_service()
    
    try:
        logger.info("Registration attempt", email=data.email)
        
        # Register with Supabase Auth
        result = await supabase_auth_service.sign_up(
            email=data.email,
            password=data.password,
            full_name=data.full_name
        )
        
        user = result["user"]
        session = result["session"]
        
        # Determine if email verification is required
        if session is None:
            logger.info("Registration successful - email verification required", 
                       user_id=user.id, email=data.email)
        else:
            logger.info("Registration successful - auto-verified", 
                       user_id=user.id, email=data.email)
        
        return UserResponse(
            id=user.id,
            email=user.email,
            full_name=data.full_name,
            role="user",
            is_active=True,
            email_verified=user.email_confirmed_at is not None,
            created_at=str(user.created_at) if user.created_at else None
        )
        
    except AuthError as e:
        logger.warning("Registration failed", email=data.email, code=e.code, error=e.message)
        
        status_code = status.HTTP_400_BAD_REQUEST
        if e.code == "USER_EXISTS":
            status_code = status.HTTP_409_CONFLICT
        
        raise HTTPException(
            status_code=status_code,
            detail={"error": e.message, "code": e.code}
        )
    except Exception as e:
        logger.error("Unexpected registration error", email=data.email, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Registration failed", "code": "INTERNAL_ERROR"}
        )


@router.post(
    "/login",
    response_model=TokenResponse,
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        503: {"model": ErrorResponse}
    }
)
async def login(data: LoginRequest):
    """
    Login with email and password.
    
    Returns access and refresh tokens for authenticated requests.
    """
    _ensure_auth_service()
    
    try:
        logger.info("Login attempt", email=data.email)
        
        result = await supabase_auth_service.sign_in(
            email=data.email,
            password=data.password
        )
        
        session = result["session"]
        user = result["user"]
        
        logger.info("Login successful", user_id=user.id, email=data.email)
        
        # Update last login time in our database
        try:
            await db_service.update_user(user.id, {"last_login_at": "now()"})
        except Exception as db_error:
            logger.warning("Failed to update last_login_at", error=str(db_error))
        
        return TokenResponse(
            access_token=session.access_token,
            refresh_token=session.refresh_token,
            token_type="bearer",
            expires_in=session.expires_in
        )
        
    except AuthError as e:
        logger.warning("Login failed", email=data.email, code=e.code, error=e.message)
        
        status_code = status.HTTP_401_UNAUTHORIZED
        if e.code == "EMAIL_NOT_CONFIRMED":
            status_code = status.HTTP_403_FORBIDDEN
        
        raise HTTPException(
            status_code=status_code,
            detail={"error": e.message, "code": e.code}
        )
    except Exception as e:
        logger.error("Unexpected login error", email=data.email, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Login failed", "code": "INTERNAL_ERROR"}
        )


@router.post(
    "/logout",
    response_model=MessageResponse,
    responses={401: {"model": ErrorResponse}}
)
async def logout(current_user: dict = Depends(get_current_user)):
    """
    Logout current user.
    
    Invalidates the current session.
    """
    try:
        if supabase_auth_service:
            await supabase_auth_service.sign_out()
        
        logger.info("Logout successful", user_id=current_user.get("id"))
        return MessageResponse(message="Successfully logged out")
        
    except Exception as e:
        logger.error("Logout error", error=str(e))
        # Return success anyway - client should clear tokens
        return MessageResponse(message="Logged out")


@router.post(
    "/refresh",
    response_model=TokenResponse,
    responses={401: {"model": ErrorResponse}}
)
async def refresh_token(data: RefreshRequest):
    """
    Refresh access token using refresh token.
    """
    _ensure_auth_service()
    
    try:
        logger.info("Token refresh attempt")
        
        result = await supabase_auth_service.refresh_session(data.refresh_token)
        session = result["session"]
        
        logger.info("Token refresh successful")
        
        return TokenResponse(
            access_token=session.access_token,
            refresh_token=session.refresh_token,
            token_type="bearer",
            expires_in=session.expires_in
        )
        
    except AuthError as e:
        logger.warning("Token refresh failed", code=e.code, error=e.message)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": e.message, "code": e.code}
        )
    except Exception as e:
        logger.error("Unexpected refresh error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Token refresh failed", "code": "REFRESH_FAILED"}
        )


@router.get(
    "/me",
    response_model=UserResponse,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}}
)
async def get_current_user_profile(current_user: dict = Depends(get_current_active_user)):
    """
    Get current user profile.
    
    Returns the authenticated user's profile information.
    """
    logger.debug("Getting user profile", user_id=current_user.get("id"))
    
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        full_name=current_user.get("full_name", ""),
        role=current_user.get("role", "user"),
        is_active=current_user.get("status") != "inactive",
        email_verified=current_user.get("email_verified", False),
        created_at=str(current_user.get("created_at")) if current_user.get("created_at") else None
    )


@router.post(
    "/password-reset",
    response_model=MessageResponse,
    responses={503: {"model": ErrorResponse}}
)
async def request_password_reset(email: EmailStr):
    """
    Request password reset email.
    
    Sends a password reset link to the provided email if it exists.
    """
    _ensure_auth_service()
    
    try:
        logger.info("Password reset requested", email=email)
        await supabase_auth_service.reset_password_email(email)
        
        # Always return success to prevent email enumeration
        return MessageResponse(
            message="If an account exists with this email, a password reset link has been sent."
        )
        
    except Exception as e:
        logger.error("Password reset error", email=email, error=str(e))
        # Still return success to prevent enumeration
        return MessageResponse(
            message="If an account exists with this email, a password reset link has been sent."
        )
