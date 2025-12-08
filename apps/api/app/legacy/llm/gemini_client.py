from typing import AsyncGenerator, Dict, Any, List, Optional
from google import genai
from google.genai import types
from app.config import settings
from app.logging_config import get_logger
from app.llm.base_client import BaseAIClient

logger = get_logger("gemini_client")

class GeminiClient(BaseAIClient):
    """Gemini implementation of BaseAIClient"""
    
    def __init__(self):
        self.client = None
        self._initialize_client()
        
    def _initialize_client(self):
        try:
            if settings.GOOGLE_API_KEY:
                self.client = genai.Client(api_key=settings.GOOGLE_API_KEY)
                logger.info("Gemini client initialized successfully")
            else:
                logger.warning("Google API key not configured")
        except Exception as e:
            logger.error("Failed to initialize Gemini client", error=str(e))

    def _build_contents(self, message: str, conversation_history: List[Dict[str, Any]]) -> List[types.Content]:
        contents = []
        if conversation_history:
            for msg in conversation_history[-10:]:
                role = "model" if msg.get("role") == "assistant" else "user"
                contents.append(types.Content(role=role, parts=[types.Part(text=msg.get("content", ""))]))
        
        contents.append(types.Content(role="user", parts=[types.Part(text=message)]))
        return contents

    async def generate_response(
        self, 
        message: str, 
        conversation_history: List[Dict[str, Any]],
        **kwargs
    ) -> str:
        if not self.client:
            raise Exception("Gemini client not initialized")
            
        model = kwargs.get("model", settings.GEMINI_MODEL)
        contents = self._build_contents(message, conversation_history)
        
        response = self.client.models.generate_content(
            model=model,
            contents=contents,
            config=types.GenerateContentConfig(
                temperature=kwargs.get("temperature", 0.7),
                max_output_tokens=kwargs.get("max_tokens", 2048),
            )
        )
        
        return response.text if response.text else ""

    async def stream_response(
        self, 
        message: str, 
        conversation_history: List[Dict[str, Any]],
        **kwargs
    ) -> AsyncGenerator[str, None]:
        if not self.client:
            raise Exception("Gemini client not initialized")
            
        model = kwargs.get("model", settings.GEMINI_MODEL)
        contents = self._build_contents(message, conversation_history)
        
        response_stream = self.client.models.generate_content_stream(
            model=model,
            contents=contents,
            config=types.GenerateContentConfig(
                temperature=kwargs.get("temperature", 0.7),
                max_output_tokens=kwargs.get("max_tokens", 2048),
            )
        )
        
        for chunk in response_stream:
            if chunk.text:
                yield chunk.text

    async def get_embedding(self, text: str) -> Optional[List[float]]:
        if not self.client:
            return None
        
        try:
            text = text.replace("\n", " ")
            response = self.client.models.embed_content(
                model=settings.GEMINI_EMBEDDING_MODEL,
                content=text,
            )
            return response.embedding.values if response.embedding else None
        except Exception as e:
            logger.error("Error generating embedding", error=str(e))
            return None
