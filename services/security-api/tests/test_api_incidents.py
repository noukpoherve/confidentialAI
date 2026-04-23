from fastapi.testclient import TestClient

from app.api import routes_analyze
from app.core import auth as auth_core
from app.core.auth import create_access_token
from app.main import app

_CI_USER_ID = "ci-test-user"
_CI_USER = {"id": _CI_USER_ID, "email": "ci@test.local"}


class _StubUserStore:
    def get_user_by_id(self, user_id: str):
        return _CI_USER


def _auth_headers() -> dict:
    token = create_access_token(user_id=_CI_USER_ID, email=_CI_USER["email"])
    return {"Authorization": f"Bearer {token}"}


class StubStore:
    def __init__(self) -> None:
        self.items: list[dict] = []

    def save_incident(self, incident: dict) -> None:
        self.items.insert(0, dict(incident))

    def list_incidents(self, limit: int = 100, offset: int = 0) -> list[dict]:
        return self.items[offset : offset + max(limit, 0)]


class FailingStore:
    def save_incident(self, incident: dict) -> None:
        raise RuntimeError("store unavailable")

    def list_incidents(self, limit: int = 100, offset: int = 0) -> list[dict]:
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
    monkeypatch.setattr(auth_core, "get_user_store", lambda: _StubUserStore())
    client = TestClient(app)

    response = client.post("/v1/analyze", json=_sample_payload())
    assert response.status_code == 200
    body = response.json()
    assert body["action"] in {"ANONYMIZE", "WARN", "BLOCK", "ALLOW", "SUGGEST_REPHRASE"}
    assert body["graphTrace"][0] == "afe"
    assert "ac" in body["graphTrace"]

    listed = client.get("/v1/incidents", headers=_auth_headers())
    assert listed.status_code == 200
    list_body = listed.json()
    assert list_body["total"] == 1
    assert len(list_body["items"]) == 1
    item = list_body["items"][0]
    assert item["requestId"] == "req-api-test-1"
    assert item["tenantId"] == "tenant-a"
    assert item["incidentType"] == "PROMPT"
    assert item["graphTrace"][0] == "afe"
    assert "ac" in item["graphTrace"]
    assert "contentPreview" in item
    assert "alice@example.com" not in item["contentPreview"]


def test_analyze_stays_available_if_incident_store_fails(monkeypatch) -> None:
    monkeypatch.setattr(routes_analyze, "get_incident_store", lambda: FailingStore())
    client = TestClient(app)

    response = client.post("/v1/analyze", json=_sample_payload())
    assert response.status_code == 200
    body = response.json()
    assert body["requestId"] == "req-api-test-1"
    assert body["graphTrace"][0] == "afe"
    assert "ac" in body["graphTrace"]


def test_validate_response_creates_response_incident(monkeypatch) -> None:
    store = StubStore()
    monkeypatch.setattr(routes_analyze, "get_incident_store", lambda: store)
    monkeypatch.setattr(auth_core, "get_user_store", lambda: _StubUserStore())
    client = TestClient(app)

    payload = {
        "requestId": "req-response-test-1",
        "platform": "claude",
        "responseText": "Here is an internal URL: https://service.internal/path",
        "metadata": {"tenantId": "tenant-b"},
    }
    response = client.post("/v1/validate-response", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["requestId"] == "req-response-test-1"
    assert body["graphTrace"][0] == "avs"
    assert "ac" in body["graphTrace"]

    listed = client.get("/v1/incidents", headers=_auth_headers())
    assert listed.status_code == 200
    items = listed.json()["items"]
    assert len(items) == 1
    assert items[0]["incidentType"] == "RESPONSE"
    assert items[0]["tenantId"] == "tenant-b"
    assert items[0]["graphTrace"][0] == "avs"
    assert "ac" in items[0]["graphTrace"]
