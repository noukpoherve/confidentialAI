from pydantic import BaseModel, Field


class UserPlatformEntry(BaseModel):
    """A platform added by the user (beyond the built-in seed list)."""

    id: str
    label: str
    domain: str
    # If set, only this path prefix on the host is protected (leading slash, no trailing slash).
    pathPrefix: str | None = None
    # "textAnalysis" | "imageModeration"
    features: list[str] = Field(default_factory=lambda: ["textAnalysis", "imageModeration"])


class UserSettingsPayload(BaseModel):
    guardrailEnabled: bool = True
    autoAnonymize: bool = False
    contentModerationEnabled: bool = True
    # AI output (AVS): harmful / immoral content moderation on assistant replies — not PII.
    responseModerationEnabled: bool = True
    # When true, blurred or masked AVS fragments are shown in clear text on the page.
    avsRevealBlurred: bool = False
    imageModerationEnabled: bool = True
    # IDs of built-in platforms the user has enabled (empty = use defaults = all).
    enabledPlatformIds: list[str] = Field(default_factory=list)
    # Legacy simple domain list — kept for backward compatibility.
    customDomains: list[str] = Field(default_factory=list)
    # User-managed platforms: each entry has domain, label and per-platform features.
    userAddedPlatforms: list[UserPlatformEntry] = Field(default_factory=list)
    # URLs whose appearance in prompts should be flagged (see build_url_protection_patterns).
    protected_urls: list[str] = Field(default_factory=list)


class UserSettingsResponse(UserSettingsPayload):
    updatedAt: str
