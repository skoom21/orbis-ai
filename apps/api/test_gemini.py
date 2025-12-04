#!/usr/bin/env python3
"""
Quick test to verify Gemini AI is working properly
"""

import asyncio
import sys
import os

# Add the app directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'app'))

async def test_gemini():
    """Test Gemini AI directly"""
    try:
        from app.services.gemini import gemini_service
        
        print("🤖 Testing Gemini AI service...")
        
        # Test simple response
        response = await gemini_service.generate_response(
            user_message="I want to plan a trip to Paris",
            conversation_history=[],
            agent_type="orchestrator"
        )
        
        if response:
            print(f"✅ Gemini Response: {response[:100]}...")
            return True
        else:
            print("❌ Gemini returned empty response")
            return False
            
    except Exception as e:
        print(f"❌ Gemini test failed: {str(e)}")
        return False

async def main():
    success = await test_gemini()
    return 0 if success else 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)