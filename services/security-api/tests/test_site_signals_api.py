from fastapi.testclient import TestClient

from app.api import routes_site_signals
from app.main import app


class StubSignalStore:
    def __init__(self) -> None:
        self.items: list[dict] = []

    def save_signal(self, signal: dict) -> None:
        self.items.insert(0, dict(signal))

    def list_signals(self, limit: int) -> list[dict]:
        return self.items[: max(limit, 0)]

    def aggregate_failures_by_site(self, limit: int) -> list[dict]:
        grouped = {}
        for item in self.items:
            host = item.get("hostname", "unknown")
            grouped.setdefault(host, {"hostname": host, "count": 0, "events": {}, "lastSeenAt": ""})
            grouped[host]["count"] += 1
            event = item.get("eventType", "UNKNOWN")
            grouped[host]["events"][event] = grouped[host]["events"].get(event, 0) + 1
            grouped[host]["lastSeenAt"] = max(grouped[host]["lastSeenAt"], item.get("createdAt", ""))
        rows = sorted(grouped.values(), key=lambda x: x["count"], reverse=True)
        return rows[: max(limit, 0)]


def test_site_signal_ingest_and_summary(monkeypatch) -> None:
    store = StubSignalStore()
    monkeypatch.setattr(routes_site_signals, "get_site_signal_store", lambda: store)
    client = TestClient(app)

    payload = {
        "eventType": "PROMPT_ELEMENT_NOT_FOUND",
        "hostname": "facebook.com",
        "pageUrl": "https://facebook.com/messages",
        "platformId": "custom:facebook.com",
        "details": "No editable prompt node found",
    }
    response = client.post("/v1/site-signals", json=payload)
    assert response.status_code == 200
    assert response.json()["ok"] is True

    recent = client.get("/v1/site-signals/recent")
    assert recent.status_code == 200
    assert recent.json()["total"] == 1

    summary = client.get("/v1/site-signals/summary")
    assert summary.status_code == 200
    body = summary.json()
    assert body["total"] == 1
    assert body["items"][0]["hostname"] == "facebook.com"
    assert body["items"][0]["events"]["PROMPT_ELEMENT_NOT_FOUND"] == 1
