"""
Seed script for airports data.

Seeds the airports table with major international airports.
"""

from typing import List, Dict
from app.services.database import db_service
from app.logging_config import get_logger

logger = get_logger("database.seeds.airports")


# Major international airports
AIRPORTS_DATA = [
    # United States
    {"iata_code": "JFK", "name": "John F. Kennedy International Airport", "city": "New York", "country_code": "US", "latitude": 40.6413, "longitude": -73.7781},
    {"iata_code": "LAX", "name": "Los Angeles International Airport", "city": "Los Angeles", "country_code": "US", "latitude": 33.9416, "longitude": -118.4085},
    {"iata_code": "ORD", "name": "O'Hare International Airport", "city": "Chicago", "country_code": "US", "latitude": 41.9742, "longitude": -87.9073},
    {"iata_code": "SFO", "name": "San Francisco International Airport", "city": "San Francisco", "country_code": "US", "latitude": 37.6213, "longitude": -122.3790},
    {"iata_code": "MIA", "name": "Miami International Airport", "city": "Miami", "country_code": "US", "latitude": 25.7959, "longitude": -80.2870},
    
    # Europe
    {"iata_code": "LHR", "name": "London Heathrow Airport", "city": "London", "country_code": "GB", "latitude": 51.4700, "longitude": -0.4543},
    {"iata_code": "CDG", "name": "Charles de Gaulle Airport", "city": "Paris", "country_code": "FR", "latitude": 49.0097, "longitude": 2.5479},
    {"iata_code": "FCO", "name": "Leonardo da Vinci–Fiumicino Airport", "city": "Rome", "country_code": "IT", "latitude": 41.8003, "longitude": 12.2389},
    {"iata_code": "MAD", "name": "Adolfo Suárez Madrid–Barajas Airport", "city": "Madrid", "country_code": "ES", "latitude": 40.4719, "longitude": -3.5626},
    {"iata_code": "FRA", "name": "Frankfurt Airport", "city": "Frankfurt", "country_code": "DE", "latitude": 50.0379, "longitude": 8.5622},
    {"iata_code": "AMS", "name": "Amsterdam Airport Schiphol", "city": "Amsterdam", "country_code": "NL", "latitude": 52.3105, "longitude": 4.7683},
    
    # Asia
    {"iata_code": "NRT", "name": "Narita International Airport", "city": "Tokyo", "country_code": "JP", "latitude": 35.7647, "longitude": 140.3864},
    {"iata_code": "HND", "name": "Tokyo Haneda Airport", "city": "Tokyo", "country_code": "JP", "latitude": 35.5494, "longitude": 139.7798},
    {"iata_code": "BKK", "name": "Suvarnabhumi Airport", "city": "Bangkok", "country_code": "TH", "latitude": 13.6900, "longitude": 100.7501},
    {"iata_code": "SIN", "name": "Singapore Changi Airport", "city": "Singapore", "country_code": "SG", "latitude": 1.3644, "longitude": 103.9915},
    {"iata_code": "HKG", "name": "Hong Kong International Airport", "city": "Hong Kong", "country_code": "HK", "latitude": 22.3080, "longitude": 113.9185},
    {"iata_code": "DXB", "name": "Dubai International Airport", "city": "Dubai", "country_code": "AE", "latitude": 25.2532, "longitude": 55.3657},
    
    # Australia & Oceania
    {"iata_code": "SYD", "name": "Sydney Kingsford Smith Airport", "city": "Sydney", "country_code": "AU", "latitude": -33.9399, "longitude": 151.1753},
    {"iata_code": "MEL", "name": "Melbourne Airport", "city": "Melbourne", "country_code": "AU", "latitude": -37.6690, "longitude": 144.8410},
    
    # Middle East
    {"iata_code": "DOH", "name": "Hamad International Airport", "city": "Doha", "country_code": "QA", "latitude": 25.2731, "longitude": 51.6080},
    
    # South America
    {"iata_code": "GRU", "name": "São Paulo/Guarulhos International Airport", "city": "São Paulo", "country_code": "BR", "latitude": -23.4356, "longitude": -46.4731},
    
    # Canada
    {"iata_code": "YYZ", "name": "Toronto Pearson International Airport", "city": "Toronto", "country_code": "CA", "latitude": 43.6777, "longitude": -79.6248},
    {"iata_code": "YVR", "name": "Vancouver International Airport", "city": "Vancouver", "country_code": "CA", "latitude": 49.1939, "longitude": -123.1844},
]


async def seed_airports():
    """Seed airports table."""
    logger.info(f"Seeding {len(AIRPORTS_DATA)} major airports")
    
    for airport in AIRPORTS_DATA:
        try:
            logger.info(f"Inserting airport: {airport['iata_code']} - {airport['name']}")
            
            # Use Supabase upsert to avoid duplicates
            db_service.supabase.table("airports").upsert(
                airport,
                on_conflict="iata_code"
            ).execute()
            
        except Exception as e:
            logger.error(f"Failed to seed airport {airport['iata_code']}", error=str(e))
            raise
    
    logger.info(f"✅ Successfully seeded {len(AIRPORTS_DATA)} airports")


if __name__ == "__main__":
    import asyncio
    asyncio.run(seed_airports())
