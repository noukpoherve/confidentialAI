"""
Tests for API infrastructure — /health, error handling, and fail-open behaviour.

These tests are critical for CI/CD:
- /health is polled by the Koyeb deployment health check.
- Fail-open on MongoDB ensures the DLP service stays available even if storage is down.
- Auth edge cases must be handled gracefully.
"""

from fastapi.testclient import TestClient

from app.main import app


# ── /health endpoint ──────────────────────────────────────────────────────────

def test_health_returns_200():
    """CD health check — must always return 200 with status=ok."""
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200


def test_health_response_has_status_ok():
    """CD health check — status field must equal 'ok'."""
    client = TestClient(app)
    body = client.get("/health").json()
    assert body["status"] == "ok"


def test_health_response_has_expected_fields():
    """Health response must include all fields the CD pipeline expects."""
    client = TestClient(app)
    body = client.get("/health").json()
    assert "status" in body
    assert "llmClassifierEnabled" in body
    assert "llmKeyConfigured" in body


# ── Fail-open if MongoDB incident store is unavailable ────────────────────────

def test_analyze_fail_open_if_incident_store_crashes(monkeypatch):
    """
    The DLP guardrail must remain operational even when MongoDB is down.
    A storage failure must NEVER propagate a 500 to the extension.
    """
    from app.api import routes_analyze

    class _CrashingStore:
        def save_incident(self, _):
            raise RuntimeError("MongoDB unreachable")

        def list_incidents(self, _):
            return []

    monkeypatch.setattr(routes_analyze, "get_incident_store", lambda: _CrashingStore())
    client = TestClient(app)

    response = client.post("/v1/analyze", json={
        "requestId": "fail-open-test",
        "platform": "chatgpt",
        "prompt": "my api key is sk_liveABCDEFGHIJKLMNOP",
        "userConsent": False,
    })

    # Must return 200 — never 500 — even if storage is broken
    assert response.status_code == 200
    body = response.json()
    # Security decision must still be enforced
    assert body["action"] == "BLOCK"


# ── 422 validation errors on malformed requests ───────────────────────────────

def test_analyze_missing_prompt_returns_422():
    """Missing required 'prompt' field must return 422 Unprocessable Entity."""
    client = TestClient(app)
    response = client.post("/v1/analyze", json={
        "requestId": "bad-request",
        "platform": "chatgpt",
        # prompt is missing
    })
    assert response.status_code == 422


def test_analyze_empty_prompt_returns_422():
    """Empty string prompt is rejected by schema validation (min_length=1) — must return 422."""
    client = TestClient(app)
    response = client.post("/v1/analyze", json={
        "requestId": "empty-prompt",
        "platform": "chatgpt",
        "prompt": "",
        "userConsent": False,
    })
    assert response.status_code == 422


# ── Auth edge cases ───────────────────────────────────────────────────────────

def test_signup_duplicate_email_returns_error(monkeypatch):
    """Registering twice with the same email must fail gracefully."""
    from app.api import routes_auth
    from app.core import auth as auth_core
    from app.core.user_store import InMemoryUserStore

    store = InMemoryUserStore()
    monkeypatch.setattr(routes_auth, "get_user_store", lambda: store)
    monkeypatch.setattr(auth_core, "get_user_store", lambda: store)

    client = TestClient(app)
    payload = {"email": "dup@example.com", "password": "StrongPassword!2026"}

    first = client.post("/v1/auth/signup", json=payload)
    assert first.status_code == 200

    second = client.post("/v1/auth/signup", json=payload)
    # Must not be 200 — should be 409 Conflict or 400
    assert second.status_code in {400, 409, 422}


def test_login_wrong_password_returns_401(monkeypatch):
    """Login with wrong password must return 401 Unauthorized."""
    from app.api import routes_auth
    from app.core import auth as auth_core
    from app.core.user_store import InMemoryUserStore

    store = InMemoryUserStore()
    monkeypatch.setattr(routes_auth, "get_user_store", lambda: store)
    monkeypatch.setattr(auth_core, "get_user_store", lambda: store)

    client = TestClient(app)
    client.post("/v1/auth/signup", json={
        "email": "user@example.com",
        "password": "CorrectPassword!2026",
    })

    response = client.post("/v1/auth/login", json={
        "email": "user@example.com",
        "password": "WrongPassword!9999",
    })
    assert response.status_code == 401


def test_protected_route_with_invalid_token():
    """Invalid JWT must return 401 — never 200 or 500."""
    client = TestClient(app)
    response = client.get(
        "/v1/users/me/settings",
        headers={"Authorization": "Bearer this.is.not.a.valid.jwt"},
    )
    assert response.status_code == 401


def test_protected_route_without_token():
    """Missing Authorization header must return 401."""
    client = TestClient(app)
    response = client.get("/v1/users/me/settings")
    assert response.status_code == 401
