from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import create_access_token, get_current_user, hash_password, verify_password
from app.core.user_store import get_user_store
from app.schemas.auth import AuthResponse, LoginRequest, SignupRequest

router = APIRouter(prefix="/v1/auth", tags=["auth"])


def _sanitize_user(user: dict) -> dict:
    return {
        "id": user.get("id"),
        "email": user.get("email"),
        "createdAt": user.get("createdAt"),
    }


@router.post("/signup", response_model=AuthResponse)
def signup(request: SignupRequest) -> AuthResponse:
    store = get_user_store()
    try:
        user = store.create_user(email=request.email, password_hash=hash_password(request.password))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists") from exc

    token = create_access_token(user_id=user["id"], email=user["email"])
    return AuthResponse(accessToken=token, user=_sanitize_user(user))


@router.post("/login", response_model=AuthResponse)
def login(request: LoginRequest) -> AuthResponse:
    store = get_user_store()
    user = store.get_user_by_email(request.email)
    if not user or not verify_password(request.password, user.get("passwordHash", "")):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(user_id=user["id"], email=user["email"])
    return AuthResponse(accessToken=token, user=_sanitize_user(user))


@router.get("/me")
def me(current_user: dict = Depends(get_current_user)) -> dict:
    return {"user": _sanitize_user(current_user)}
