"""
Tests for authentication endpoints.
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from fastapi import HTTPException
from app.core.auth import AuthService, SupabaseAuthService


class TestAuthService:
    """Test AuthService class."""
    
    def test_create_access_token(self):
        """Test creating access token."""
        auth_service = AuthService()
        token = auth_service.create_access_token(user_id="test-user-123")
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0
    
    def test_create_refresh_token(self):
        """Test creating refresh token."""
        auth_service = AuthService()
        token = auth_service.create_refresh_token(user_id="test-user-123")
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0
    
    def test_decode_valid_token(self):
        """Test decoding valid token."""
        auth_service = AuthService()
        user_id = "test-user-123"
        token = auth_service.create_access_token(user_id=user_id)
        
        decoded = auth_service.decode_token(token)
        
        assert decoded is not None
        assert decoded["sub"] == user_id
        assert "exp" in decoded
    
    def test_decode_invalid_token(self):
        """Test decoding invalid token."""
        auth_service = AuthService()
        
        decoded = auth_service.decode_token("invalid.token.here")
        
        assert decoded is None
    
    def test_verify_valid_token(self):
        """Test verifying valid token."""
        auth_service = AuthService()
        user_id = "test-user-123"
        token = auth_service.create_access_token(user_id=user_id)
        
        verified_user_id = auth_service.verify_token(token)
        
        assert verified_user_id == user_id
    
    def test_verify_invalid_token(self):
        """Test verifying invalid token."""
        auth_service = AuthService()
        
        verified_user_id = auth_service.verify_token("invalid.token.here")
        
        assert verified_user_id is None
    
    def test_hash_password(self):
        """Test password hashing."""
        auth_service = AuthService()
        password = "SecurePassword123"
        
        hashed = auth_service.hash_password(password)
        
        assert hashed is not None
        assert hashed != password
        assert len(hashed) > 0
    
    def test_verify_password_correct(self):
        """Test verifying correct password."""
        auth_service = AuthService()
        password = "SecurePassword123"
        hashed = auth_service.hash_password(password)
        
        is_valid = auth_service.verify_password(password, hashed)
        
        assert is_valid is True
    
    def test_verify_password_incorrect(self):
        """Test verifying incorrect password."""
        auth_service = AuthService()
        password = "SecurePassword123"
        hashed = auth_service.hash_password(password)
        
        is_valid = auth_service.verify_password("WrongPassword456", hashed)
        
        assert is_valid is False


class TestSupabaseAuthService:
    """Test SupabaseAuthService class."""
    
    @pytest.mark.asyncio
    async def test_sign_up_success(self):
        """Test successful user registration."""
        mock_supabase = Mock()
        mock_auth = Mock()
        mock_supabase.auth = mock_auth
        
        # Mock successful sign up
        mock_auth.sign_up.return_value = Mock(
            user={"id": "user-123", "email": "test@example.com"},
            session=None
        )
        
        with patch("app.core.auth.create_client", return_value=mock_supabase):
            service = SupabaseAuthService()
            result = await service.sign_up(
                email="test@example.com",
                password="SecurePass123",
                metadata={"full_name": "Test User"}
            )
        
        assert "user" in result
        assert result["user"]["email"] == "test@example.com"
        assert "error" not in result
    
    @pytest.mark.asyncio
    async def test_sign_up_error(self):
        """Test sign up with error."""
        mock_supabase = Mock()
        mock_auth = Mock()
        mock_supabase.auth = mock_auth
        
        # Mock sign up error
        mock_auth.sign_up.side_effect = Exception("Email already registered")
        
        with patch("app.core.auth.create_client", return_value=mock_supabase):
            service = SupabaseAuthService()
            result = await service.sign_up(
                email="test@example.com",
                password="SecurePass123"
            )
        
        assert "error" in result
        assert "Email already registered" in result["error"]
    
    @pytest.mark.asyncio
    async def test_sign_in_success(self):
        """Test successful sign in."""
        mock_supabase = Mock()
        mock_auth = Mock()
        mock_supabase.auth = mock_auth
        
        # Mock successful sign in
        mock_auth.sign_in_with_password.return_value = Mock(
            user={"id": "user-123", "email": "test@example.com"},
            session={
                "access_token": "token123",
                "refresh_token": "refresh123",
                "expires_in": 3600
            }
        )
        
        with patch("app.core.auth.create_client", return_value=mock_supabase):
            service = SupabaseAuthService()
            result = await service.sign_in(
                email="test@example.com",
                password="SecurePass123"
            )
        
        assert "user" in result
        assert "session" in result
        assert result["session"]["access_token"] == "token123"
        assert "error" not in result
    
    @pytest.mark.asyncio
    async def test_sign_in_invalid_credentials(self):
        """Test sign in with invalid credentials."""
        mock_supabase = Mock()
        mock_auth = Mock()
        mock_supabase.auth = mock_auth
        
        # Mock sign in error
        mock_auth.sign_in_with_password.side_effect = Exception("Invalid credentials")
        
        with patch("app.core.auth.create_client", return_value=mock_supabase):
            service = SupabaseAuthService()
            result = await service.sign_in(
                email="test@example.com",
                password="WrongPassword"
            )
        
        assert "error" in result
        assert "Invalid credentials" in result["error"]
    
    @pytest.mark.asyncio
    async def test_sign_out_success(self):
        """Test successful sign out."""
        mock_supabase = Mock()
        mock_auth = Mock()
        mock_supabase.auth = mock_auth
        
        # Mock successful sign out
        mock_auth.sign_out.return_value = None
        
        with patch("app.core.auth.create_client", return_value=mock_supabase):
            service = SupabaseAuthService()
            result = await service.sign_out("token123")
        
        assert "error" not in result
        assert result.get("success") is True or "error" not in result
    
    @pytest.mark.asyncio
    async def test_reset_password_email(self):
        """Test password reset email."""
        mock_supabase = Mock()
        mock_auth = Mock()
        mock_supabase.auth = mock_auth
        
        # Mock password reset request
        mock_auth.reset_password_for_email.return_value = None
        
        with patch("app.core.auth.create_client", return_value=mock_supabase):
            service = SupabaseAuthService()
            result = await service.reset_password_email("test@example.com")
        
        assert "error" not in result
    
    @pytest.mark.asyncio
    async def test_get_user_success(self):
        """Test getting user by ID."""
        mock_supabase = Mock()
        mock_auth = Mock()
        mock_supabase.auth = mock_auth
        
        # Mock get user
        mock_auth.get_user.return_value = Mock(
            user={"id": "user-123", "email": "test@example.com"}
        )
        
        with patch("app.core.auth.create_client", return_value=mock_supabase):
            service = SupabaseAuthService()
            result = await service.get_user("token123")
        
        assert "user" in result
        assert result["user"]["id"] == "user-123"
        assert "error" not in result
    
    @pytest.mark.asyncio
    async def test_refresh_session_success(self):
        """Test refreshing session."""
        mock_supabase = Mock()
        mock_auth = Mock()
        mock_supabase.auth = mock_auth
        
        # Mock refresh session
        mock_auth.refresh_session.return_value = Mock(
            user={"id": "user-123"},
            session={
                "access_token": "new_token123",
                "refresh_token": "new_refresh123",
                "expires_in": 3600
            }
        )
        
        with patch("app.core.auth.create_client", return_value=mock_supabase):
            service = SupabaseAuthService()
            result = await service.refresh_session("refresh123")
        
        assert "session" in result
        assert result["session"]["access_token"] == "new_token123"
        assert "error" not in result


@pytest.mark.asyncio
async def test_get_current_user_id_valid(client):
    """Test getting current user ID with valid token."""
    from app.api.dependencies.auth import get_current_user_id
    from fastapi.security import HTTPAuthorizationCredentials
    from app.core.auth import auth_service
    
    # Create valid token
    user_id = "test-user-123"
    token = auth_service.create_access_token(user_id=user_id)
    
    # Create credentials
    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials=token
    )
    
    # Test dependency
    result = await get_current_user_id(credentials, auth_service)
    
    assert result == user_id


@pytest.mark.asyncio
async def test_get_current_user_id_invalid(client):
    """Test getting current user ID with invalid token."""
    from app.api.dependencies.auth import get_current_user_id
    from fastapi.security import HTTPAuthorizationCredentials
    from app.core.auth import auth_service
    
    # Create invalid credentials
    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials="invalid.token.here"
    )
    
    # Test dependency - should raise HTTPException
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user_id(credentials, auth_service)
    
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_password_complexity_validation():
    """Test password complexity validation."""
    from app.api.v1.schemas.auth import UserRegisterRequest
    from pydantic import ValidationError
    
    # Valid password
    valid_data = {
        "email": "test@example.com",
        "password": "SecurePass123",
        "full_name": "Test User"
    }
    user = UserRegisterRequest(**valid_data)
    assert user.password == "SecurePass123"
    
    # Password too short
    with pytest.raises(ValidationError):
        UserRegisterRequest(
            email="test@example.com",
            password="Short1",
            full_name="Test User"
        )
    
    # Password without uppercase
    with pytest.raises(ValidationError):
        UserRegisterRequest(
            email="test@example.com",
            password="nocapital123",
            full_name="Test User"
        )
    
    # Password without lowercase
    with pytest.raises(ValidationError):
        UserRegisterRequest(
            email="test@example.com",
            password="NOLOWERCASE123",
            full_name="Test User"
        )
    
    # Password without digit
    with pytest.raises(ValidationError):
        UserRegisterRequest(
            email="test@example.com",
            password="NoDigitsHere",
            full_name="Test User"
        )
