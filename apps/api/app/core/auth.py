"""
Core authentication module for Orbis AI.

Handles JWT token creation/validation, password hashing, and Supabase Auth integration.
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from supabase import Client, create_client
from app.config import settings
from app.logging_config import get_logger

logger = get_logger("auth")

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    """Handles authentication operations."""
    
    def __init__(self):
        self.secret_key = settings.JWT_SECRET_KEY
        self.algorithm = settings.JWT_ALGORITHM
        self.access_token_expire_minutes = settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash."""
        return pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        """Hash a password."""
        return pwd_context.hash(password)
    
    def create_access_token(
        self, 
        data: Dict[str, Any], 
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """
        Create a JWT access token.
        
        Args:
            data: Payload to encode in the token
            expires_delta: Optional custom expiration time
            
        Returns:
            Encoded JWT token string
        """
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        
        to_encode.update({
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "access"
        })
        
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        logger.info("Created access token", user_id=data.get("sub"), expires_at=expire.isoformat())
        
        return encoded_jwt
    
    def create_refresh_token(self, data: Dict[str, Any]) -> str:
        """
        Create a JWT refresh token with longer expiration.
        
        Args:
            data: Payload to encode in the token
            
        Returns:
            Encoded JWT refresh token string
        """
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=7)  # Refresh tokens last 7 days
        
        to_encode.update({
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "refresh"
        })
        
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        logger.info("Created refresh token", user_id=data.get("sub"))
        
        return encoded_jwt
    
    def decode_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Decode and validate a JWT token.
        
        Args:
            token: JWT token string
            
        Returns:
            Decoded token payload or None if invalid
        """
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except JWTError as e:
            logger.warning("Token decode failed", error=str(e))
            return None
    
    def verify_token(self, token: str) -> Optional[str]:
        """
        Verify a JWT token and extract user ID.
        Supports both backend-issued tokens and Supabase tokens.
        
        Args:
            token: JWT token string
            
        Returns:
            User ID (sub claim) or None if invalid
        """
        # First try to decode as our own token
        payload = self.decode_token(token)
        
        # If our verification fails, try Supabase token verification
        if payload is None:
            payload = self._decode_supabase_token(token)
        
        if payload is None:
            return None
        
        user_id: str = payload.get("sub")
        if user_id is None:
            logger.warning("Token missing sub claim")
            return None
        
        return user_id
    
    def _decode_supabase_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Decode a Supabase JWT token.
        
        Args:
            token: JWT token string from Supabase
            
        Returns:
            Decoded token payload or None if invalid
        """
        try:
            # Supabase tokens can be verified without signature if we just need to read them
            # For production, you should verify with Supabase JWT secret from project settings
            # Get the JWT secret from Supabase Dashboard -> Settings -> API -> JWT Secret
            supabase_jwt_secret = settings.SUPABASE_JWT_SECRET if hasattr(settings, 'SUPABASE_JWT_SECRET') else None
            
            if supabase_jwt_secret:
                # Verify with Supabase JWT secret
                payload = jwt.decode(token, supabase_jwt_secret, algorithms=["HS256"], audience="authenticated")
                logger.info("Supabase token verified", user_id=payload.get("sub"))
                return payload
            else:
                # Fallback: decode without verification (not recommended for production)
                # This allows the token to be read but doesn't verify its authenticity
                payload = jwt.decode(token, options={"verify_signature": False})
                logger.warning("Supabase token decoded without verification - add SUPABASE_JWT_SECRET for production")
                return payload
                
        except JWTError as e:
            logger.warning("Supabase token decode failed", error=str(e))
            return None
    
    def validate_token_type(self, token: str, expected_type: str = "access") -> bool:
        """
        Validate that a token is of the expected type.
        
        Args:
            token: JWT token string
            expected_type: Expected token type ('access' or 'refresh')
            
        Returns:
            True if token type matches, False otherwise
        """
        payload = self.decode_token(token)
        if payload is None:
            return False
        
        token_type = payload.get("type")
        return token_type == expected_type


