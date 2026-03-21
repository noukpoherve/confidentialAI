from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field

SignalEventType = Literal[
    "SITE_SELECTED",
    "PROMPT_ELEMENT_NOT_FOUND",
    "API_UNREACHABLE",
    "EXTENSION_CONTEXT_INVALIDATED",
]


class SiteSignalRequest(BaseModel):
    eventType: SignalEventType
    hostname: str = Field(..., min_length=1, max_length=255)
    pageUrl: str | None = None
    platformId: str | None = None
    details: str | None = None
    createdAt: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class SiteSignalResponse(BaseModel):
    ok: bool = True


class SiteSignalSummaryRow(BaseModel):
    hostname: str
    count: int
    events: dict[str, int]
    lastSeenAt: str
