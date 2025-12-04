"""
Seed script for attractions data.

Seeds the attractions table with popular tourist attractions.
"""

from typing import List, Dict
from app.services.database import db_service
from app.logging_config import get_logger

logger = get_logger("database.seeds.attractions")


# Popular tourist attractions
ATTRACTIONS_DATA = [
    # Paris, France
    {"name": "Eiffel Tower", "city": "Paris", "country_code": "FR", "category": "landmark", "description": "Iconic iron lattice tower on the Champ de Mars", "latitude": 48.8584, "longitude": 2.2945},
    {"name": "Louvre Museum", "city": "Paris", "country_code": "FR", "category": "museum", "description": "World's largest art museum and historic monument", "latitude": 48.8606, "longitude": 2.3376},
    {"name": "Notre-Dame Cathedral", "city": "Paris", "country_code": "FR", "category": "religious", "description": "Medieval Catholic cathedral", "latitude": 48.8530, "longitude": 2.3499},
    
    # Rome, Italy
    {"name": "Colosseum", "city": "Rome", "country_code": "IT", "category": "landmark", "description": "Ancient Roman amphitheatre", "latitude": 41.8902, "longitude": 12.4922},
    {"name": "Vatican Museums", "city": "Rome", "country_code": "IT", "category": "museum", "description": "Art and Christian museums", "latitude": 41.9065, "longitude": 12.4536},
    {"name": "Trevi Fountain", "city": "Rome", "country_code": "IT", "category": "landmark", "description": "18th-century Baroque fountain", "latitude": 41.9009, "longitude": 12.4833},
    
    # Tokyo, Japan
    {"name": "Tokyo Tower", "city": "Tokyo", "country_code": "JP", "category": "landmark", "description": "Communications and observation tower", "latitude": 35.6586, "longitude": 139.7454},
    {"name": "Senso-ji Temple", "city": "Tokyo", "country_code": "JP", "category": "religious", "description": "Ancient Buddhist temple", "latitude": 35.7148, "longitude": 139.7967},
    {"name": "Tokyo Skytree", "city": "Tokyo", "country_code": "JP", "category": "landmark", "description": "Broadcasting and observation tower", "latitude": 35.7101, "longitude": 139.8107},
    
    # London, UK
    {"name": "Big Ben", "city": "London", "country_code": "GB", "category": "landmark", "description": "Iconic clock tower", "latitude": 51.5007, "longitude": -0.1246},
    {"name": "British Museum", "city": "London", "country_code": "GB", "category": "museum", "description": "World-famous museum of human history and culture", "latitude": 51.5194, "longitude": -0.1270},
    {"name": "Tower of London", "city": "London", "country_code": "GB", "category": "landmark", "description": "Historic castle and former royal residence", "latitude": 51.5081, "longitude": -0.0759},
    
    # New York, USA
    {"name": "Statue of Liberty", "city": "New York", "country_code": "US", "category": "landmark", "description": "Iconic neoclassical sculpture", "latitude": 40.6892, "longitude": -74.0445},
    {"name": "Empire State Building", "city": "New York", "country_code": "US", "category": "landmark", "description": "Art Deco skyscraper", "latitude": 40.7484, "longitude": -73.9857},
    {"name": "Central Park", "city": "New York", "country_code": "US", "category": "nature", "description": "Urban park in Manhattan", "latitude": 40.7829, "longitude": -73.9654},
    
    # Dubai, UAE
    {"name": "Burj Khalifa", "city": "Dubai", "country_code": "AE", "category": "landmark", "description": "World's tallest building", "latitude": 25.1972, "longitude": 55.2744},
    {"name": "Dubai Mall", "city": "Dubai", "country_code": "AE", "category": "shopping", "description": "Largest shopping mall in the world", "latitude": 25.1975, "longitude": 55.2796},
    
    # Sydney, Australia
    {"name": "Sydney Opera House", "city": "Sydney", "country_code": "AU", "category": "landmark", "description": "Multi-venue performing arts centre", "latitude": -33.8568, "longitude": 151.2153},
    {"name": "Sydney Harbour Bridge", "city": "Sydney", "country_code": "AU", "category": "landmark", "description": "Steel through arch bridge", "latitude": -33.8523, "longitude": 151.2108},
    
    # Barcelona, Spain
    {"name": "Sagrada Familia", "city": "Barcelona", "country_code": "ES", "category": "religious", "description": "Unfinished Gaudí basilica", "latitude": 41.4036, "longitude": 2.1744},
    {"name": "Park Güell", "city": "Barcelona", "country_code": "ES", "category": "nature", "description": "Public park with Gaudí architecture", "latitude": 41.4145, "longitude": 2.1527},
    
    # Bangkok, Thailand
    {"name": "Grand Palace", "city": "Bangkok", "country_code": "TH", "category": "landmark", "description": "Complex of buildings at the heart of Bangkok", "latitude": 13.7500, "longitude": 100.4913},
    {"name": "Wat Pho", "city": "Bangkok", "country_code": "TH", "category": "religious", "description": "Buddhist temple known for reclining Buddha", "latitude": 13.7465, "longitude": 100.4927},
]


async def seed_attractions():
    """Seed attractions table."""
    logger.info(f"Seeding {len(ATTRACTIONS_DATA)} popular attractions")
    
    for attraction in ATTRACTIONS_DATA:
        try:
            logger.info(f"Inserting attraction: {attraction['name']} ({attraction['city']})")
            
            # Use Supabase upsert to avoid duplicates
            db_service.supabase.table("attractions").upsert(
                attraction,
                on_conflict="name,city,country_code"
            ).execute()
            
        except Exception as e:
            logger.error(f"Failed to seed attraction {attraction['name']}", error=str(e))
            raise
    
    logger.info(f"✅ Successfully seeded {len(ATTRACTIONS_DATA)} attractions")


if __name__ == "__main__":
    import asyncio
    asyncio.run(seed_attractions())
