from typing import Optional, List, Dict, Any
import google.generativeai as genai
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential
import asyncio
import numpy as np

from app.config import settings

logger = structlog.get_logger()

class GeminiClient:
    """Google Gemini LLM client for text generation and embeddings"""
    
    def __init__(self):
        self.api_key = settings.GOOGLE_API_KEY
        self.model_name = settings.GEMINI_MODEL
        self.embedding_model = settings.GEMINI_EMBEDDING_MODEL
        self.embedding_dimension = settings.EMBEDDING_DIMENSION
        
        if self.api_key:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel(self.model_name)
            logger.info("Gemini client initialized", model=self.model_name)
        else:
            logger.warning("Gemini API key not configured")
            self.model = None
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10)
    )
    async def generate_text(
        self, 
        prompt: str, 
        temperature: float = 0.7,
        max_tokens: Optional[int] = None
    ) -> str:
        """Generate text using Gemini Pro"""
        if not self.model:
            return "Gemini client not configured. Please set GOOGLE_API_KEY."
        
        try:
            # Configure generation parameters
            generation_config = genai.types.GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
            )
            
            # Generate response
            response = await asyncio.to_thread(
                self.model.generate_content,
                prompt,
                generation_config=generation_config
            )
            
            if response.text:
                logger.info("Generated text", prompt_length=len(prompt), response_length=len(response.text))
                return response.text
            else:
                logger.warning("Empty response from Gemini", prompt=prompt[:100])
                return "I apologize, but I couldn't generate a response. Please try again."
                
        except Exception as e:
            logger.error("Error generating text", error=str(e), prompt=prompt[:100])
            raise
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10)
    )
    async def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate 768-dimensional embeddings using Gemini"""
        if not self.api_key:
            logger.warning("Cannot generate embeddings: Gemini API key not configured")
            # Return zero vectors as fallback
            return [[0.0] * self.embedding_dimension for _ in texts]
        
        try:
            embeddings = []
            
            for text in texts:
                # Generate embedding for each text
                result = await asyncio.to_thread(
                    genai.embed_content,
                    model=self.embedding_model,
                    content=text,
                    task_type="retrieval_document"
                )
                
                if result and 'embedding' in result:
                    embedding = result['embedding']
                    # Ensure embedding is 768 dimensions
                    if len(embedding) == self.embedding_dimension:
                        embeddings.append(embedding)
                    else:
                        logger.warning(
                            "Unexpected embedding dimension", 
                            expected=self.embedding_dimension,
                            actual=len(embedding)
                        )
                        # Pad or truncate to correct dimension
                        if len(embedding) < self.embedding_dimension:
                            embedding.extend([0.0] * (self.embedding_dimension - len(embedding)))
                        else:
                            embedding = embedding[:self.embedding_dimension]
                        embeddings.append(embedding)
                else:
                    logger.error("Failed to generate embedding", text=text[:100])
                    embeddings.append([0.0] * self.embedding_dimension)
            
            logger.info("Generated embeddings", count=len(embeddings), dimension=self.embedding_dimension)
            return embeddings
            
        except Exception as e:
            logger.error("Error generating embeddings", error=str(e))
            # Return zero vectors as fallback
            return [[0.0] * self.embedding_dimension for _ in texts]
    
    async def generate_single_embedding(self, text: str) -> List[float]:
        """Generate embedding for a single text"""
        embeddings = await self.generate_embeddings([text])
        return embeddings[0] if embeddings else [0.0] * self.embedding_dimension
    
    def cosine_similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """Calculate cosine similarity between two embeddings"""
        try:
            arr1 = np.array(embedding1)
            arr2 = np.array(embedding2)
            
            # Calculate cosine similarity
            dot_product = np.dot(arr1, arr2)
            norm1 = np.linalg.norm(arr1)
            norm2 = np.linalg.norm(arr2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            similarity = dot_product / (norm1 * norm2)
            return float(similarity)
            
        except Exception as e:
            logger.error("Error calculating cosine similarity", error=str(e))
            return 0.0

# Global instance
gemini_client = GeminiClient()