"""
Image content moderation using OpenAI's omni-moderation API.

The omni-moderation-latest model accepts image payloads (base64 data-URIs)
and returns a structured breakdown of flagged content categories with confidence
scores.  This is OpenAI's purpose-built moderation endpoint — faster and cheaper
than the chat-completion endpoint for this use-case.
"""

from datetime import datetime, timezone

import httpx

from app.core.config import settings
from app.core.policy_engine import PolicyDecision

# ── Risk weights per moderation category ────────────────────────────────────
# A single hit takes the weight of the highest-scoring category.
# 100 = unconditional BLOCK (e.g. CSAM).
_CATEGORY_WEIGHTS: dict[str, int] = {
    "sexual/minors": 100,  # Absolute BLOCK — no override.
    "sexual": 85,
    "violence/graphic": 80,
    "self-harm/intent": 80,
    "self-harm/instructions": 75,
    "hate/threatening": 75,
    "illicit/violent": 72,
    "self-harm": 70,
    "violence": 65,
    "hate": 60,
    "harassment/threatening": 60,
    "illicit": 55,
    "harassment": 45,
}

_CATEGORY_LABELS: dict[str, str] = {
    "sexual": "Sexual content",
    "sexual/minors": "Content involving minors",
    "violence": "Violent content",
    "violence/graphic": "Graphic violence",
    "self-harm": "Self-harm imagery",
    "self-harm/intent": "Self-harm intent",
    "self-harm/instructions": "Self-harm instructions",
    "hate": "Hate content",
    "hate/threatening": "Threatening hate content",
    "harassment": "Harassment",
    "harassment/threatening": "Threatening harassment",
    "illicit": "Illicit content",
    "illicit/violent": "Violent illicit content",
}


def _fail_open(reason: str) -> PolicyDecision:
    return PolicyDecision(
        action="ALLOW",
        risk_score=0,
        reasons=[reason],
        detections=[],
        redactions=[],
        created_at=datetime.now(timezone.utc).isoformat(),
    )


def _call_moderation_api(image_base64: str, mime_type: str) -> dict | None:
    """
    POST the image to POST /v1/moderations using omni-moderation-latest.
    Returns the first result dict or None on any error (fail-open).
    """
    if not settings.llm_classifier_api_key:
        return None

    url = f"{settings.llm_classifier_api_base.rstrip('/')}/moderations"
    headers = {
        "Authorization": f"Bearer {settings.llm_classifier_api_key}",
        "Content-Type": "application/json",
    }
    body = {
        "model": "omni-moderation-latest",
        "input": [
            {
                "type": "image_url",
                "image_url": {"url": f"data:{mime_type};base64,{image_base64}"},
            }
        ],
    }

    try:
        # Image analysis may take longer than text — use a doubled timeout.
        timeout = settings.llm_classifier_timeout_seconds * 2
        with httpx.Client(timeout=timeout) as client:
            response = client.post(url, headers=headers, json=body)
        if not response.is_success:
            return None
        results = response.json().get("results", [])
        return results[0] if results else None
    except Exception:
        return None


def run_image_moderator(
    image_base64: str,
    mime_type: str = "image/jpeg",
) -> PolicyDecision:
    """
    Moderate an uploaded image.

    Decision ladder:
    - ALLOW : no sensitive content detected, or API unavailable (fail-open).
    - WARN  : mildly / moderately sensitive content (score 40-69).
              The user is informed and can choose to proceed.
    - BLOCK : high-severity content (score ≥ 70) or CSAM (unconditional).
              The upload must be prevented — no user override.

    Images cannot be "redacted" the way text can, so redactions is always [].
    The detections list contains one entry per flagged category with its
    human-readable label and the model's confidence score.
    """
    if not settings.llm_classifier_enabled:
        return _fail_open("Image moderation disabled — LLM_CLASSIFIER_ENABLED is false.")

    result = _call_moderation_api(image_base64, mime_type)
    if result is None:
        return _fail_open("Image moderation API unavailable — upload allowed (fail-open).")

    if not result.get("flagged", False):
        return PolicyDecision(
            action="ALLOW",
            risk_score=0,
            reasons=["No sensitive content detected in image."],
            detections=[],
            redactions=[],
            created_at=datetime.now(timezone.utc).isoformat(),
        )

    categories: dict[str, bool] = result.get("categories", {})
    scores: dict[str, float] = result.get("category_scores", {})

    hit_categories = [cat for cat, flagged in categories.items() if flagged]
    if not hit_categories:
        return _fail_open("Image flagged but no specific category identified.")

    detections = [
        {
            "type": f"IMAGE_{cat.upper().replace('/', '_').replace('-', '_')}",
            "valuePreview": _CATEGORY_LABELS.get(cat, cat.replace("/", " — ").title()),
            "confidence": round(float(scores.get(cat, 0.8)), 3),
        }
        for cat in hit_categories
    ]

    max_weight = max((_CATEGORY_WEIGHTS.get(cat, 40) for cat in hit_categories), default=0)
    risk_score = min(max_weight, 100)

    reasons: list[str] = []
    for cat in hit_categories:
        label = _CATEGORY_LABELS.get(cat, cat)
        pct = f"{scores.get(cat, 0.0):.0%}"
        reasons.append(f"Detected: {label} (confidence {pct})")

    # Absolute BLOCK for CSAM — add unconditional header reason.
    if "sexual/minors" in hit_categories:
        action = "BLOCK"
        reasons.insert(0, "Image blocked — content involving minors detected.")
    elif risk_score >= 70:
        action = "BLOCK"
        reasons.insert(0, "High-severity sensitive content detected in image.")
    else:
        action = "WARN"
        reasons.insert(0, "Potentially sensitive image content detected.")

    return PolicyDecision(
        action=action,
        risk_score=risk_score,
        reasons=reasons,
        detections=detections,
        redactions=[],
        created_at=datetime.now(timezone.utc).isoformat(),
    )
