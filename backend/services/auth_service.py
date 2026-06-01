from datetime import datetime, timezone
from typing import Any

import bcrypt
from bson import ObjectId
from jose import JWTError, jwt

from config.settings import JWT_ALGORITHM, JWT_EXPIRE_MINUTES, JWT_SECRET
from db.mongodb import get_db


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str) -> str:
    expire_minutes = JWT_EXPIRE_MINUTES
    from datetime import timedelta

    exp = datetime.now(timezone.utc) + timedelta(minutes=expire_minutes)
    payload = {"sub": user_id, "exp": exp}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_access_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        sub = payload.get("sub")
        return str(sub) if sub else None
    except JWTError:
        return None


def _user_doc_to_public(doc: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(doc["_id"]),
        "email": doc["email"],
        "name": doc.get("name"),
        "email_verified": bool(doc.get("email_verified")),
        "created_at": doc.get("created_at"),
    }


async def get_user_by_id(user_id: str) -> dict[str, Any] | None:
    db = get_db()
    try:
        oid = ObjectId(user_id)
    except Exception:
        return None
    doc = await db.users.find_one({"_id": oid})
    if not doc:
        return None
    return _user_doc_to_public(doc)


async def get_user_by_email(email: str) -> dict[str, Any] | None:
    db = get_db()
    doc = await db.users.find_one({"email": email.lower().strip()})
    if not doc:
        return None
    return doc


async def create_user(email: str, password: str, name: str | None = None) -> dict[str, Any]:
    db = get_db()
    normalized = email.lower().strip()
    existing = await db.users.find_one({"email": normalized})
    if existing:
        raise ValueError("EMAIL_EXISTS")

    now = datetime.now(timezone.utc)
    doc = {
        "email": normalized,
        "password_hash": hash_password(password),
        "email_verified": False,
        "name": name,
        "created_at": now,
        "verified_at": None,
    }
    result = await db.users.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


async def mark_email_verified(email: str) -> dict[str, Any] | None:
    db = get_db()
    now = datetime.now(timezone.utc)
    result = await db.users.find_one_and_update(
        {"email": email.lower().strip()},
        {"$set": {"email_verified": True, "verified_at": now}},
        return_document=True,
    )
    return result


async def authenticate_user(email: str, password: str) -> dict[str, Any] | None:
    doc = await get_user_by_email(email)
    if not doc:
        return None
    if not verify_password(password, doc["password_hash"]):
        return None
    return _user_doc_to_public(doc)
