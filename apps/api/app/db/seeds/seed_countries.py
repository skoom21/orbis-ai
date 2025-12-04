"""
Seed script for countries and cities data.

Seeds the countries and cities tables with common travel destinations.
"""

from typing import List, Dict
from app.services.database import db_service
from app.logging_config import get_logger

logger = get_logger("database.seeds.countries")


# Sample countries with major cities
COUNTRIES_DATA = [
    {
        "code": "US",
        "name": "United States",
        "continent": "North America",
        "cities": [
            {"name": "New York", "state": "NY", "is_major": True, "latitude": 40.7128, "longitude": -74.0060},
            {"name": "Los Angeles", "state": "CA", "is_major": True, "latitude": 34.0522, "longitude": -118.2437},
            {"name": "Chicago", "state": "IL", "is_major": True, "latitude": 41.8781, "longitude": -87.6298},
            {"name": "San Francisco", "state": "CA", "is_major": True, "latitude": 37.7749, "longitude": -122.4194},
            {"name": "Miami", "state": "FL", "is_major": True, "latitude": 25.7617, "longitude": -80.1918},
        ]
    },
    {
        "code": "FR",
        "name": "France",
        "continent": "Europe",
        "cities": [
            {"name": "Paris", "is_major": True, "latitude": 48.8566, "longitude": 2.3522},
            {"name": "Nice", "is_major": True, "latitude": 43.7102, "longitude": 7.2620},
            {"name": "Lyon", "is_major": True, "latitude": 45.7640, "longitude": 4.8357},
            {"name": "Marseille", "is_major": True, "latitude": 43.2965, "longitude": 5.3698},
        ]
    },
    {
        "code": "IT",
        "name": "Italy",
        "continent": "Europe",
        "cities": [
            {"name": "Rome", "is_major": True, "latitude": 41.9028, "longitude": 12.4964},
            {"name": "Venice", "is_major": True, "latitude": 45.4408, "longitude": 12.3155},
            {"name": "Florence", "is_major": True, "latitude": 43.7696, "longitude": 11.2558},
            {"name": "Milan", "is_major": True, "latitude": 45.4642, "longitude": 9.1900},
        ]
    },
    {
        "code": "JP",
        "name": "Japan",
        "continent": "Asia",
        "cities": [
            {"name": "Tokyo", "is_major": True, "latitude": 35.6762, "longitude": 139.6503},
            {"name": "Kyoto", "is_major": True, "latitude": 35.0116, "longitude": 135.7681},
            {"name": "Osaka", "is_major": True, "latitude": 34.6937, "longitude": 135.5023},
            {"name": "Hiroshima", "is_major": True, "latitude": 34.3853, "longitude": 132.4553},
        ]
    },
    {
        "code": "GB",
        "name": "United Kingdom",
        "continent": "Europe",
        "cities": [
            {"name": "London", "is_major": True, "latitude": 51.5074, "longitude": -0.1278},
            {"name": "Edinburgh", "is_major": True, "latitude": 55.9533, "longitude": -3.1883},
            {"name": "Manchester", "is_major": True, "latitude": 53.4808, "longitude": -2.2426},
        ]
    },
    {
        "code": "ES",
        "name": "Spain",
        "continent": "Europe",
        "cities": [
            {"name": "Barcelona", "is_major": True, "latitude": 41.3851, "longitude": 2.1734},
            {"name": "Madrid", "is_major": True, "latitude": 40.4168, "longitude": -3.7038},
            {"name": "Seville", "is_major": True, "latitude": 37.3891, "longitude": -5.9845},
        ]
    },
    {
        "code": "DE",
        "name": "Germany",
        "continent": "Europe",
        "cities": [
            {"name": "Berlin", "is_major": True, "latitude": 52.5200, "longitude": 13.4050},
            {"name": "Munich", "is_major": True, "latitude": 48.1351, "longitude": 11.5820},
            {"name": "Hamburg", "is_major": True, "latitude": 53.5511, "longitude": 9.9937},
        ]
    },
    {
        "code": "TH",
        "name": "Thailand",
        "continent": "Asia",
        "cities": [
            {"name": "Bangkok", "is_major": True, "latitude": 13.7563, "longitude": 100.5018},
            {"name": "Phuket", "is_major": True, "latitude": 7.8804, "longitude": 98.3923},
            {"name": "Chiang Mai", "is_major": True, "latitude": 18.7883, "longitude": 98.9853},
        ]
    },
    {
        "code": "AU",
        "name": "Australia",
        "continent": "Oceania",
        "cities": [
            {"name": "Sydney", "state": "NSW", "is_major": True, "latitude": -33.8688, "longitude": 151.2093},
            {"name": "Melbourne", "state": "VIC", "is_major": True, "latitude": -37.8136, "longitude": 144.9631},
            {"name": "Brisbane", "state": "QLD", "is_major": True, "latitude": -27.4698, "longitude": 153.0251},
        ]
    },
    {
        "code": "AE",
        "name": "United Arab Emirates",
        "continent": "Asia",
        "cities": [
            {"name": "Dubai", "is_major": True, "latitude": 25.2048, "longitude": 55.2708},
            {"name": "Abu Dhabi", "is_major": True, "latitude": 24.4539, "longitude": 54.3773},
        ]
    },
]


async def seed_countries_and_cities():
    """Seed countries and cities tables."""
    logger.info(f"Seeding {len(COUNTRIES_DATA)} countries with cities")
    
    for country_data in COUNTRIES_DATA:
        try:
            # Insert country
            country = {
                "code": country_data["code"],
                "name": country_data["name"],
                "continent": country_data.get("continent"),
            }
            
            logger.info(f"Inserting country: {country['name']}")
            
            # Use Supabase upsert to avoid duplicates
            result = db_service.supabase.table("countries").upsert(
                country,
                on_conflict="code"
            ).execute()
            
            # Insert cities for this country
            for city_data in country_data.get("cities", []):
                city = {
                    "name": city_data["name"],
                    "country_code": country_data["code"],
                    "state_province": city_data.get("state"),
                    "latitude": city_data.get("latitude"),
                    "longitude": city_data.get("longitude"),
                    "is_major_destination": city_data.get("is_major", False),
                }
                
                logger.info(f"  - Inserting city: {city['name']}")
                
                db_service.supabase.table("cities").upsert(
                    city,
                    on_conflict="name,country_code"
                ).execute()
            
            logger.info(f"✅ Completed country: {country['name']}")
            
        except Exception as e:
            logger.error(f"Failed to seed country {country_data['name']}", error=str(e))
            raise
    
    logger.info(f"✅ Successfully seeded {len(COUNTRIES_DATA)} countries")


if __name__ == "__main__":
    import asyncio
    asyncio.run(seed_countries_and_cities())
