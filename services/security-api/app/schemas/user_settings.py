from pydantic import BaseModel, Field


class UserSettingsPayload(BaseModel):
    guardrailEnabled: bool = True
    enabledPlatformIds: list[str] = Field(default_factory=list)
    customDomains: list[str] = Field(default_factory=list)


class UserSettingsResponse(UserSettingsPayload):
    updatedAt: str
