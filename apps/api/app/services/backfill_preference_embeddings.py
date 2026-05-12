"""
Backfill preference embeddings for existing users.

Finds all user_preferences rows with NULL preference_embedding and generates
embeddings for them using the GeminiService, then writes them back to Supabase.

Usage:
    cd apps/api
    python -m app.services.backfill_preference_embeddings
"""

import asyncio
import json
from app.services.database import db_service
from app.services.gemini import GeminiService


def _build_preference_summary(prefs: dict) -> str:
    """Mirror the logic in users.py so summaries are consistent."""
    parts = []
    if prefs.get("travel_style"):
        parts.append(f"Travel style: {', '.join(prefs['travel_style'])}")
    if prefs.get("travel_pace"):
        parts.append(f"Pace: {prefs['travel_pace']}")
    if prefs.get("interests"):
        parts.append(f"Interests: {', '.join(prefs['interests'])}")
    if prefs.get("accommodation_preference"):
        parts.append(f"Accommodation: {prefs['accommodation_preference']}")
    if prefs.get("dietary_preferences"):
        parts.append(f"Diet: {', '.join(prefs['dietary_preferences'])}")
    if prefs.get("preferred_destinations"):
        parts.append(f"Favourite destinations: {', '.join(prefs['preferred_destinations'])}")
    if prefs.get("avoided_destinations"):
        parts.append(f"Avoided destinations: {', '.join(prefs['avoided_destinations'])}")
    if prefs.get("preference_text"):
        parts.append(prefs["preference_text"])
    return ". ".join(parts) if parts else "General traveller with no specific preferences."


async def backfill():
    if not db_service.supabase:
        print("ERROR: Supabase not connected — check .env credentials")
        return

    gemini = GeminiService()

    # Fetch rows missing an embedding
    result = db_service.supabase.table("user_preferences") \
        .select("*") \
        .is_("preference_embedding", "null") \
        .execute()

    rows = result.data or []
    if not rows:
        print("✅ All user_preferences rows already have embeddings. Nothing to do.")
        return

    print(f"Found {len(rows)} rows missing embeddings. Generating...")

    updated = 0
    failed = 0
    for row in rows:
        uid = row.get("user_id", "?")
        # Use stored preference_text if present, else build one from fields
        summary = row.get("preference_text") or _build_preference_summary(row)

        embedding = await gemini.get_embedding(summary)
        if embedding:
            db_service.supabase.table("user_preferences") \
                .update({"preference_embedding": embedding, "preference_text": summary}) \
                .eq("user_id", uid) \
                .execute()
            print(f"  ✓ Embedded user {uid[:8]}...")
            updated += 1
        else:
            print(f"  ✗ Failed    user {uid[:8]}...")
            failed += 1

    print(f"\nDone. {updated} embedded, {failed} failed out of {len(rows)} rows.")


if __name__ == "__main__":
    asyncio.run(backfill())
