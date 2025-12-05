"""
Core authentication module for Orbis AI.

Handles JWT token creation/validation and Supabase Auth integration.
Rebuilt from scratch with proper error handling.
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from supabase import Client, create_client
from app.config import settings
from app.logging_config import get_logger

logger = get_logger("auth")


class AuthError(Exception):
    """Custom authentication error with detailed info."""
    def __init__(self, message: str, code: str = "AUTH_ERROR", details: Optional[Dict] = None):
        self.message = message
        self.code = code
        self.details = details or {}
        super().__init__(self.message)


class AuthService:
    """Handles JWT token operations."""
    
    def __init__(self):
        self.secret_key = settings.JWT_SECRET_KEY
        self.algorithm = settings.JWT_ALGORITHM
        self.access_token_expire_minutes = settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
        logger.info("AuthService initialized")
    
    def create_access_token(self, user_id: str, email: str) -> str:
        """Create a JWT access token."""
        expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        
        payload = {
            "sub": user_id,
            "email": email,
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "access"
        }
        
        token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
        logger.info("Created access token", user_id=user_id)
        return token
    
    def create_refresh_token(self, user_id: str) -> str:
        """Create a JWT refresh token (7 days)."""
        expire = datetime.utcnow() + timedelta(days=7)
        
        payload = {
            "sub": user_id,
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "refresh"
        }
        
        token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
        logger.info("Created refresh token", user_id=user_id)
        return token
    
    def verify_token(self, token: str) -> Optional[str]:
        """
        Verify a JWT token and return the user_id.
        Supports both our tokens and Supabase tokens.
        """
        # Try our own token first
        user_id = self._verify_our_token(token)
        if user_id:
            return user_id
        
        # Try Supabase token
        user_id = self._verify_supabase_token(token)
        return user_id
    
    def _verify_our_token(self, token: str) -> Optional[str]:
        """Verify a token we issued."""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            user_id = payload.get("sub")
            if user_id:
                logger.debug("Verified our token", user_id=user_id)
                return user_id
            return None
        except JWTError as e:
            logger.debug("Our token verification failed", error=str(e))
            return None
    
    def _verify_supabase_token(self, token: str) -> Optional[str]:
        """Verify a Supabase JWT token."""
        try:
            # Try with Supabase JWT secret if available
            jwt_secret = getattr(settings, 'SUPABASE_JWT_SECRET', None)
            
            if jwt_secret:
                payload = jwt.decode(token, jwt_secret, algorithms=["HS256"], audience="authenticated")
            else:
                # Decode without verification (development only)
                payload = jwt.decode(token, options={"verify_signature": False})
                logger.warning("Supabase token decoded without verification - set SUPABASE_JWT_SECRET for production")
            
            user_id = payload.get("sub")
            if user_id:
                logger.debug("Verified Supabase token", user_id=user_id)
                return user_id
            return None
        except JWTError as e:
            logger.debug("Supabase token verification failed", error=str(e))
            return None


class SupabaseAuthService:
    """Handles Supabase Auth operations with proper error handling."""
    
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client
        logger.info("SupabaseAuthService initialized")
    
    async def sign_up(self, email: str, password: str, full_name: str) -> Dict[str, Any]:
        """
        Register a new user.
        
        Returns:
            Dict with 'user' and 'session' keys
            
        Raises:
            AuthError: If registration fails
        """
        try:
            logger.info("Attempting sign up", email=email)
            
            response = self.supabase.auth.sign_up({
                "email": email,
                "password": password,
                "options": {
                    "data": {"full_name": full_name}
                }
            })
            
            if not response.user:
                raise AuthError(
                    message="Sign up failed - no user returned",
                    code="SIGNUP_FAILED"
                )
            
            logger.info("Sign up successful", user_id=response.user.id, email=email)
            
            return {
                "user": response.user,
                "session": response.session  # May be None if email confirmation required
            }
            
        except AuthError:
            raise
        except Exception as e:
            error_msg = str(e)
            logger.error("Sign up failed", email=email, error=error_msg)
            
            # Parse common Supabase errors
            if "already registered" in error_msg.lower():
                raise AuthError(
                    message="A user with this email already exists",
                    code="USER_EXISTS"
                )
            elif "invalid" in error_msg.lower() and "email" in error_msg.lower():
                raise AuthError(
                    message="Invalid email address",
                    code="INVALID_EMAIL"
                )
            elif "password" in error_msg.lower():
                raise AuthError(
                    message="Password does not meet requirements",
                    code="WEAK_PASSWORD"
                )
            else:
                raise AuthError(
                    message=f"Registration failed: {error_msg}",
                    code="SIGNUP_ERROR"
                )
    
    async def sign_in(self, email: str, password: str) -> Dict[str, Any]:
        """
        Sign in a user.
        
        Returns:
            Dict with 'user' and 'session' keys
            
        Raises:
            AuthError: If login fails
        """
        try:
            logger.info("Attempting sign in", email=email)
            
            response = self.supabase.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            
            if not response.user or not response.session:
                raise AuthError(
                    message="Sign in failed - invalid response",
                    code="SIGNIN_FAILED"
                )
            
            logger.info("Sign in successful", user_id=response.user.id, email=email)
            
            return {
                "user": response.user,
                "session": response.session
            }
            
        except AuthError:
            raise
        except Exception as e:
            error_msg = str(e)
            logger.warning("Sign in failed", email=email, error=error_msg)
            
            # Parse common errors
            if "invalid login credentials" in error_msg.lower():
                raise AuthError(
                    message="Invalid email or password",
                    code="INVALID_CREDENTIALS"
                )
            elif "email not confirmed" in error_msg.lower():
                raise AuthError(
                    message="Please verify your email before signing in",
                    code="EMAIL_NOT_CONFIRMED"
                )
            else:
                raise AuthError(
                    message=f"Sign in failed: {error_msg}",
                    code="SIGNIN_ERROR"
                )
    
    async def sign_out(self) -> None:
        """Sign out the current user."""
        try:
            self.supabase.auth.sign_out()
            logger.info("User signed out")
        except Exception as e:
            logger.error("Sign out failed", error=str(e))
            # Don't raise - sign out should be best-effort
    
    async def get_user(self, access_token: str) -> Optional[Any]:
        """Get user info from Supabase using access token."""
        try:
            response = self.supabase.auth.get_user(access_token)
            if response and response.user:
                logger.debug("Got user from Supabase", user_id=response.user.id)
                return response.user
            return None
        except Exception as e:
            logger.error("Failed to get user from Supabase", error=str(e))
            return None
    
    async def refresh_session(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh the user session."""
        try:
            response = self.supabase.auth.refresh_session(refresh_token)
            
            if not response.session:
                raise AuthError(
                    message="Session refresh failed",
                    code="REFRESH_FAILED"
                )
            
            logger.info("Session refreshed")
            return {
                "user": response.user,
                "session": response.session
            }
            
        except AuthError:
            raise
        except Exception as e:
            logger.error("Session refresh failed", error=str(e))
            raise AuthError(
                message="Invalid or expired refresh token",
                code="INVALID_REFRESH_TOKEN"
            )
    
    async def reset_password_email(self, email: str) -> None:
        """Send password reset email."""
        try:
            self.supabase.auth.reset_password_for_email(email)
            logger.info("Password reset email sent", email=email)
        except Exception as e:
            logger.error("Password reset email failed", email=email, error=str(e))
            raise AuthError(
                message="Failed to send password reset email",
                code="RESET_EMAIL_FAILED"
            )


# --- Global Instances ---

def _create_supabase_client() -> Optional[Client]:
    """Create Supabase client for auth operations."""
    try:
        url = settings.SUPABASE_URL
        key = settings.SUPABASE_ANON_KEY
        
        if not url or not key:
            logger.warning("Supabase credentials not configured")
            return None
        
        client = create_client(url, key)
        logger.info("Supabase client created for auth")
        return client
        
    except Exception as e:
        logger.error("Failed to create Supabase client", error=str(e))
        return None


# Initialize global instances
auth_service = AuthService()
_supabase_client = _create_supabase_client()
supabase_auth_service = SupabaseAuthService(_supabase_client) if _supabase_client else None


def get_auth_service() -> AuthService:
    """Get the auth service instance."""
    return auth_service


def get_supabase_auth_service() -> Optional[SupabaseAuthService]:
    """Get the Supabase auth service instance."""
    return supabase_auth_service
