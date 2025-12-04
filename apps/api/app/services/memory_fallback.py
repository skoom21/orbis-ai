"""In-memory fallback service for when Redis and Supabase are unavailable."""

from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import threading
from dataclasses import dataclass, field
import uuid

from app.logging_config import get_logger

logger = get_logger("memory_fallback")

@dataclass
class Message:
    """In-memory message representation."""
    id: str
    conversation_id: str
    content: str
    role: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)

@dataclass
class Conversation:
    """In-memory conversation representation."""
    id: str
    user_id: str
    title: str
    status: str = "active"
    messages: List[Message] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

class MemoryFallbackService:
    """In-memory fallback for critical conversation data."""
    
    def __init__(self, max_conversations: int = 100, max_messages_per_conversation: int = 50):
        self._conversations: Dict[str, Conversation] = {}
        self._user_conversations: Dict[str, List[str]] = {}  # user_id -> conversation_ids
        self._max_conversations = max_conversations
        self._max_messages_per_conversation = max_messages_per_conversation
        self._lock = threading.RLock()
        logger.info("Memory fallback service initialized")
    
    def _cleanup_old_conversations(self):
        """Remove old conversations to prevent memory bloat."""
        with self._lock:
            if len(self._conversations) <= self._max_conversations:
                return
            
            # Sort conversations by last update time and remove oldest
            sorted_convos = sorted(
                self._conversations.items(),
                key=lambda x: x[1].updated_at
            )
            
            conversations_to_remove = len(self._conversations) - self._max_conversations
            for i in range(conversations_to_remove):
                conv_id, conversation = sorted_convos[i]
                
                # Remove from user conversations list
                if conversation.user_id in self._user_conversations:
                    if conv_id in self._user_conversations[conversation.user_id]:
                        self._user_conversations[conversation.user_id].remove(conv_id)
                
                # Remove conversation
                del self._conversations[conv_id]
                logger.debug("Removed old conversation from memory", conversation_id=conv_id)
    
    def _cleanup_old_messages(self, conversation_id: str):
        """Remove old messages from a conversation to prevent memory bloat."""
        with self._lock:
            if conversation_id not in self._conversations:
                return
            
            conversation = self._conversations[conversation_id]
            if len(conversation.messages) <= self._max_messages_per_conversation:
                return
            
            # Keep only the most recent messages
            messages_to_remove = len(conversation.messages) - self._max_messages_per_conversation
            conversation.messages = conversation.messages[messages_to_remove:]
            logger.debug(
                "Trimmed old messages from conversation", 
                conversation_id=conversation_id,
                messages_removed=messages_to_remove
            )
    
    def create_conversation(self, user_id: str, title: str = "New Conversation") -> str:
        """Create a new conversation in memory."""
        with self._lock:
            conversation_id = str(uuid.uuid4())
            conversation = Conversation(
                id=conversation_id,
                user_id=user_id,
                title=title
            )
            
            self._conversations[conversation_id] = conversation
            
    def create_conversation_with_id(self, conversation_id: str, user_id: str, title: str = "New Conversation") -> str:
        """Create a conversation with a specific ID in memory."""
        with self._lock:
            if conversation_id in self._conversations:
                return conversation_id  # Already exists
                
            conversation = Conversation(
                id=conversation_id,
                user_id=user_id,
                title=title
            )
            
            self._conversations[conversation_id] = conversation
            
            # Add to user's conversation list
            if user_id not in self._user_conversations:
                self._user_conversations[user_id] = []
            self._user_conversations[user_id].append(conversation_id)
            
            self._cleanup_old_conversations()
            logger.info("Created conversation in memory", conversation_id=conversation_id, user_id=user_id)
            return conversation_id
            
            logger.info("Created conversation in memory", conversation_id=conversation_id, user_id=user_id)
            return conversation_id
    
    def add_message(
        self, 
        conversation_id: str, 
        content: str, 
        role: str, 
        metadata: Dict[str, Any] = None
    ) -> Optional[str]:
        """Add a message to a conversation in memory."""
        with self._lock:
            if conversation_id not in self._conversations:
                logger.warning("Conversation not found in memory", conversation_id=conversation_id)
                return None
            
            message_id = str(uuid.uuid4())
            message = Message(
                id=message_id,
                conversation_id=conversation_id,
                content=content,
                role=role,
                metadata=metadata or {}
            )
            
            conversation = self._conversations[conversation_id]
            conversation.messages.append(message)
            conversation.updated_at = datetime.utcnow()
            
            self._cleanup_old_messages(conversation_id)
            
            logger.info(
                "Added message to memory conversation", 
                message_id=message_id,
                conversation_id=conversation_id,
                role=role
            )
            return message_id
    
    def get_conversation_messages(self, conversation_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get messages for a conversation from memory."""
        with self._lock:
            if conversation_id not in self._conversations:
                logger.warning("Conversation not found in memory", conversation_id=conversation_id)
                return []
            
            conversation = self._conversations[conversation_id]
            messages = conversation.messages[-limit:] if limit else conversation.messages
            
            # Convert to dict format
            message_dicts = []
            for message in messages:
                message_dicts.append({
                    "id": message.id,
                    "conversation_id": message.conversation_id,
                    "content": message.content,
                    "role": message.role,
                    "metadata": message.metadata,
                    "created_at": message.created_at.isoformat()
                })
            
            logger.debug("Retrieved messages from memory", conversation_id=conversation_id, count=len(message_dicts))
            return message_dicts
    
    def get_user_conversations(self, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get conversations for a user from memory."""
        with self._lock:
            if user_id not in self._user_conversations:
                return []
            
            conversation_ids = self._user_conversations[user_id]
            conversations = []
            
            # Get conversation details and sort by updated time
            for conv_id in conversation_ids:
                if conv_id in self._conversations:
                    conversation = self._conversations[conv_id]
                    conversations.append({
                        "id": conversation.id,
                        "user_id": conversation.user_id,
                        "title": conversation.title,
                        "status": conversation.status,
                        "created_at": conversation.created_at.isoformat(),
                        "updated_at": conversation.updated_at.isoformat(),
                        "message_count": len(conversation.messages)
                    })
            
            # Sort by updated_at (most recent first) and limit
            conversations.sort(key=lambda x: x["updated_at"], reverse=True)
            limited_conversations = conversations[:limit] if limit else conversations
            
            logger.debug("Retrieved user conversations from memory", user_id=user_id, count=len(limited_conversations))
            return limited_conversations
    
    def update_conversation_title(self, conversation_id: str, title: str) -> bool:
        """Update conversation title in memory."""
        with self._lock:
            if conversation_id not in self._conversations:
                logger.warning("Conversation not found for title update", conversation_id=conversation_id)
                return False
            
            conversation = self._conversations[conversation_id]
            conversation.title = title
            conversation.updated_at = datetime.utcnow()
            
            logger.info("Updated conversation title in memory", conversation_id=conversation_id, title=title)
            return True
    
    def get_conversation_context(self, conversation_id: str, max_messages: int = 10) -> List[Dict[str, str]]:
        """Get recent conversation context for AI processing."""
        messages = self.get_conversation_messages(conversation_id, max_messages)
        
        # Convert to simple format for AI
        context = []
        for message in messages:
            context.append({
                "role": message["role"],
                "content": message["content"]
            })
        
        logger.debug("Retrieved conversation context from memory", conversation_id=conversation_id, messages=len(context))
        return context
    
    def health_check(self) -> Dict[str, Any]:
        """Get memory service health information."""
        with self._lock:
            total_messages = sum(len(conv.messages) for conv in self._conversations.values())
            
            return {
                "status": "healthy",
                "conversations_count": len(self._conversations),
                "users_count": len(self._user_conversations),
                "total_messages": total_messages,
                "max_conversations": self._max_conversations,
                "max_messages_per_conversation": self._max_messages_per_conversation
            }

# Global memory fallback service instance
memory_service = MemoryFallbackService()