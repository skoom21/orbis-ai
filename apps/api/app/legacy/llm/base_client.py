from abc import ABC, abstractmethod
from typing import AsyncGenerator, Dict, Any, List, Optional

class BaseAIClient(ABC):
    """Base class for all LLM providers (Gemini, OpenAI, Anthropic)"""
    
    @abstractmethod
    async def generate_response(
        self, 
        message: str, 
        conversation_history: List[Dict[str, Any]],
        **kwargs
    ) -> str:
        """Generate a complete response"""
        pass

    @abstractmethod
    async def stream_response(
        self, 
        message: str, 
        conversation_history: List[Dict[str, Any]],
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Stream response chunks"""
        pass
        
    @abstractmethod
    async def get_embedding(self, text: str) -> Optional[List[float]]:
        """Generate embeddings for text"""
        pass
