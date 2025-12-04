"""
Authentication endpoints.

Handles user registration, login, logout, password reset, and email verification.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Header
from app.api.v1.schemas.auth import (
    UserRegisterRequest,
    UserLoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    PasswordResetRequest,
    PasswordUpdateRequest,
    EmailVerificationRequest,
    UserResponse,
    UserUpdateRequest,
    MessageResponse,
    ErrorResponse
)
from app.api.dependencies.auth import (
    get_current_user,
    get_current_active_user,
    get_current_admin_user
)
from app.core.auth import auth_service, supabase_auth_service
from app.services.database import db_service
from app.logging_config import get_logger

logger = get_logger("api.v1.auth")

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid registration data"},
        409: {"model": ErrorResponse, "description": "User already exists"}
    }
)
async def register(data: UserRegisterRequest):
    """
    Register a new user account.
    
    Creates a new user with email and password authentication.
    Sends email verification link to the provided email address.
    """
    try:
        if not supabase_auth_service:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Authentication service is not available"
            )
        
        # Register with Supabase Auth
        result = await supabase_auth_service.sign_up(
            email=data.email,
            password=data.password,
            metadata={"full_name": data.full_name}
        )
        
        if "error" in result:
            error_msg = result["error"]
            logger.warning("Registration failed", email=data.email, error=error_msg)
            
            if "already registered" in error_msg.lower():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="User with this email already exists"
                )
            
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )
        
        user = result["user"]
        logger.info("User registered successfully", user_id=user["id"], email=data.email)
        
        return UserResponse(
            id=user["id"],
            email=user["email"],
            full_name=data.full_name,
            role="user",
            is_active=True,
            created_at=user.get("created_at"),
            email_verified=user.get("email_confirmed_at") is not None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Registration error", error=str(e), email=data.email)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


@router.post(
    "/login",
    response_model=TokenResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Invalid credentials"},
        403: {"model": ErrorResponse, "description": "Account not verified"}
    }
)
async def login(data: UserLoginRequest):
    """
    Login with email and password.
    
    Returns access token and refresh token for authenticated requests.
    """
    try:
        if not supabase_auth_service:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Authentication service is not available"
            )
        
        # Authenticate with Supabase Auth
        result = await supabase_auth_service.sign_in(
            email=data.email,
            password=data.password
        )
        
        if "error" in result:
            logger.warning("Login failed", email=data.email, error=result["error"])
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        session = result["session"]
        user = result["user"]
        
        logger.info("User logged in", user_id=user["id"], email=data.email)
        
        return TokenResponse(
            access_token=session["access_token"],
            refresh_token=session["refresh_token"],
            token_type="bearer",
            expires_in=session["expires_in"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Login error", error=str(e), email=data.email)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )


@router.post(
    "/logout",
    response_model=MessageResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Not authenticated"}
    }
)
async def logout(
    authorization: Optional[str] = Header(None),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Logout current user.
    
    Invalidates the current session and access token.
    """
    try:
        # Extract token from Authorization header
        if authorization and authorization.startswith("Bearer "):
            token = authorization.split(" ")[1]
            
            # Sign out from Supabase
            result = await supabase_auth_service.sign_out(token)
            
            if "error" in result:
                logger.warning("Logout failed", user_id=current_user["id"], error=result["error"])
        
        logger.info("User logged out", user_id=current_user["id"])
        
        return MessageResponse(
            message="Successfully logged out"
        )
        
    except Exception as e:
        logger.error("Logout error", error=str(e), user_id=current_user.get("id"))
        # Return success even if logout fails to prevent client issues
        return MessageResponse(
            message="Successfully logged out"
        )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Invalid refresh token"}
    }
)
async def refresh_token(data: RefreshTokenRequest):
    """
    Refresh access token using refresh token.
    
    Returns new access token and refresh token.
    """
    try:
        if not supabase_auth_service:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Authentication service is not available"
            )
        
        # Refresh session with Supabase
        result = await supabase_auth_service.refresh_session(data.refresh_token)
        
        if "error" in result:
            logger.warning("Token refresh failed", error=result["error"])
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        session = result["session"]
        
        logger.info("Token refreshed", user_id=result["user"]["id"])
        
        return TokenResponse(
            access_token=session["access_token"],
            refresh_token=session["refresh_token"],
            token_type="bearer",
            expires_in=session["expires_in"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Token refresh error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed"
        )


@router.post(
    "/password-reset",
    response_model=MessageResponse,
    responses={
        404: {"model": ErrorResponse, "description": "User not found"}
    }
)
async def request_password_reset(data: PasswordResetRequest):
    """
    Request password reset email.
    
    Sends password reset link to the provided email address.
    """
    try:
        if not supabase_auth_service:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Authentication service is not available"
            )
        
        # Send password reset email via Supabase Auth
        result = await supabase_auth_service.reset_password_email(data.email)
        
        if "error" in result:
            logger.warning("Password reset request failed", email=data.email, error=result["error"])
            # Don't reveal if user exists
            return MessageResponse(
                message="If an account exists with this email, a password reset link has been sent"
            )
        
        logger.info("Password reset email sent", email=data.email)
        
        return MessageResponse(
            message="If an account exists with this email, a password reset link has been sent"
        )
        
    except Exception as e:
        logger.error("Password reset request error", error=str(e), email=data.email)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process password reset request"
        )


