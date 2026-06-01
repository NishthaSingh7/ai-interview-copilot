from datetime import datetime, timezone

from config.settings import DEMO_MODE, GLOBAL_GEMINI_DAILY_CAP
from db.mongodb import get_db


def _usage_date_utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


async def get_gemini_calls_today() -> int:
    if DEMO_MODE:
        return 0
    db = get_db()
    doc = await db.app_usage.find_one({"usage_date": _usage_date_utc()})
    return int(doc.get("gemini_calls", 0)) if doc else 0


async def can_use_gemini() -> bool:
    if DEMO_MODE:
        return False
    calls = await get_gemini_calls_today()
    return calls < GLOBAL_GEMINI_DAILY_CAP


async def record_gemini_call() -> int:
    """Increment daily counter; returns new total."""
    if DEMO_MODE:
        return 0
    db = get_db()
    usage_date = _usage_date_utc()
    result = await db.app_usage.find_one_and_update(
        {"usage_date": usage_date},
        {
            "$inc": {"gemini_calls": 1},
            "$setOnInsert": {"usage_date": usage_date},
        },
        upsert=True,
        return_document=True,
    )
    return int(result.get("gemini_calls", 1)) if result else 1


async def gemini_budget_status() -> dict:
    calls = await get_gemini_calls_today()
    return {
        "usage_date": _usage_date_utc(),
        "gemini_calls_today": calls,
        "daily_cap": GLOBAL_GEMINI_DAILY_CAP,
        "budget_remaining": max(0, GLOBAL_GEMINI_DAILY_CAP - calls),
        "gemini_available": calls < GLOBAL_GEMINI_DAILY_CAP and not DEMO_MODE,
    }
