"""
Image content moderation using OpenAI's omni-moderation API.

The omni-moderation-latest model accepts image payloads (base64 data-URIs)
and returns a structured breakdown of flagged content categories with confidence
scores.  This is OpenAI's purpose-built moderation endpoint — faster and cheaper
than the chat-completion endpoint for this use-case.

Safe mode (enabled by default via SAFE_MODE_ENABLED env var):
  When enabled the moderator inspects the raw `category_scores` for the "sexual"
  category even when the API did NOT flag it.  This catches partial nudity such
  as lingerie or underwear images that score below the API's internal threshold
  but are still inappropriate for younger audiences.  The threshold is
  configurable via SAFE_MODE_SEXUAL_THRESHOLD (default 0.06 = 6 %).

  Drugs and recreational substances are covered by the "illicit" and
  "illicit/violent" categories; their risk weights are intentionally high to
  protect general audiences.
"""

import logging
from datetime import datetime, timezone

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)
from app.core.policy_engine import PolicyDecision

# ── Risk weights per moderation category ────────────────────────────────────
# A single hit takes the weight of the highest-scoring category.
# 100 = unconditional BLOCK (e.g. CSAM).
_CATEGORY_WEIGHTS: dict[str, int] = {
    "sexual/minors": 100,   # Absolute BLOCK — no override.
    "sexual": 85,
    "violence/graphic": 82,
    "self-harm/intent": 80,
    "self-harm/instructions": 78,
    "hate/threatening": 76,
    "illicit/violent": 74,  # Drugs + violence combination.
    "self-harm": 70,
    "violence": 68,         # Raised vs previous 65 — violence is never harmless.
    "hate": 62,
    "harassment/threatening": 62,
    "illicit": 72,          # Drugs, narcotics, dangerous substances — always BLOCK.
    "harassment": 45,
    # Virtual category inserted when safe-mode catches low-score nudity.
    "partial_nudity": 42,   # WARN territory; user decides.
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
    "illicit": "Illicit / drug-related content",
    "illicit/violent": "Violent illicit content",
    # Virtual safe-mode category.
    "partial_nudity": "Partial nudity / revealing content",
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
        timeout = settings.image_moderation_timeout_seconds
        with httpx.Client(timeout=timeout) as client:
            response = client.post(url, headers=headers, json=body)
        if not response.is_success:
            logger.warning(
                "OpenAI moderation HTTP %s for image: %s",
                response.status_code,
                (response.text or "")[:300],
            )
            return None
        results = response.json().get("results", [])
        return results[0] if results else None
    except Exception as exc:
        logger.warning("OpenAI moderation request failed: %s", exc)
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

    categories: dict[str, bool] = result.get("categories", {})
    scores: dict[str, float] = result.get("category_scores", {})

    # Collect API-flagged categories.
    hit_categories: list[str] = [cat for cat, flagged in categories.items() if flagged]

    # ── Safe-mode partial nudity check ───────────────────────────────────────
    # Even when the API does NOT set categories["sexual"] = True, a non-trivial
    # confidence score for "sexual" content can indicate partial nudity
    # (lingerie, underwear, revealing clothing).  Flag it at a lower threshold
    # so family / workplace deployments can protect younger audiences.
    if (
        settings.safe_mode_enabled
        and "sexual" not in hit_categories
        and scores.get("sexual", 0.0) >= settings.safe_mode_sexual_threshold
    ):
        hit_categories.append("partial_nudity")

    if not result.get("flagged", False) and not hit_categories:
        return PolicyDecision(
            action="ALLOW",
            risk_score=0,
            reasons=["No sensitive content detected in image."],
            detections=[],
            redactions=[],
            created_at=datetime.now(timezone.utc).isoformat(),
        )

    if not hit_categories:
        return _fail_open("Image flagged but no specific category identified.")

    detections = [
        {
            "type": f"IMAGE_{cat.upper().replace('/', '_').replace('-', '_')}",
            "valuePreview": _CATEGORY_LABELS.get(cat, cat.replace("/", " — ").title()),
            # For the virtual partial_nudity category use the raw sexual score.
            "confidence": round(
                float(scores.get("sexual", 0.0))
                if cat == "partial_nudity"
                else float(scores.get(cat, 0.8)),
                3,
            ),
        }
        for cat in hit_categories
    ]

    max_weight = max((_CATEGORY_WEIGHTS.get(cat, 40) for cat in hit_categories), default=0)
    risk_score = min(max_weight, 100)

    reasons: list[str] = []
    for cat in hit_categories:
        label = _CATEGORY_LABELS.get(cat, cat)
        # Use the raw sexual score as confidence for the virtual safe-mode category.
        raw_score = scores.get("sexual" if cat == "partial_nudity" else cat, 0.0)
        pct = f"{raw_score:.0%}"
        reasons.append(f"Detected: {label} (confidence {pct})")

    # Absolute BLOCK for CSAM — add unconditional header reason.
    if "sexual/minors" in hit_categories:
        action = "BLOCK"
        reasons.insert(0, "Image blocked — content involving minors detected.")
    elif risk_score >= 70:
        action = "BLOCK"
        reasons.insert(0, "High-severity sensitive content detected in image.")
    elif "partial_nudity" in hit_categories:
        action = "WARN"
        reasons.insert(
            0,
            "Image may contain partial nudity (revealing clothing or underwear) — "
            "review before sharing in professional or family contexts.",
        )
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