@router.post(
    "/password-update",
    response_model=MessageResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Not authenticated"}
    }
)
async def update_password(
    data: PasswordUpdateRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Update user password.
    
    Requires valid access token from password reset email.
    """
    try:
        if not supabase_auth_service:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Authentication service is not available"
            )
        
        # Extract token from Authorization header
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authorization token required"
            )
        
        token = authorization.split(" ")[1]
        
        # Update password via Supabase
        result = await supabase_auth_service.update_password(token, data.new_password)
        
        if "error" in result:
            logger.warning("Password update failed", error=result["error"])
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Failed to update password"
            )
        
        logger.info("Password updated", user_id=result["user"]["id"])
        
        return MessageResponse(
            message="Password updated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Password update error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update password"
        )


@router.post(
    "/verify-email",
    response_model=MessageResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid verification token"}
    }
)
async def verify_email(data: EmailVerificationRequest):
    """
    Verify user email address.
    
    Confirms email using verification token from email.
    """
    try:
        if not supabase_auth_service:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Authentication service is not available"
            )
        
        # Verify email via Supabase Auth
        result = await supabase_auth_service.verify_email(data.token)
        
        if "error" in result:
            logger.warning("Email verification failed", error=result["error"])
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification token"
            )
        
        logger.info("Email verified", user_id=result["user"]["id"])
        
        return MessageResponse(
            message="Email verified successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Email verification error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Email verification failed"
        )


@router.get(
    "/me",
    response_model=UserResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Not authenticated"}
    }
)
async def get_current_user_profile(
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get current user profile.
    
    Returns authenticated user's profile information.
    """
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        full_name=current_user.get("full_name", ""),
        role=current_user.get("role", "user"),
        is_active=current_user.get("is_active", True),
        created_at=current_user.get("created_at"),
        updated_at=current_user.get("updated_at"),
        email_verified=current_user.get("email_verified", False)
    )


@router.put(
    "/me",
    response_model=UserResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Not authenticated"}
    }
)
async def update_current_user_profile(
    data: UserUpdateRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Update current user profile.
    
    Updates authenticated user's profile information.
    """
    try:
        # Update user in database
        update_data = {}
        if data.full_name is not None:
            update_data["full_name"] = data.full_name
        if data.email is not None:
            update_data["email"] = data.email
        
        if not update_data:
            return UserResponse(
                id=current_user["id"],
                email=current_user["email"],
                full_name=current_user.get("full_name", ""),
                role=current_user.get("role", "user"),
                is_active=current_user.get("is_active", True),
                created_at=current_user.get("created_at"),
                updated_at=current_user.get("updated_at"),
                email_verified=current_user.get("email_verified", False)
            )
        
        updated_user = await db_service.update_user(current_user["id"], update_data)
        
        logger.info("User profile updated", user_id=current_user["id"])
        
        return UserResponse(
            id=updated_user["id"],
            email=updated_user["email"],
            full_name=updated_user.get("full_name", ""),
            role=updated_user.get("role", "user"),
            is_active=updated_user.get("is_active", True),
            created_at=updated_user.get("created_at"),
            updated_at=updated_user.get("updated_at"),
            email_verified=updated_user.get("email_verified", False)
        )
        
    except Exception as e:
        logger.error("Profile update error", error=str(e), user_id=current_user["id"])
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile"
        )
