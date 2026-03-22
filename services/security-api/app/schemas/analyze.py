from typing import Literal
from pydantic import BaseModel, Field


SecurityAction = Literal["ALLOW", "ANONYMIZE", "BLOCK", "WARN"]
# Open string — platform list grows as new sites are added to the extension.
PlatformType = str


class AnalyzeMetadata(BaseModel):
    pageUrl: str | None = None
    sessionId: str | None = None
    tenantId: str | None = None


class AnalyzeRequest(BaseModel):
    requestId: str = Field(..., min_length=4, max_length=128)
    platform: PlatformType = "unknown"
    prompt: str = Field(..., min_length=1, max_length=20_000)
    userConsent: bool | None = None
    metadata: AnalyzeMetadata | None = None


class DetectionHit(BaseModel):
    type: str
    valuePreview: str
    confidence: float


class RedactionProposal(BaseModel):
    original: str
    replacement: str
    reason: str


class AnalyzeResponse(BaseModel):
    requestId: str
    action: SecurityAction
    riskScore: int
    reasons: list[str]
    detections: list[DetectionHit]
    redactions: list[RedactionProposal]
    createdAt: str
    graphTrace: list[str] = Field(default_factory=list)


class ValidateResponseRequest(BaseModel):
    requestId: str = Field(..., min_length=4, max_length=128)
    platform: PlatformType = "unknown"
    responseText: str = Field(..., min_length=1, max_length=20_000)
    metadata: AnalyzeMetadata | None = None


class ValidateResponseResponse(BaseModel):
    requestId: str
    action: SecurityAction
    riskScore: int
    reasons: list[str]
    detections: list[DetectionHit]
    redactions: list[RedactionProposal]
    createdAt: str
    graphTrace: list[str] = Field(default_factory=list)


# ── Image moderation ──────────────────────────────────────────────────────────

class AnalyzeImageRequest(BaseModel):
    requestId: str = Field(..., min_length=4, max_length=128)
    platform: PlatformType = "unknown"
    # Base64-encoded image data (client must resize to ≤ 1024px before encoding).
    imageBase64: str = Field(..., min_length=10)
    imageMimeType: str = Field(default="image/jpeg")
    metadata: AnalyzeMetadata | None = None


class AnalyzeImageResponse(BaseModel):
    requestId: str
    action: SecurityAction
    riskScore: int
    reasons: list[str]
    # One detection per flagged category (e.g. IMAGE_SEXUAL, IMAGE_VIOLENCE).
    detections: list[DetectionHit]
    createdAt: str
