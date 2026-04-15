from __future__ import annotations

import threading
from dataclasses import dataclass, field
from typing import Protocol

from app.core.config import settings
from app.stores.vector_store import maybe_index_incident_from_payload

try:
    from pymongo import MongoClient
except Exception:  # pragma: no cover - optional dependency at runtime
    MongoClient = None


class IncidentStore(Protocol):
    def save_incident(self, incident: dict) -> None:
        ...

    def list_incidents(self, limit: int, offset: int = 0) -> list[dict]:
        ...


@dataclass
class InMemoryIncidentStore:
    """
    In-memory fallback store used when MongoDB is unavailable.
    Thread-safe: a reentrant lock guards all mutations and reads.
    """

    items: list[dict] = field(default_factory=list)
    _lock: threading.RLock = field(default_factory=threading.RLock, repr=False, compare=False)

    def save_incident(self, incident: dict) -> None:
        document = dict(incident)
        vector_text = document.pop("vectorSourceText", None)
        with self._lock:
            self.items.insert(0, document)
        try:
            maybe_index_incident_from_payload(vector_text, document)
        except Exception:
            pass

    def list_incidents(self, limit: int, offset: int = 0) -> list[dict]:
        with self._lock:
            start = max(offset, 0)
            end = start + max(limit, 0)
            return self.items[start:end]


class MongoIncidentStore:
    def __init__(self, uri: str, db_name: str, collection_name: str) -> None:
        if MongoClient is None:
            raise RuntimeError("pymongo is not available in this environment.")
        self.client = MongoClient(uri, serverSelectionTimeoutMS=800)
        self.collection = self.client[db_name][collection_name]
        self.client.admin.command("ping")

    def save_incident(self, incident: dict) -> None:
        document = dict(incident)
        vector_text = document.pop("vectorSourceText", None)
        self.collection.insert_one(document)
        try:
            maybe_index_incident_from_payload(vector_text, document)
        except Exception:
            pass

    def list_incidents(self, limit: int, offset: int = 0) -> list[dict]:
        cursor = (
            self.collection.find({}, {"_id": 0})
            .sort("createdAt", -1)
            .skip(max(offset, 0))
            .limit(max(limit, 0))
        )
        return list(cursor)


_incident_store: IncidentStore | None = None


def _build_store() -> IncidentStore:
    try:
        return MongoIncidentStore(
            uri=settings.mongodb_uri,
            db_name=settings.mongodb_db_name,
            collection_name=settings.mongodb_incidents_collection,
        )
    except Exception:
        # Fail-open behavior for V1 local development.
        return InMemoryIncidentStore()


def get_incident_store() -> IncidentStore:
    global _incident_store
    if _incident_store is None:
        _incident_store = _build_store()
    return _incident_store
