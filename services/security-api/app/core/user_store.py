from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Protocol
from uuid import uuid4

from app.core.config import settings

try:
    from pymongo import MongoClient
except Exception:  # pragma: no cover
    MongoClient = None


class UserStore(Protocol):
    def create_user(self, email: str, password_hash: str) -> dict:
        ...

    def get_user_by_email(self, email: str) -> dict | None:
        ...

    def get_user_by_id(self, user_id: str) -> dict | None:
        ...

    def get_user_settings(self, user_id: str) -> dict:
        ...

    def upsert_user_settings(self, user_id: str, payload: dict) -> dict:
        ...


@dataclass
class InMemoryUserStore:
    users: dict[str, dict] = field(default_factory=dict)
    users_by_email: dict[str, str] = field(default_factory=dict)
    settings_by_user: dict[str, dict] = field(default_factory=dict)

    def create_user(self, email: str, password_hash: str) -> dict:
        normalized_email = email.strip().lower()
        if normalized_email in self.users_by_email:
            raise ValueError("Email already exists")

        user_id = str(uuid4())
        user = {
            "id": user_id,
            "email": normalized_email,
            "passwordHash": password_hash,
            "createdAt": datetime.now(timezone.utc).isoformat(),
        }
        self.users[user_id] = user
        self.users_by_email[normalized_email] = user_id
        return dict(user)

    def get_user_by_email(self, email: str) -> dict | None:
        user_id = self.users_by_email.get(email.strip().lower())
        return dict(self.users[user_id]) if user_id and user_id in self.users else None

    def get_user_by_id(self, user_id: str) -> dict | None:
        user = self.users.get(user_id)
        return dict(user) if user else None

    def get_user_settings(self, user_id: str) -> dict:
        if user_id not in self.settings_by_user:
            return {
                "guardrailEnabled": True,
                "enabledPlatformIds": [],
                "customDomains": [],
                "updatedAt": datetime.now(timezone.utc).isoformat(),
            }
        return dict(self.settings_by_user[user_id])

    def upsert_user_settings(self, user_id: str, payload: dict) -> dict:
        settings_obj = {
            "guardrailEnabled": bool(payload.get("guardrailEnabled", True)),
            "enabledPlatformIds": list(payload.get("enabledPlatformIds", [])),
            "customDomains": list(payload.get("customDomains", [])),
            "updatedAt": datetime.now(timezone.utc).isoformat(),
        }
        self.settings_by_user[user_id] = settings_obj
        return dict(settings_obj)


class MongoUserStore:
    def __init__(self, uri: str, db_name: str, users_collection: str, settings_collection: str) -> None:
        if MongoClient is None:
            raise RuntimeError("pymongo unavailable")
        self.client = MongoClient(uri, serverSelectionTimeoutMS=800)
        self.db = self.client[db_name]
        self.users = self.db[users_collection]
        self.user_settings = self.db[settings_collection]
        self.client.admin.command("ping")

    def create_user(self, email: str, password_hash: str) -> dict:
        normalized_email = email.strip().lower()
        if self.users.find_one({"email": normalized_email}):
            raise ValueError("Email already exists")

        user = {
            "id": str(uuid4()),
            "email": normalized_email,
            "passwordHash": password_hash,
            "createdAt": datetime.now(timezone.utc).isoformat(),
        }
        self.users.insert_one(dict(user))
        return user

    def get_user_by_email(self, email: str) -> dict | None:
        user = self.users.find_one({"email": email.strip().lower()}, {"_id": 0})
        return dict(user) if user else None

    def get_user_by_id(self, user_id: str) -> dict | None:
        user = self.users.find_one({"id": user_id}, {"_id": 0})
        return dict(user) if user else None

    def get_user_settings(self, user_id: str) -> dict:
        settings_obj = self.user_settings.find_one({"userId": user_id}, {"_id": 0, "userId": 0})
        if settings_obj:
            return dict(settings_obj)
        return {
            "guardrailEnabled": True,
            "enabledPlatformIds": [],
            "customDomains": [],
            "updatedAt": datetime.now(timezone.utc).isoformat(),
        }

    def upsert_user_settings(self, user_id: str, payload: dict) -> dict:
        settings_obj = {
            "userId": user_id,
            "guardrailEnabled": bool(payload.get("guardrailEnabled", True)),
            "enabledPlatformIds": list(payload.get("enabledPlatformIds", [])),
            "customDomains": list(payload.get("customDomains", [])),
            "updatedAt": datetime.now(timezone.utc).isoformat(),
        }
        self.user_settings.update_one({"userId": user_id}, {"$set": settings_obj}, upsert=True)
        return {k: v for k, v in settings_obj.items() if k != "userId"}


_user_store: UserStore | None = None


def _build_store() -> UserStore:
    try:
        return MongoUserStore(
            uri=settings.mongodb_uri,
            db_name=settings.mongodb_db_name,
            users_collection=settings.users_collection,
            settings_collection=settings.user_settings_collection,
        )
    except Exception:
        return InMemoryUserStore()


def get_user_store() -> UserStore:
    global _user_store
    if _user_store is None:
        _user_store = _build_store()
    return _user_store
