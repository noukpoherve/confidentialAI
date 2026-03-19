from fastapi.testclient import TestClient

from app.api import routes_analyze
from app.main import app


class StubStore:
    def __init__(self) -> None:
        self.items: list[dict] = []

    def save_incident(self, incident: dict) -> None:
        self.items.insert(0, dict(incident))

    def list_incidents(self, limit: int) -> list[dict]:
        return self.items[: max(limit, 0)]


class FailingStore:
    def save_incident(self, incident: dict) -> None:
        raise RuntimeError("store unavailable")

    def list_incidents(self, limit: int) -> list[dict]:
        return []


def _sample_payload() -> dict:
    return {
        "requestId": "req-api-test-1",
        "platform": "chatgpt",
        "prompt": "Contact me at alice@example.com",
        "userConsent": False,
        "metadata": {"pageUrl": "https://chatgpt.com", "tenantId": "tenant-a"},
    }


def test_analyze_persists_incident_and_lists_it(monkeypatch) -> None:
    store = StubStore()
    monkeypatch.setattr(routes_analyze, "get_incident_store", lambda: store)
    client = TestClient(app)

    response = client.post("/v1/analyze", json=_sample_payload())
    assert response.status_code == 200
    body = response.json()
    assert body["action"] in {"ANONYMIZE", "WARN", "BLOCK", "ALLOW"}

    listed = client.get("/v1/incidents")
    assert listed.status_code == 200
    list_body = listed.json()
    assert list_body["total"] == 1
    assert len(list_body["items"]) == 1
    item = list_body["items"][0]
    assert item["requestId"] == "req-api-test-1"
    assert item["tenantId"] == "tenant-a"
    assert "promptPreview" in item
    assert "alice@example.com" not in item["promptPreview"]


def test_analyze_stays_available_if_incident_store_fails(monkeypatch) -> None:
    monkeypatch.setattr(routes_analyze, "get_incident_store", lambda: FailingStore())
    client = TestClient(app)

    response = client.post("/v1/analyze", json=_sample_payload())
    assert response.status_code == 200
    body = response.json()
    assert body["requestId"] == "req-api-test-1"
