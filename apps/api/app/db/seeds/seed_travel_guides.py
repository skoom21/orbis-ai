"""
Seed script for travel guides data.

Seeds the travel_guides table with helpful travel information.
"""

from typing import List, Dict
from app.services.database import db_service
from app.logging_config import get_logger

logger = get_logger("database.seeds.travel_guides")


# Travel guide content for popular destinations
TRAVEL_GUIDES_DATA = [
    {
        "destination": "Paris, France",
        "country_code": "FR",
        "title": "Complete Guide to Paris",
        "content": """Paris, the City of Light, is one of the most visited cities in the world. 

**Best Time to Visit:** April to June and September to October offer pleasant weather and fewer crowds.

**Must-See Attractions:**
- Eiffel Tower: Book tickets online to skip lines
- Louvre Museum: Plan at least 3-4 hours, arrive early
- Notre-Dame Cathedral: Currently under restoration
- Arc de Triomphe: Climb for panoramic views
- Champs-Élysées: Shopping and dining

**Getting Around:**
- Metro: Efficient and covers all major areas
- Walking: Best way to explore neighborhoods
- Vélib: Bike sharing system

**Local Tips:**
- Learn basic French phrases
- Many museums are free on first Sunday of month
- Restaurants typically serve lunch 12-2pm, dinner 7-10pm
- Tipping: 5-10% is customary

**Budget:** €100-150 per day for mid-range travel""",
        "category": "city",
        "tags": ["europe", "romantic", "art", "culture", "food"]
    },
    {
        "destination": "Tokyo, Japan",
        "country_code": "JP",
        "title": "Tokyo Travel Guide",
        "content": """Tokyo seamlessly blends ancient tradition with cutting-edge modernity.

**Best Time to Visit:** March-April (cherry blossoms) or October-November (fall foliage)

**Must-See Districts:**
- Shibuya: Famous crossing and youth culture
- Harajuku: Fashion and Meiji Shrine
- Shinjuku: Entertainment and nightlife
- Asakusa: Traditional Tokyo, Senso-ji Temple
- Akihabara: Electronics and anime culture

**Transportation:**
- JR Pass: Worth it for multiple city visits
- Suica/Pasmo cards: Convenient for metro/trains
- Trains stop running around midnight

**Cultural Tips:**
- Bow when greeting
- Remove shoes when entering homes/some restaurants
- No tipping in Japan
- Keep voice down on trains
- Stand on left side of escalators

**Food:** Try ramen, sushi, tempura, and izakaya dining

**Budget:** ¥15,000-20,000 per day for mid-range travel""",
        "category": "city",
        "tags": ["asia", "culture", "food", "technology", "tradition"]
    },
    {
        "destination": "New York City, USA",
        "country_code": "US",
        "title": "New York City Guide",
        "content": """New York City, the city that never sleeps, offers endless experiences.

**Best Time to Visit:** April-June and September-early November

**Must-See Attractions:**
- Statue of Liberty & Ellis Island: Book ferry in advance
- Central Park: Explore on foot or bike
- Metropolitan Museum of Art: Largest art museum in US
- Times Square: Visit at night for full effect
- Brooklyn Bridge: Walk across for Manhattan views

**Neighborhoods to Explore:**
- Manhattan: Midtown, Upper East/West Side, SoHo
- Brooklyn: Williamsburg, DUMBO, Park Slope
- Queens: Flushing (food), Long Island City (art)

**Transportation:**
- Subway: 24/7 service, fastest way around
- Walking: Best in Manhattan
- Yellow cabs: Widely available
- MetroCard: Unlimited weekly pass recommended

**Tips:**
- Fast-paced city, walk with purpose
- Tipping: 15-20% at restaurants, $1-2 per drink
- Broadway shows: TKTS booth for discounts
- Free activities: High Line, Staten Island Ferry

**Budget:** $150-250 per day for mid-range travel""",
        "category": "city",
        "tags": ["north-america", "urban", "culture", "entertainment", "food"]
    },
    {
        "destination": "Rome, Italy",
        "country_code": "IT",
        "title": "Ancient Rome Travel Guide",
        "content": """Rome, the Eternal City, is a living museum of Western civilization.

**Best Time to Visit:** April-May and September-October

**Ancient Wonders:**
- Colosseum: Book skip-the-line tickets online
- Roman Forum: Get combined ticket with Colosseum
- Pantheon: Free entry, best preserved Roman building
- Vatican Museums: Reserve timed entry, dress modestly

**Must-See:**
- Trevi Fountain: Throw coin for return visit
- Spanish Steps: Great for people watching
- Piazza Navona: Beautiful baroque square
- Trastevere: Charming neighborhood with authentic trattorias

**Transportation:**
- Metro: Two main lines, limited coverage
- Walking: Best way to discover Rome
- Bus: Extensive network
- Roma Pass: 72 hours of transport + attractions

**Food Tips:**
- Carbonara, cacio e pepe, amatriciana are local specialties
- Aperitivo: Pre-dinner drinks with snacks
- Cover charge (coperto) is standard
- Restaurants close 3-5pm between meals

**Budget:** €80-120 per day for mid-range travel""",
        "category": "city",
        "tags": ["europe", "history", "art", "food", "culture"]
    },
    {
        "destination": "Bangkok, Thailand",
        "country_code": "TH",
        "title": "Bangkok Travel Essentials",
        "content": """Bangkok offers incredible temples, street food, and vibrant culture.

**Best Time to Visit:** November-February (cool and dry season)

**Top Attractions:**
- Grand Palace: Must-see, dress modestly
- Wat Pho: Reclining Buddha
- Wat Arun: Temple of Dawn
- Chatuchak Weekend Market: Massive shopping experience
- Floating Markets: Best visited early morning

**Getting Around:**
- BTS Skytrain & MRT: Efficient, air-conditioned
- Taxis: Use meter, avoid tourist areas
- Tuk-tuks: Fun but negotiate price first
- River boats: Scenic transport along Chao Phraya

**Street Food:**
- Pad Thai: Stir-fried noodles
- Som Tam: Spicy papaya salad
- Mango Sticky Rice: Popular dessert
- Street food is safe and delicious

**Tips:**
- Respect royal family and Buddhism
- Remove shoes before entering temples
- Dress modestly at religious sites
- Stay hydrated in the heat
- Bargaining expected at markets

**Budget:** ฿1,500-2,500 per day for mid-range travel""",
        "category": "city",
        "tags": ["asia", "culture", "food", "temples", "budget"]
    },
    {
        "destination": "Dubai, UAE",
        "country_code": "AE",
        "title": "Dubai Luxury & Adventure Guide",
        "content": """Dubai combines futuristic luxury with desert adventures.

**Best Time to Visit:** November-March (pleasant weather)

**Must-See:**
- Burj Khalifa: Book tickets for 124th floor
- Dubai Mall: Shopping, aquarium, ice rink
- Dubai Fountain: Free water show (evening)
- Palm Jumeirah: Man-made island
- Desert Safari: Dune bashing and BBQ dinner

**Experiences:**
- Gold & Spice Souks: Traditional markets
- Dubai Marina: Waterfront promenade
- Ski Dubai: Indoor skiing in the desert
- Dubai Frame: City views and history

**Transportation:**
- Metro: Modern, connects major areas
- Taxis: Affordable and air-conditioned
- RTA buses: Extensive network
- Rental cars: Good roads, parking available

**Important:**
- Dress modestly in public areas
- No public displays of affection
- Alcohol only in licensed venues
- Friday is holy day (shops open afternoon)
- No photography of people without permission

**Budget:** AED 500-800 per day for mid-range travel""",
        "category": "city",
        "tags": ["middle-east", "luxury", "modern", "desert", "shopping"]
    },
]


async def seed_travel_guides():
    """Seed travel guides table."""
    logger.info(f"Seeding {len(TRAVEL_GUIDES_DATA)} travel guides")
    
    for guide in TRAVEL_GUIDES_DATA:
        try:
            logger.info(f"Inserting travel guide: {guide['title']}")
            
            # Use Supabase upsert to avoid duplicates
            db_service.supabase.table("travel_guides").upsert(
                guide,
                on_conflict="destination,country_code"
            ).execute()
            
        except Exception as e:
            logger.error(f"Failed to seed travel guide {guide['title']}", error=str(e))
            raise
    
    logger.info(f"✅ Successfully seeded {len(TRAVEL_GUIDES_DATA)} travel guides")


if __name__ == "__main__":
    import asyncio
    asyncio.run(seed_travel_guides())
