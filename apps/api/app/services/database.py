"""Database service using Supabase for data management."""

from typing import Optional, List, Dict, Any
from datetime import datetime
import time
import uuid
from supabase import create_client, Client
from app.config import settings
from app.services.memory_fallback import memory_service

from app.logging_config import get_logger, log_database_operation

logger = get_logger("database")

class DatabaseCircuitBreaker:
    """Circuit breaker for database operations."""
    
    def __init__(self, failure_threshold: int = 3, recovery_timeout: int = 30):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failures = 0
        self.last_failure_time = 0
        self.state = "closed"  # closed, open, half_open
    
    def should_attempt(self) -> bool:
        if self.state == "closed":
            return True
        elif self.state == "open":
            if time.time() - self.last_failure_time > self.recovery_timeout:
                self.state = "half_open"
                return True
            return False
        return True  # half_open
    
    def record_success(self):
        self.failures = 0
        self.state = "closed"
    
    def record_failure(self):
        self.failures += 1
        self.last_failure_time = time.time()
        if self.failures >= self.failure_threshold:
            self.state = "open"
            logger.warning(f"Database circuit breaker opened after {self.failures} failures")

class DatabaseService:
    """Handles all database operations using Supabase."""
    
    def __init__(self):
        self.supabase: Optional[Client] = None
        self.circuit_breaker = DatabaseCircuitBreaker()
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize Supabase client with service role for backend operations."""
        try:
            if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY:
                # Use service role key for backend operations to bypass RLS policies
                self.supabase = create_client(
                    settings.SUPABASE_URL,
                    settings.SUPABASE_SERVICE_KEY
                )
                logger.info("Supabase client initialized with service role")
            elif settings.SUPABASE_URL and settings.SUPABASE_ANON_KEY:
                # Fallback to anon key with warning
                self.supabase = create_client(
                    settings.SUPABASE_URL,
                    settings.SUPABASE_ANON_KEY
                )
                logger.warning("Using anon key - RLS policies may block operations")
            else:
                logger.warning("Supabase credentials not configured")
        except Exception as e:
            logger.error("Failed to initialize Supabase client", error=str(e))
    
    async def create_user(
        self, 
        email: str, 
        full_name: str, 
        user_id: Optional[str] = None,
        metadata: Dict[str, Any] = None
    ) -> Optional[str]:
        """
        Create a new user in public.users.
        
        Args:
            email: User email
            full_name: User's full name
            user_id: Optional UUID - if provided, uses this as the ID (for syncing with auth.users)
            metadata: Optional metadata dict
            
        Returns:
            User ID if created, None otherwise
        """
        try:
            if not self.supabase:
                logger.error("Supabase client not available")
                return None
            
            user_data = {
                "email": email,
                "full_name": full_name,
                "metadata": metadata or {},
            }
            
            # If user_id provided, include it (for syncing from auth.users)
            if user_id:
                user_data["id"] = user_id
            
            result = self.supabase.table("users").insert(user_data).execute()
            
            if result.data:
                created_id = result.data[0]["id"]
                logger.info("User created successfully", user_id=created_id, email=email)
                return created_id
            else:
                logger.error("Failed to create user - no data returned", email=email)
                return None
                
        except Exception as e:
            error_str = str(e)
            # Check if it's a duplicate key error (user already exists)
            if "duplicate key" in error_str.lower() or "23505" in error_str:
                logger.info("User already exists", email=email)
                return user_id  # Return the ID since user exists
            
            logger.error("Error creating user", email=email, error=error_str)
            return None
    
    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email address."""
        try:
            if not self.supabase:
                return None
            
            result = self.supabase.table("users").select("*").eq("email", email).execute()
            
            if result.data:
                return result.data[0]
            return None
            
        except Exception as e:
            logger.error("Error getting user by email", email=email, error=str(e))
            return None
    
    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID."""
        try:
            if not self.supabase:
                return None
            
            result = self.supabase.table("users").select("*").eq("id", user_id).execute()
            
            if result.data:
                return result.data[0]
            return None
            
        except Exception as e:
            logger.error("Error getting user by id", user_id=user_id, error=str(e))
            return None
    
    async def update_user(self, user_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update user information."""
        try:
            if not self.supabase:
                return None
            
            # Add updated_at timestamp
            update_data["updated_at"] = datetime.utcnow().isoformat()
            
            result = self.supabase.table("users")\
                .update(update_data)\
                .eq("id", user_id)\
                .execute()
            
            if result.data:
                logger.info("User updated successfully", user_id=user_id)
                return result.data[0]
            return None
            
        except Exception as e:
            logger.error("Error updating user", user_id=user_id, error=str(e))
            return None
    
    async def create_conversation(self, user_id: str, title: str = "New Conversation") -> Optional[str]:
        """Create a new conversation for a user with fallback support."""
        import time
        start_time = time.time()
        
        logger.info("Creating conversation", user_id=user_id, title=title[:50])
        
        # Try Supabase first if circuit breaker allows
        if self.circuit_breaker.should_attempt() and self.supabase:
            try:
                conversation_data = {
                    "user_id": user_id,
                    "title": title,
                    "created_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat()
                }
                
                result = self.supabase.table("conversations").insert(conversation_data).execute()
                
                if result.data:
                    conversation_id = result.data[0]["id"]
                    duration = time.time() - start_time
                    self.circuit_breaker.record_success()
                    
                    logger.info(
                        "Conversation created in Supabase",
                        conversation_id=conversation_id,
                        user_id=user_id,
                        source="supabase"
                    )
                    
                    log_database_operation(
                        operation="INSERT",
                        table="conversations",
                        duration=duration,
                        success=True
                    )
                    
                    return conversation_id
                    
            except Exception as e:
                duration = time.time() - start_time
                logger.error(
                    "Error creating conversation in Supabase",
                    user_id=user_id,
                    error=str(e),
                    error_type=type(e).__name__
                )
                log_database_operation(
                    operation="INSERT",
                    table="conversations",
                    duration=duration,
                    success=False,
                    error=str(e)
                )
                self.circuit_breaker.record_failure()
        
        # Fallback to memory service
        try:
            conversation_id = memory_service.create_conversation(user_id, title)
            duration = time.time() - start_time
            
            logger.info(
                "Conversation created in memory fallback",
                conversation_id=conversation_id,
                user_id=user_id,
                source="memory"
            )
            
            log_database_operation(
                operation="INSERT",
                table="conversations",
                duration=duration,
                success=True
            )
            
            return conversation_id
        except Exception as e:
            duration = time.time() - start_time
            logger.error(
                "Error creating conversation in memory fallback",
                user_id=user_id,
                error=str(e)
            )
            log_database_operation(
                operation="INSERT",
                table="conversations",
                duration=duration,
                success=False,
                error=str(e)
            )
            return None
    
    async def add_message(self, conversation_id: str, content: str, role: str, metadata: Dict[str, Any] = None, parent_message_id: Optional[str] = None) -> Optional[str]:
        """Add a message to a conversation with fallback support."""
        import time
        start_time = time.time()
        
        logger.info(
            "Adding message",
            conversation_id=conversation_id,
            role=role,
            content_length=len(content)
        )
        
        # Try Supabase first if circuit breaker allows
        if self.circuit_breaker.should_attempt() and self.supabase:
            try:
                # First ensure conversation exists to prevent foreign key violations
                self._ensure_conversation_exists(conversation_id)
                
                message_data = {
                    "conversation_id": conversation_id,
                    "content": content,
                    "role": role,
                    "metadata": metadata or {},
                    "created_at": datetime.utcnow().isoformat()
                }
                
                if parent_message_id:
                    message_data["parent_message_id"] = parent_message_id
                
                result = self.supabase.table("messages").insert(message_data).execute()
                
                if result.data:
                    message_id = result.data[0]["id"]
                    duration = time.time() - start_time
                    self.circuit_breaker.record_success()
                    
                    logger.info(
                        "Message added to Supabase",
                        message_id=message_id,
                        conversation_id=conversation_id,
                        role=role,
                        source="supabase"
                    )
                    
                    log_database_operation(
                        operation="INSERT",
                        table="messages",
                        duration=duration,
                        success=True
                    )
                    
                    return message_id
                    
            except Exception as e:
                duration = time.time() - start_time
                logger.error(
                    "Error adding message to Supabase",
                    conversation_id=conversation_id,
                    error=str(e),
                    error_type=type(e).__name__
                )
                log_database_operation(
                    operation="INSERT",
                    table="messages",
                    duration=duration,
                    success=False,
                    error=str(e)
                )
                self.circuit_breaker.record_failure()
        
        # Fallback to memory service
        try:
            # Memory service doesn't support parent_message_id yet, but that's fine for fallback
            message_id = memory_service.add_message(conversation_id, content, role, metadata)
            logger.info("Message added to memory fallback", message_id=message_id, conversation_id=conversation_id, role=role)
            return message_id
        except Exception as e:
            logger.error("Error adding message to memory fallback", conversation_id=conversation_id, error=str(e))
            return None

    async def get_conversation(self, conversation_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific conversation."""
        if self.circuit_breaker.should_attempt() and self.supabase:
            try:
                result = self.supabase.table("conversations")\
                    .select("*")\
                    .eq("id", conversation_id)\
                    .eq("user_id", user_id)\
                    .execute()
                if result.data:
                    return result.data[0]
            except Exception as e:
                logger.error("Error getting conversation", conversation_id=conversation_id, error=str(e))
                self.circuit_breaker.record_failure()
        return None

    async def delete_conversation(self, conversation_id: str, user_id: str) -> bool:
        """Delete a conversation."""
        if self.circuit_breaker.should_attempt() and self.supabase:
            try:
                result = self.supabase.table("conversations")\
                    .delete()\
                    .eq("id", conversation_id)\
                    .eq("user_id", user_id)\
                    .execute()
                if result.data:
                    logger.info("Conversation deleted", conversation_id=conversation_id)
                    return True
            except Exception as e:
                logger.error("Error deleting conversation", conversation_id=conversation_id, error=str(e))
                self.circuit_breaker.record_failure()
        return False
    
    async def get_conversation_messages(self, conversation_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get messages for a conversation with fallback support."""
        # Try Supabase first if circuit breaker allows
        if self.circuit_breaker.should_attempt() and self.supabase:
            try:
                result = self.supabase.table("messages")\
                    .select("*")\
                    .eq("conversation_id", conversation_id)\
                    .order("created_at", desc=False)\
                    .limit(limit)\
                    .execute()
                
                if result.data:
                    self.circuit_breaker.record_success()
                    logger.debug("Retrieved messages from Supabase", conversation_id=conversation_id, count=len(result.data))
                    return result.data
                    
            except Exception as e:
                logger.error("Error getting messages from Supabase", conversation_id=conversation_id, error=str(e))
                self.circuit_breaker.record_failure()
        
        # Fallback to memory service
        try:
            messages = memory_service.get_conversation_messages(conversation_id, limit)
            logger.debug("Retrieved messages from memory fallback", conversation_id=conversation_id, count=len(messages))
            return messages
        except Exception as e:
            logger.error("Error getting messages from memory fallback", conversation_id=conversation_id, error=str(e))
            return []
    
    async def get_user_conversations(self, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get conversations for a user with fallback support."""
        # Try Supabase first if circuit breaker allows
        if self.circuit_breaker.should_attempt() and self.supabase:
            try:
                result = self.supabase.table("conversations")\
                    .select("*")\
                    .eq("user_id", user_id)\
                    .order("updated_at", desc=True)\
                    .limit(limit)\
                    .execute()
                
                if result.data:
                    self.circuit_breaker.record_success()
                    logger.debug("Retrieved conversations from Supabase", user_id=user_id, count=len(result.data))
                    return result.data
                    
            except Exception as e:
                logger.error("Error getting conversations from Supabase", user_id=user_id, error=str(e))
                self.circuit_breaker.record_failure()
        
        # Fallback to memory service
        try:
            conversations = memory_service.get_user_conversations(user_id, limit)
            logger.debug("Retrieved conversations from memory fallback", user_id=user_id, count=len(conversations))
            return conversations
        except Exception as e:
            logger.error("Error getting conversations from memory fallback", user_id=user_id, error=str(e))
            return []
    
    async def update_conversation_title(self, conversation_id: str, title: str) -> bool:
        """Update conversation title with fallback support."""
        # Try Supabase first if circuit breaker allows
        if self.circuit_breaker.should_attempt() and self.supabase:
            try:
                result = self.supabase.table("conversations")\
                    .update({"title": title, "updated_at": datetime.utcnow().isoformat()})\
                    .eq("id", conversation_id)\
                    .execute()
                
                if result.data:
                    self.circuit_breaker.record_success()
                    logger.info("Updated conversation title in Supabase", conversation_id=conversation_id, title=title)
                    return True
                    
            except Exception as e:
                logger.error("Error updating title in Supabase", conversation_id=conversation_id, error=str(e))
                self.circuit_breaker.record_failure()
        
        # Fallback to memory service
        try:
            success = memory_service.update_conversation_title(conversation_id, title)
            if success:
                logger.info("Updated conversation title in memory fallback", conversation_id=conversation_id, title=title)
            return success
        except Exception as e:
            logger.error("Error updating title in memory fallback", conversation_id=conversation_id, error=str(e))
            return False
    
    def get_conversation_context(self, conversation_id: str, max_messages: int = 10) -> List[Dict[str, str]]:
        """Get conversation context for AI processing with fallback support."""
        try:
            # Always try memory service first for context (faster)
            context = memory_service.get_conversation_context(conversation_id, max_messages)
            if context:
                logger.debug("Retrieved context from memory", conversation_id=conversation_id, messages=len(context))
                return context
            
            # If no memory context, we might need to fetch from database and populate memory
            # For now, return empty context - this can be enhanced later
            logger.warning("No conversation context available", conversation_id=conversation_id)
            return []
            
        except Exception as e:
            logger.error("Error getting conversation context", conversation_id=conversation_id, error=str(e))
            return []
    
    def health_check(self) -> Dict[str, Any]:
        """Get database service health information."""
        health = {
            "supabase_available": bool(self.supabase),
            "circuit_breaker_state": self.circuit_breaker.state,
            "circuit_breaker_failures": self.circuit_breaker.failures,
            "memory_fallback": memory_service.health_check()
        }
        
        if self.supabase:
            # Could add Supabase health check here if needed
            health["supabase_status"] = "connected"
        else:
            health["supabase_status"] = "disconnected"
        
        return health
    
    def _ensure_conversation_exists(self, conversation_id: str, user_id: Optional[str] = None):
        """Ensure conversation exists in database before adding messages (synchronous helper)."""
        if not self.supabase:
            return
            
        try:
            # Check if conversation exists
            response = self.supabase.table("conversations").select("id").eq("id", conversation_id).execute()
            
            if not response.data:
                # Create conversation if it doesn't exist
                # Use provided user_id or a consistent default
                actual_user_id = user_id if user_id else "00000000-0000-0000-0000-000000000001"
                
                conversation_data = {
                    "id": conversation_id,
                    "user_id": actual_user_id,
                    "title": "AI Chat",
                    "created_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat()
                }
                
                create_response = self.supabase.table("conversations").insert(conversation_data).execute()
                if create_response.data:
                    logger.info("Created missing conversation in database", conversation_id=conversation_id, user_id=actual_user_id)
                    
        except Exception as e:
            logger.warning("Could not ensure conversation exists", conversation_id=conversation_id, error=str(e))
            # Don't raise - let the calling method handle the foreign key error

# Global database service instance
db_service = DatabaseService()