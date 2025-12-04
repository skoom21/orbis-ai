"""
Seed script runner for Orbis AI database.

This module provides utilities to run all seed scripts in the correct order.
"""

import asyncio
from typing import List, Callable
from app.logging_config import get_logger

logger = get_logger("database.seeds")


class SeedRunner:
    """Manages the execution of database seed scripts."""
    
    def __init__(self):
        self.seeds: List[tuple[str, Callable]] = []
    
    def register(self, name: str, seed_func: Callable):
        """Register a seed function."""
        self.seeds.append((name, seed_func))
    
    async def run_all(self):
        """Run all registered seed scripts."""
        logger.info(f"Starting seed process with {len(self.seeds)} scripts")
        
        for name, seed_func in self.seeds:
            try:
                logger.info(f"Running seed: {name}")
                if asyncio.iscoroutinefunction(seed_func):
                    await seed_func()
                else:
                    seed_func()
                logger.info(f"✅ Completed seed: {name}")
            except Exception as e:
                logger.error(f"❌ Failed seed: {name}", error=str(e))
                raise
        
        logger.info("✅ All seeds completed successfully")


# Global seed runner instance
seed_runner = SeedRunner()


async def run_seeds():
    """Main entry point to run all seeds."""
    from app.db.seeds import seed_countries
    from app.db.seeds import seed_airports
    from app.db.seeds import seed_attractions
    from app.db.seeds import seed_travel_guides
    
    # Register seeds in order of dependencies
    seed_runner.register("countries_and_cities", seed_countries.seed_countries_and_cities)
    seed_runner.register("airports", seed_airports.seed_airports)
    seed_runner.register("attractions", seed_attractions.seed_attractions)
    seed_runner.register("travel_guides", seed_travel_guides.seed_travel_guides)
    
    # Run all seeds
    await seed_runner.run_all()


if __name__ == "__main__":
    # Run seeds from command line
    asyncio.run(run_seeds())