class SupabaseAuthService:
    """Handles Supabase Auth operations."""
    
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client
    
    async def sign_up(self, email: str, password: str, metadata: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Register a new user with Supabase Auth.
        
        Args:
            email: User email
            password: User password
            metadata: Optional user metadata
            
        Returns:
            Supabase auth response with user and session
        """
        try:
            response = self.supabase.auth.sign_up({
                "email": email,
                "password": password,
                "options": {
                    "data": metadata or {}
                }
            })
            
            logger.info("User signed up", email=email)
            return response
            
        except Exception as e:
            logger.error("Sign up failed", email=email, error=str(e))
            raise
    
    async def sign_in(self, email: str, password: str) -> Dict[str, Any]:
        """
        Sign in a user with Supabase Auth.
        
        Args:
            email: User email
            password: User password
            
        Returns:
            Supabase auth response with user and session
        """
        try:
            response = self.supabase.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            
            logger.info("User signed in", email=email)
            return response
            
        except Exception as e:
            logger.error("Sign in failed", email=email, error=str(e))
            raise
    
    async def sign_out(self, access_token: str) -> None:
        """
        Sign out a user.
        
        Args:
            access_token: User's access token
        """
        try:
            self.supabase.auth.sign_out()
            logger.info("User signed out")
        except Exception as e:
            logger.error("Sign out failed", error=str(e))
            raise
    
    async def get_user(self, access_token: str) -> Dict[str, Any]:
        """
        Get user information from Supabase Auth.
        
        Args:
            access_token: User's access token
            
        Returns:
            User information from Supabase Auth
        """
        try:
            response = self.supabase.auth.get_user(access_token)
            logger.info("Retrieved user from Supabase Auth")
            return response
        except Exception as e:
            logger.error("Failed to get user from Supabase Auth", error=str(e))
            return {"error": str(e)}
    
    async def reset_password_email(self, email: str) -> Dict[str, Any]:
        """
        Send password reset email.
        
        Args:
            email: User email
            
        Returns:
            Supabase response
        """
        try:
            response = self.supabase.auth.reset_password_for_email(email)
            logger.info("Password reset email sent", email=email)
            return response
        except Exception as e:
            logger.error("Password reset email failed", email=email, error=str(e))
            raise
    
    async def update_password(self, access_token: str, new_password: str) -> Dict[str, Any]:
        """
        Update user password.
        
        Args:
            access_token: User's access token
            new_password: New password
            
        Returns:
            Supabase response
        """
        try:
            # Set the session first
            self.supabase.auth.set_session(access_token, None)
            
            response = self.supabase.auth.update_user({
                "password": new_password
            })
            
            logger.info("Password updated")
            return response
        except Exception as e:
            logger.error("Password update failed", error=str(e))
            raise
    
    async def verify_email(self, token: str, type: str = "signup") -> Dict[str, Any]:
        """
        Verify user email with token.
        
        Args:
            token: Verification token
            type: Verification type ('signup' or 'recovery')
            
        Returns:
            Supabase response
        """
        try:
            response = self.supabase.auth.verify_otp({
                "token": token,
                "type": type
            })
            logger.info("Email verified", type=type)
            return response
        except Exception as e:
            logger.error("Email verification failed", error=str(e))
            raise
    
    async def get_user(self, access_token: str) -> Optional[Dict[str, Any]]:
        """
        Get user data from access token.
        
        Args:
            access_token: User's access token
            
        Returns:
            User data or None if invalid
        """
        try:
            # Set session
            self.supabase.auth.set_session(access_token, None)
            
            response = self.supabase.auth.get_user()
            return response.user if response else None
        except Exception as e:
            logger.error("Get user failed", error=str(e))
            return None
    
    async def refresh_session(self, refresh_token: str) -> Dict[str, Any]:
        """
        Refresh user session.
        
        Args:
            refresh_token: Refresh token
            
        Returns:
            New session with access token
        """
        try:
            response = self.supabase.auth.refresh_session(refresh_token)
            logger.info("Session refreshed")
            return response
        except Exception as e:
            logger.error("Session refresh failed", error=str(e))
            raise


# Initialize Supabase client for authentication
def _get_supabase_client() -> Optional[Client]:
    """Get or create Supabase client for auth operations."""
    try:
        if settings.SUPABASE_URL and settings.SUPABASE_ANON_KEY:
            return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
        logger.warning("Supabase credentials not configured for auth")
        return None
    except Exception as e:
        logger.error("Failed to initialize Supabase client for auth", error=str(e))
        return None


# Global auth service instances
auth_service = AuthService()

# Initialize Supabase auth service only if client is available
_supabase_client = _get_supabase_client()
supabase_auth_service = SupabaseAuthService(_supabase_client) if _supabase_client else None


def get_auth_service() -> AuthService:
    """Get the auth service instance."""
    return auth_service


def get_supabase_auth_service() -> Optional[SupabaseAuthService]:
    """Get the Supabase auth service instance."""
    return supabase_auth_service
