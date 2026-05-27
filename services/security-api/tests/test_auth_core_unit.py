"""
Unit tests for app/core/auth.py.

Tests cover password hashing, token creation/decoding, and both auth
dependency functions (get_current_user and get_current_user_optional).
No network calls are made; the user store is monkeypatched where needed.
"""

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

# ── Password hashing ──────────────────────────────────────────────────────────


def test_hash_and_verify_password_roundtrip():
    from app.core.auth import hash_password, verify_password

    hashed = hash_password("super-secret-123")
    assert verify_password("super-secret-123", hashed) is True


def test_verify_password_wrong_password():
    from app.core.auth import hash_password, verify_password

    hashed = hash_password("correct-password")
    assert verify_password("wrong-password", hashed) is False


def test_verify_password_invalid_encoded_string():
    """verify_password must return False — not raise — for a malformed hash."""
    from app.core.auth import verify_password

    assert verify_password("anything", "not-a-valid-encoded-string") is False


def test_verify_password_empty_string():
    from app.core.auth import verify_password

    assert verify_password("password", "") is False


# ── Token create / decode ─────────────────────────────────────────────────────


def test_create_and_decode_access_token():
    from app.core.auth import create_access_token, decode_access_token

    token = create_access_token(user_id="user-42", email="user@example.com")
    payload = decode_access_token(token)

    assert payload["sub"] == "user-42"
    assert payload["email"] == "user@example.com"


def test_decode_invalid_token_raises():
    import jwt

    from app.core.auth import decode_access_token

    with pytest.raises(jwt.exceptions.DecodeError):
        decode_access_token("this.is.not.a.jwt")


# ── get_current_user_optional ─────────────────────────────────────────────────


def test_get_current_user_optional_no_credentials():
    """None credentials → returns None (no exception)."""
    from app.core.auth import get_current_user_optional

    result = get_current_user_optional(credentials=None)
    assert result is None


def test_get_current_user_optional_non_bearer_scheme():
    """Non-bearer scheme → returns None."""
    from app.core.auth import get_current_user_optional

    creds = HTTPAuthorizationCredentials(scheme="Basic", credentials="dXNlcjpwYXNz")
    result = get_current_user_optional(credentials=creds)
    assert result is None


def test_get_current_user_optional_invalid_token():
    """An invalid/expired JWT → returns None instead of raising."""
    from app.core.auth import get_current_user_optional

    creds = HTTPAuthorizationCredentials(
        scheme="Bearer", credentials="invalid.jwt.token"
    )
    result = get_current_user_optional(credentials=creds)
    assert result is None


def test_get_current_user_optional_valid_token_unknown_user(monkeypatch):
    """Valid token but user not found in store → returns None."""
    import app.core.auth as auth_module
    from app.core.auth import create_access_token, get_current_user_optional

    # Stub store that always returns None for get_user_by_id
    class StubStore:
        def get_user_by_id(self, _user_id):
            return None

    monkeypatch.setattr(auth_module, "get_user_store", lambda: StubStore())

    token = create_access_token(user_id="ghost-user", email="ghost@example.com")
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    result = get_current_user_optional(credentials=creds)
    assert result is None


def test_get_current_user_optional_returns_user_when_valid(monkeypatch):
    """Valid token + existing user → returns the user dict."""
    import app.core.auth as auth_module
    from app.core.auth import create_access_token, get_current_user_optional

    fake_user = {"id": "user-1", "email": "real@example.com"}

    class StubStore:
        def get_user_by_id(self, _user_id):
            return fake_user

    monkeypatch.setattr(auth_module, "get_user_store", lambda: StubStore())

    token = create_access_token(user_id="user-1", email="real@example.com")
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    result = get_current_user_optional(credentials=creds)
    assert result == fake_user


# ── get_current_user ──────────────────────────────────────────────────────────


def test_get_current_user_no_credentials_raises_401():
    from app.core.auth import get_current_user

    with pytest.raises(HTTPException) as exc_info:
        get_current_user(credentials=None)

    assert exc_info.value.status_code == 401


def test_get_current_user_invalid_token_raises_401():
    from app.core.auth import get_current_user

    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="bad.token")
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(credentials=creds)

    assert exc_info.value.status_code == 401


def test_get_current_user_user_not_found_raises_401(monkeypatch):
    """Valid token but no matching user in store → 401."""
    import app.core.auth as auth_module
    from app.core.auth import create_access_token, get_current_user

    class StubStore:
        def get_user_by_id(self, _user_id):
            return None

    monkeypatch.setattr(auth_module, "get_user_store", lambda: StubStore())

    token = create_access_token(user_id="missing", email="missing@example.com")
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

    with pytest.raises(HTTPException) as exc_info:
        get_current_user(credentials=creds)

    assert exc_info.value.status_code == 401


def test_get_current_user_returns_user_when_valid(monkeypatch):
    """Valid token + existing user → returns the user dict."""
    import app.core.auth as auth_module
    from app.core.auth import create_access_token, get_current_user

    fake_user = {"id": "user-99", "email": "ok@example.com"}

    class StubStore:
        def get_user_by_id(self, _user_id):
            return fake_user

    monkeypatch.setattr(auth_module, "get_user_store", lambda: StubStore())

    token = create_access_token(user_id="user-99", email="ok@example.com")
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    result = get_current_user(credentials=creds)
    assert result == fake_user
