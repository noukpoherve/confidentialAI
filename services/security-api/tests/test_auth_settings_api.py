from fastapi.testclient import TestClient

from app.api import routes_auth, routes_user_settings
from app.core import auth as auth_core
from app.core.user_store import InMemoryUserStore
from app.main import app


def _build_client_with_store(monkeypatch):
    store = InMemoryUserStore()
    monkeypatch.setattr(routes_auth, "get_user_store", lambda: store)
    monkeypatch.setattr(routes_user_settings, "get_user_store", lambda: store)
    monkeypatch.setattr(auth_core, "get_user_store", lambda: store)
    return TestClient(app)


def test_signup_login_and_profile(monkeypatch) -> None:
    client = _build_client_with_store(monkeypatch)
    signup_payload = {"email": "owner@example.com", "password": "StrongPassword!2026"}

    signup = client.post("/v1/auth/signup", json=signup_payload)
    assert signup.status_code == 200
    token = signup.json()["accessToken"]
    assert token

    login = client.post("/v1/auth/login", json=signup_payload)
    assert login.status_code == 200
    login_token = login.json()["accessToken"]
    assert login_token

    me = client.get("/v1/auth/me", headers={"Authorization": f"Bearer {login_token}"})
    assert me.status_code == 200
    assert me.json()["user"]["email"] == "owner@example.com"


def test_settings_requires_auth(monkeypatch) -> None:
    client = _build_client_with_store(monkeypatch)
    response = client.get("/v1/users/me/settings")
    assert response.status_code == 401


def test_get_and_update_user_settings(monkeypatch) -> None:
    client = _build_client_with_store(monkeypatch)
    signup = client.post(
        "/v1/auth/signup",
        json={"email": "settings@example.com", "password": "StrongPassword!2026"},
    )
    token = signup.json()["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}

    default_settings = client.get("/v1/users/me/settings", headers=headers)
    assert default_settings.status_code == 200
    body = default_settings.json()
    assert body["guardrailEnabled"] is True
    assert body["contentModerationEnabled"] is True
    assert body["responseModerationEnabled"] is True
    assert body["avsRevealBlurred"] is False
    assert isinstance(body["enabledPlatformIds"], list)
    assert isinstance(body["customDomains"], list)

    updated = client.put(
        "/v1/users/me/settings",
        headers=headers,
        json={
            "guardrailEnabled": True,
            "contentModerationEnabled": False,
            "enabledPlatformIds": ["chatgpt", "claude"],
            "customDomains": ["facebook.com", "teams.microsoft.com"],
        },
    )
    assert updated.status_code == 200
    updated_body = updated.json()
    assert updated_body["contentModerationEnabled"] is False
    assert updated_body["enabledPlatformIds"] == ["chatgpt", "claude"]
    assert updated_body["customDomains"] == ["facebook.com", "teams.microsoft.com"]
