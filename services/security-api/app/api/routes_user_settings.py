from fastapi import APIRouter, Depends

from app.core.auth import get_current_user
from app.core.user_store import get_user_store
from app.schemas.user_settings import UserSettingsPayload, UserSettingsResponse

router = APIRouter(prefix="/v1/users/me", tags=["user-settings"])


@router.get("/settings", response_model=UserSettingsResponse)
def get_my_settings(current_user: dict = Depends(get_current_user)) -> UserSettingsResponse:
    payload = get_user_store().get_user_settings(current_user["id"])
    return UserSettingsResponse(**payload)


@router.put("/settings", response_model=UserSettingsResponse)
def update_my_settings(
    request: UserSettingsPayload, current_user: dict = Depends(get_current_user)
) -> UserSettingsResponse:
    payload = get_user_store().upsert_user_settings(current_user["id"], request.model_dump())
    return UserSettingsResponse(**payload)
