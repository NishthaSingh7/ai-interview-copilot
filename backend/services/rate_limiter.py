"""In-memory rate limits to protect free-tier Gemini quota on public deploys."""

import time
from threading import Lock

from config.settings import RATE_LIMIT_ENABLED, RATE_LIMIT_WINDOW_SECONDS

_lock = Lock()
_last_interview_start: dict[str, float] = {}


def get_client_id(ip: str | None, client_token: str | None = None) -> str:
    """Prefer stable client token from frontend; fall back to IP."""
    if client_token and len(client_token) >= 8:
        return f"token:{client_token[:64]}"
    return f"ip:{ip or 'unknown'}"


def check_interview_start(client_id: str) -> tuple[bool, int]:
    """
    Returns (allowed, retry_after_seconds).
    One new interview per window per client.
    """
    if not RATE_LIMIT_ENABLED:
        return True, 0

    now = time.time()
    with _lock:
        last = _last_interview_start.get(client_id)
        if last is None:
            return True, 0

        elapsed = now - last
        if elapsed >= RATE_LIMIT_WINDOW_SECONDS:
            return True, 0

        retry_after = int(RATE_LIMIT_WINDOW_SECONDS - elapsed) + 1
        return False, retry_after


def record_interview_start(client_id: str) -> None:
    if not RATE_LIMIT_ENABLED:
        return
    with _lock:
        _last_interview_start[client_id] = time.time()


def get_status(client_id: str) -> dict:
    """For GET /rate-limit-status — show users when they can retry."""
    allowed, retry_after = check_interview_start(client_id)
    return {
        "allowed": allowed,
        "retry_after_seconds": retry_after,
        "window_minutes": RATE_LIMIT_WINDOW_SECONDS // 60,
        "enabled": RATE_LIMIT_ENABLED,
    }
