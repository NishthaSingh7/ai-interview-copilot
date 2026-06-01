from datetime import datetime, timedelta, timezone
from typing import Any

from bson import ObjectId

from config.settings import MAX_INTERVIEWS_PER_USER_PER_DAY
from db.mongodb import get_db


def _usage_date_utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _next_reset_utc() -> datetime:
    now = datetime.now(timezone.utc)
    tomorrow = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    return tomorrow


def _limit_message_used_today() -> str:
    reset = _next_reset_utc()
    reset_str = reset.strftime("%b %d, %Y at 12:00 AM UTC")
    return (
        "You've already used your free mock interview for today. "
        f"Your daily limit refreshes on {reset_str} — come back tomorrow to practice again."
    )


async def get_today_usage(user_id: str) -> dict[str, Any] | None:
    db = get_db()
    usage_date = _usage_date_utc()
    return await db.interview_usage.find_one(
        {"user_id": ObjectId(user_id), "usage_date": usage_date}
    )


async def can_start_interview(user_id: str) -> tuple[bool, str]:
    usage = await get_today_usage(user_id)
    if usage and MAX_INTERVIEWS_PER_USER_PER_DAY <= 1:
        return False, _limit_message_used_today()
    if usage:
        count = await _count_today_starts(user_id)
        if count >= MAX_INTERVIEWS_PER_USER_PER_DAY:
            return (
                False,
                f"Daily limit reached ({MAX_INTERVIEWS_PER_USER_PER_DAY} interview(s) per day).",
            )
    return True, ""


async def _count_today_starts(user_id: str) -> int:
    db = get_db()
    return await db.interview_usage.count_documents(
        {"user_id": ObjectId(user_id), "usage_date": _usage_date_utc()}
    )


async def record_interview_start(
    user_id: str,
    mode: str,
    session_id: str | None = None,
) -> None:
    db = get_db()
    now = datetime.now(timezone.utc)
    await db.interview_usage.insert_one(
        {
            "user_id": ObjectId(user_id),
            "usage_date": _usage_date_utc(),
            "started_at": now,
            "mode": mode,
            "session_id": session_id,
        }
    )


async def get_usage_status(user_id: str) -> dict[str, Any]:
    usage = await get_today_usage(user_id)
    used = usage is not None
    allowed, message = await can_start_interview(user_id)
    reset_at = _next_reset_utc()
    return {
        "usage_date": _usage_date_utc(),
        "interviews_used_today": 1 if used else 0,
        "interviews_allowed_per_day": MAX_INTERVIEWS_PER_USER_PER_DAY,
        "can_start_interview": allowed,
        "limit_message": message if not allowed else None,
        "next_reset_note": "Daily limit resets at midnight UTC",
        "resets_at_utc": reset_at.isoformat(),
        "resets_at_display": reset_at.strftime("%b %d, %Y · 12:00 AM UTC"),
    }
