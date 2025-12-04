# Database Seeds

This directory contains seed scripts to populate the Orbis AI database with reference data.

## 📋 Available Seeds

### 1. Countries & Cities
**File:** `seed_countries.py`  
**Tables:** `countries`, `cities`  
**Records:** 10 countries, 35+ major cities

Seeds popular travel destinations including:
- United States (New York, LA, Chicago, San Francisco, Miami)
- France (Paris, Nice, Lyon, Marseille)
- Italy (Rome, Venice, Florence, Milan)
- Japan (Tokyo, Kyoto, Osaka, Hiroshima)
- United Kingdom (London, Edinburgh, Manchester)
- Spain (Barcelona, Madrid, Seville)
- Germany (Berlin, Munich, Hamburg)
- Thailand (Bangkok, Phuket, Chiang Mai)
- Australia (Sydney, Melbourne, Brisbane)
- UAE (Dubai, Abu Dhabi)

### 2. Airports
**File:** `seed_airports.py`  
**Table:** `airports`  
**Records:** 23 major international airports

Includes IATA codes, coordinates, and airport names for:
- North America: JFK, LAX, ORD, SFO, MIA, YYZ, YVR
- Europe: LHR, CDG, FCO, MAD, FRA, AMS
- Asia: NRT, HND, BKK, SIN, HKG, DXB
- Australia: SYD, MEL
- Middle East: DOH
- South America: GRU

### 3. Attractions
**File:** `seed_attractions.py`  
**Table:** `attractions`  
**Records:** 23 popular tourist attractions

Categories:
- **Landmarks:** Eiffel Tower, Colosseum, Big Ben, Statue of Liberty, Burj Khalifa
- **Museums:** Louvre, Vatican Museums, British Museum
- **Religious:** Notre-Dame, Senso-ji Temple, Sagrada Familia
- **Nature:** Central Park, Park Güell
- **Shopping:** Dubai Mall

### 4. Travel Guides
**File:** `seed_travel_guides.py`  
**Table:** `travel_guides`  
**Records:** 6 comprehensive city guides

Destinations:
- Paris, France
- Tokyo, Japan
- New York City, USA
- Rome, Italy
- Bangkok, Thailand
- Dubai, UAE

Each guide includes:
- Best time to visit
- Must-see attractions
- Transportation tips
- Local customs
- Food recommendations
- Budget estimates

## 🚀 Running Seeds

### Run All Seeds
```bash
cd /home/skoom/University/FYP/orbis-ai/apps/api
python -m app.db.seeds
```

### Run Individual Seeds
```bash
# Countries and cities
python -m app.db.seeds.seed_countries

# Airports
python -m app.db.seeds.seed_airports

# Attractions
python -m app.db.seeds.seed_attractions

# Travel guides
python -m app.db.seeds.seed_travel_guides
```

## 📝 Seed Execution Order

Seeds are run in dependency order:
1. **Countries & Cities** (base reference data)
2. **Airports** (depends on countries/cities)
3. **Attractions** (depends on countries/cities)
4. **Travel Guides** (depends on countries)

## ⚙️ How Seeds Work

- **Upsert Logic:** Seeds use Supabase `upsert()` to avoid duplicates
- **Idempotent:** Safe to run multiple times
- **Logging:** Comprehensive logging for each record
- **Error Handling:** Fails fast with clear error messages

## 🔧 Adding New Seeds

1. Create new seed file: `seed_[name].py`
2. Import database service:
   ```python
   from app.services.database import db_service
   from app.logging_config import get_logger
   
   logger = get_logger("database.seeds.[name]")
   ```
3. Define data structure
4. Create async seed function
5. Register in `__init__.py`:
   ```python
   from app.db.seeds import seed_[name]
   seed_runner.register("[name]", seed_[name].seed_[name])
   ```

## 📊 Seed Data Sources

- **Countries/Cities:** Based on popular travel destinations
- **Airports:** Major international airports from IATA
- **Attractions:** UNESCO World Heritage sites and iconic landmarks
- **Travel Guides:** Curated travel information from expert sources

## 🔒 Production Considerations

- Run seeds after initial database setup
- Review and customize data for your needs
- Some seeds may need updating (e.g., airport codes change)
- Consider backing up before running seeds in production

## 📈 Future Seeds

Planned seed scripts:
- [ ] Hotels (major chains and properties)
- [ ] Airlines (carriers and fleet information)
- [ ] Currency exchange rates
- [ ] Travel visa requirements
- [ ] Weather patterns by destination
- [ ] Local transportation options
- [ ] Restaurant recommendations
- [ ] Sample user preferences for testing

## 🐛 Troubleshooting

### Connection Errors
```bash
# Check Supabase credentials in .env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
```

### Duplicate Key Errors
- Seeds use upsert with conflict resolution
- Check unique constraints in database schema
- Verify on_conflict parameter matches table constraints

### Import Errors
```bash
# Ensure you're in the correct directory
cd /home/skoom/University/FYP/orbis-ai/apps/api

# Check Python path
export PYTHONPATH="${PYTHONPATH}:/home/skoom/University/FYP/orbis-ai/apps/api"
```

## 📚 Related Documentation

- [Database Schema](../../../../db_schema.sql)
- [Alembic Migrations](../migrations/)
- [Database Connection](../connection.py)
- [Backend TODO](../../../../claude-docs/BACKEND_TODO.md)

---

**Last Updated:** 2025-12-05  
**Seed Records:** ~80 total records across 4 seed types  
**Maintenance:** Review quarterly for updates
