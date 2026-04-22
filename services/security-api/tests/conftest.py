"""
Shared pytest fixtures for confidential-Agent test suite.
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.api import routes_analyze, routes_auth, routes_user_settings
from app.core import auth as auth_core
from app.core.user_store import InMemoryUserStore


@pytest.fixture
def client():
    """FastAPI test client with no mocks — uses real in-memory stores."""
    return TestClient(app)


@pytest.fixture
def client_with_auth_store(monkeypatch):
    """FastAPI test client wired to a fresh in-memory user store."""
    store = InMemoryUserStore()
    monkeypatch.setattr(routes_auth, "get_user_store", lambda: store)
    monkeypatch.setattr(routes_user_settings, "get_user_store", lambda: store)
    monkeypatch.setattr(auth_core, "get_user_store", lambda: store)
    return TestClient(app)


@pytest.fixture
def auth_headers(client_with_auth_store):
    """Returns Authorization headers for a freshly registered test user."""
    client = client_with_auth_store
    resp = client.post(
        "/v1/auth/signup",
        json={"email": "fixture@example.com", "password": "StrongPassword!2026"},
    )
    assert resp.status_code == 200
    token = resp.json()["accessToken"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def stub_incident_store(monkeypatch):
    """Replaces the MongoDB incident store with a thread-safe in-memory stub."""
    class _StubStore:
        def __init__(self):
            self.items = []

        def save_incident(self, incident):
            self.items.insert(0, dict(incident))

        def list_incidents(self, limit):
            return self.items[:max(limit, 0)]

    store = _StubStore()
    monkeypatch.setattr(routes_analyze, "get_incident_store", lambda: store)
    return store
