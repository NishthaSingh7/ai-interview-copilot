"""
Dev-only: mark or clear today's interview usage for testing daily-limit UI.

Usage:
  cd backend && source venv/bin/activate
  python scripts/seed_interview_usage.py user@example.com
  python scripts/seed_interview_usage.py user@example.com --clear
"""

import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from bson import ObjectId

from db.mongodb import close_db, get_db, init_db
from services.usage_limits import _usage_date_utc, record_interview_start


async def clear_seed(email: str) -> None:
    await init_db()
    db = get_db()
    normalized = email.lower().strip()
    user = await db.users.find_one({"email": normalized})
    if not user:
        print(f"No user found with email: {normalized}")
        await close_db()
        return

    user_id = user["_id"]
    usage_date = _usage_date_utc()
    result = await db.interview_usage.delete_many(
        {
            "user_id": ObjectId(user_id),
            "usage_date": usage_date,
            "session_id": "seed-test-session",
        }
    )
    print(f"Removed {result.deleted_count} seed record(s) for {normalized} on {usage_date}")
    await close_db()


async def seed(email: str) -> None:
    await init_db()
    db = get_db()
    normalized = email.lower().strip()
    user = await db.users.find_one({"email": normalized})
    if not user:
        print(f"No user found with email: {normalized}")
        await close_db()
        return

    user_id = user["_id"]
    usage_date = _usage_date_utc()
    existing = await db.interview_usage.find_one(
        {"user_id": ObjectId(user_id), "usage_date": usage_date}
    )
    if existing:
        print(f"Already has interview_usage for {usage_date}: {normalized}")
        await close_db()
        return

    await record_interview_start(str(user_id), "quick", "seed-test-session")
    print(f"Seeded interview_usage for {normalized} on {usage_date}")
    await close_db()


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a != "--clear"]
    do_clear = "--clear" in sys.argv
    target = args[0] if args else "riyansh@gmail.com"
    if do_clear:
        asyncio.run(clear_seed(target))
    else:
        asyncio.run(seed(target))
