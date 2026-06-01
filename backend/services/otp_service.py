import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from config.settings import OTP_EXPIRE_MINUTES, OTP_MAX_VERIFY_ATTEMPTS
from db.mongodb import get_db


def _hash_otp(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


def generate_otp_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


async def store_otp(email: str, code: str, purpose: str = "email_verify") -> None:
    db = get_db()
    normalized = email.lower().strip()
    expires = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRE_MINUTES)
    await db.otp_codes.delete_many({"email": normalized, "purpose": purpose})
    await db.otp_codes.insert_one(
        {
            "email": normalized,
            "code_hash": _hash_otp(code),
            "purpose": purpose,
            "expires_at": expires,
            "attempts": 0,
            "created_at": datetime.now(timezone.utc),
        }
    )


async def verify_otp(email: str, code: str, purpose: str = "email_verify") -> tuple[bool, str]:
    db = get_db()
    normalized = email.lower().strip()
    doc = await db.otp_codes.find_one(
        {"email": normalized, "purpose": purpose},
        sort=[("created_at", -1)],
    )
    if not doc:
        return False, "No verification code found. Request a new one."

    if doc.get("attempts", 0) >= OTP_MAX_VERIFY_ATTEMPTS:
        return False, "Too many attempts. Request a new code."

    expires = doc.get("expires_at")
    if expires:
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires < datetime.now(timezone.utc):
            return False, "Code expired. Request a new one."

    await db.otp_codes.update_one(
        {"_id": doc["_id"]},
        {"$inc": {"attempts": 1}},
    )

    if _hash_otp(code.strip()) != doc.get("code_hash"):
        return False, "Invalid code. Try again."

    await db.otp_codes.delete_many({"email": normalized, "purpose": purpose})
    return True, "OK"


async def count_recent_otp_sends(email: str, hours: int = 1) -> int:
    db = get_db()
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    normalized = email.lower().strip()
    return await db.otp_codes.count_documents(
        {"email": normalized, "created_at": {"$gte": since}}
    )
