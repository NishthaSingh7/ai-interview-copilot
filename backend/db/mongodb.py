import certifi
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from config.settings import MONGODB_DB_NAME, MONGODB_URI

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


async def init_db() -> None:
    global _client, _db
    if not MONGODB_URI:
        raise RuntimeError("MONGODB_URI is not configured")
    _client = AsyncIOMotorClient(MONGODB_URI, tlsCAFile=certifi.where())
    _db = _client[MONGODB_DB_NAME]
    await _db.command("ping")
    await _ensure_indexes()


async def close_db() -> None:
    global _client, _db
    if _client:
        _client.close()
    _client = None
    _db = None


def get_db() -> AsyncIOMotorDatabase:
    if _db is None:
        raise RuntimeError("Database not initialized")
    return _db


async def _ensure_indexes() -> None:
    db = get_db()
    await db.users.create_index("email", unique=True)
    await db.otp_codes.create_index([("email", 1), ("purpose", 1)])
    await db.otp_codes.create_index("expires_at", expireAfterSeconds=0)
    await db.interview_usage.create_index(
        [("user_id", 1), ("usage_date", 1)],
        unique=True,
    )
    await db.app_usage.create_index("usage_date", unique=True)
