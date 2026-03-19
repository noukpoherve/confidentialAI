from dataclasses import dataclass
from datetime import datetime, timezone

from app.core.config import settings
from app.core.detectors import build_redactions, detect_sensitive_content


@dataclass
class PolicyDecision:
    action: str
    risk_score: int
    reasons: list[str]
    detections: list[dict]
    redactions: list[dict]
    created_at: str


RISK_WEIGHTS: dict[str, int] = {
    "EMAIL": 15,
    "PHONE": 12,
    "IBAN": 35,
    "API_KEY": 45,
    "PASSWORD": 50,
    "TOKEN": 40,
    "INTERNAL_URL": 30,
    "SOURCE_CODE": 20,
}


def _score_hits(hit_types: list[str]) -> int:
    raw_score = sum(RISK_WEIGHTS.get(t, 8) for t in hit_types)
    return min(raw_score, 100)


def _decide_action(score: int, hit_types: set[str], user_consent: bool | None) -> tuple[str, list[str]]:
    reasons: list[str] = []

    if settings.enable_strict_block_on_secret and {"API_KEY", "PASSWORD", "TOKEN"} & hit_types:
        reasons.append("Critical secret detected.")
        return "BLOCK", reasons

    if score >= 70:
        reasons.append("High risk score.")
        return "BLOCK", reasons

    if score >= 40:
        if user_consent:
            reasons.append("Medium risk with explicit user consent.")
            return "ANONYMIZE", reasons
        reasons.append("Medium risk requires warning.")
        return "WARN", reasons

    if score >= 15:
        reasons.append("Low-to-medium risk requires anonymization.")
        return "ANONYMIZE", reasons

    reasons.append("No significant risk detected.")
    return "ALLOW", reasons


def analyze_prompt(prompt: str, user_consent: bool | None = None) -> PolicyDecision:
    """
    Central policy decision engine.
    Processing order:
    1) detect sensitive patterns
    2) compute risk score
    3) decide action
    4) propose redactions
    """
    hits = detect_sensitive_content(prompt)
    hit_types = [h.hit_type for h in hits]
    unique_hit_types = set(hit_types)

    risk_score = _score_hits(hit_types)
    action, reasons = _decide_action(risk_score, unique_hit_types, user_consent)

    detections = [
        {
            "type": h.hit_type,
            "valuePreview": (h.raw_value[:21] + "...") if len(h.raw_value) > 24 else h.raw_value,
            "confidence": h.confidence,
        }
        for h in hits
    ]

    redactions = build_redactions(hits) if action in {"ANONYMIZE", "WARN", "BLOCK"} else []

    return PolicyDecision(
        action=action,
        risk_score=risk_score,
        reasons=reasons,
        detections=detections,
        redactions=redactions,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
