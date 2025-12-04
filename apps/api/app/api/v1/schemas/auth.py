"""
Pydantic schemas for authentication endpoints.
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, validator


class UserRegisterRequest(BaseModel):
    """User registration request."""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, description="User password (min 8 characters)")
    full_name: str = Field(..., min_length=1, max_length=255, description="User's full name")
    
    @validator("password")
    def validate_password(cls, v):
        """Validate password complexity."""
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class UserLoginRequest(BaseModel):
    """User login request."""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password")


class TokenResponse(BaseModel):
    """Token response."""
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiration time in seconds")


class RefreshTokenRequest(BaseModel):
    """Refresh token request."""
    refresh_token: str = Field(..., description="Refresh token")


class PasswordResetRequest(BaseModel):
    """Password reset request."""
    email: EmailStr = Field(..., description="User email address")


class PasswordUpdateRequest(BaseModel):
    """Password update request."""
    new_password: str = Field(..., min_length=8, description="New password (min 8 characters)")
    
    @validator("new_password")
    def validate_password(cls, v):
        """Validate password complexity."""
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class EmailVerificationRequest(BaseModel):
    """Email verification request."""
    token: str = Field(..., description="Email verification token")


class UserResponse(BaseModel):
    """User data response."""
    id: str = Field(..., description="User ID")
    email: str = Field(..., description="User email")
    full_name: str = Field(..., description="User's full name")
    role: str = Field(default="user", description="User role")
    is_active: bool = Field(default=True, description="Whether user is active")
    created_at: datetime = Field(..., description="Account creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")
    email_verified: bool = Field(default=False, description="Whether email is verified")


class UserUpdateRequest(BaseModel):
    """User profile update request."""
    full_name: Optional[str] = Field(None, min_length=1, max_length=255, description="User's full name")
    email: Optional[EmailStr] = Field(None, description="User email address")


class MessageResponse(BaseModel):
    """Generic message response."""
    message: str = Field(..., description="Response message")
    detail: Optional[str] = Field(None, description="Additional details")


class ErrorResponse(BaseModel):
    """Error response."""
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    detail: Optional[str] = Field(None, description="Additional error details")
