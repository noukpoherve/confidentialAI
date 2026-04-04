from __future__ import annotations

import base64
import hashlib
import hmac
import os
from datetime import UTC, datetime, timedelta

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings
from app.core.user_store import get_user_store


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 150000)
    return f"pbkdf2_sha256${base64.b64encode(salt).decode()}${base64.b64encode(digest).decode()}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        _, salt_b64, digest_b64 = encoded.split("$", 2)
        salt = base64.b64decode(salt_b64.encode())
        expected = base64.b64decode(digest_b64.encode())
        computed = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 150000)
        return hmac.compare_digest(expected, computed)
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": user_id,
        "email": email,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=settings.auth_access_token_minutes)).timestamp()),
    }
    return jwt.encode(payload, settings.auth_secret_key, algorithm=settings.auth_algorithm)


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, settings.auth_secret_key, algorithms=[settings.auth_algorithm])


bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)) -> dict:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    token = credentials.credentials
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    user = get_user_store().get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict | None:
    """Same as get_current_user but returns None when no/invalid token (e.g. optional auth on /analyze)."""
    if not credentials or credentials.scheme.lower() != "bearer":
        return None
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = payload.get("sub")
    except Exception:
        return None
    if not user_id:
        return None
    user = get_user_store().get_user_by_id(user_id)
    return user if user else None
