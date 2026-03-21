from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from typing import Protocol

from app.core.config import settings

try:
    from pymongo import MongoClient
except Exception:  # pragma: no cover
    MongoClient = None


class SiteSignalStore(Protocol):
    def save_signal(self, signal: dict) -> None:
        ...

    def list_signals(self, limit: int) -> list[dict]:
        ...

    def aggregate_failures_by_site(self, limit: int) -> list[dict]:
        ...


@dataclass
class InMemorySiteSignalStore:
    items: list[dict] = field(default_factory=list)

    def save_signal(self, signal: dict) -> None:
        self.items.insert(0, dict(signal))

    def list_signals(self, limit: int) -> list[dict]:
        return self.items[: max(limit, 0)]

    def aggregate_failures_by_site(self, limit: int) -> list[dict]:
        grouped: dict[str, dict] = defaultdict(lambda: {"count": 0, "events": defaultdict(int), "lastSeenAt": ""})
        for item in self.items:
            host = str(item.get("hostname", "unknown"))
            grouped[host]["count"] += 1
            grouped[host]["events"][str(item.get("eventType", "UNKNOWN"))] += 1
            grouped[host]["lastSeenAt"] = max(grouped[host]["lastSeenAt"], str(item.get("createdAt", "")))

        rows = [
            {
                "hostname": host,
                "count": data["count"],
                "events": dict(data["events"]),
                "lastSeenAt": data["lastSeenAt"],
            }
            for host, data in grouped.items()
        ]
        rows.sort(key=lambda x: x["count"], reverse=True)
        return rows[: max(limit, 0)]


class MongoSiteSignalStore:
    def __init__(self, uri: str, db_name: str, collection_name: str) -> None:
        if MongoClient is None:
            raise RuntimeError("pymongo unavailable")
        self.client = MongoClient(uri, serverSelectionTimeoutMS=800)
        self.collection = self.client[db_name][collection_name]
        self.client.admin.command("ping")

    def save_signal(self, signal: dict) -> None:
        self.collection.insert_one(dict(signal))

    def list_signals(self, limit: int) -> list[dict]:
        cursor = self.collection.find({}, {"_id": 0}).sort("createdAt", -1).limit(max(limit, 0))
        return list(cursor)

    def aggregate_failures_by_site(self, limit: int) -> list[dict]:
        pipeline = [
            {
                "$group": {
                    "_id": "$hostname",
                    "count": {"$sum": 1},
                    "lastSeenAt": {"$max": "$createdAt"},
                    "eventsArr": {"$push": "$eventType"},
                }
            },
            {"$sort": {"count": -1}},
            {"$limit": max(limit, 0)},
        ]
        rows = []
        for row in self.collection.aggregate(pipeline):
            events_counter: dict[str, int] = {}
            for event in row.get("eventsArr", []):
                k = str(event)
                events_counter[k] = events_counter.get(k, 0) + 1
            rows.append(
                {
                    "hostname": row.get("_id", "unknown"),
                    "count": row.get("count", 0),
                    "events": events_counter,
                    "lastSeenAt": row.get("lastSeenAt", ""),
                }
            )
        return rows


_site_signal_store: SiteSignalStore | None = None


def _build_store() -> SiteSignalStore:
    try:
        return MongoSiteSignalStore(
            uri=settings.mongodb_uri,
            db_name=settings.mongodb_db_name,
            collection_name=settings.site_signals_collection,
        )
    except Exception:
        return InMemorySiteSignalStore()


def get_site_signal_store() -> SiteSignalStore:
    global _site_signal_store
    if _site_signal_store is None:
        _site_signal_store = _build_store()
    return _site_signal_store
