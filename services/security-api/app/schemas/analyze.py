from typing import Literal
from pydantic import BaseModel, Field


SecurityAction = Literal["ALLOW", "ANONYMIZE", "BLOCK", "WARN"]
PlatformType = Literal["chatgpt", "claude", "gemini", "unknown"]


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
