from dataclasses import dataclass, field
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
    # Populated by the toxicity analyzer when action == SUGGEST_REPHRASE.
    # Contains up to 3 LLM-generated alternatives that preserve intent
    # while removing offensive or aggressive language.
    suggestions: list[str] = field(default_factory=list)


RISK_WEIGHTS: dict[str, int] = {
    "EMAIL": 15,
    "PHONE": 12,
    "IBAN": 35,
    "SWIFT_BIC": 30,
    "LEGAL_HR": 16,
    "API_KEY": 45,
    "PASSWORD": 50,
    "TOKEN": 40,
    "INTERNAL_URL": 30,
    "SOURCE_CODE": 20,
    # A single injection attempt always crosses the BLOCK threshold (score >= 70).
    "PROMPT_INJECTION": 70,
    # TOXIC_LANGUAGE has weight 0: it must NOT affect the risk score or the
    # security decision.  Its sole role is to appear in the detections list so
    # that the toxicity_analyzer LangGraph node can read it as a signal and
    # generate rephrase suggestions.  The SUGGEST_REPHRASE action is set
    # exclusively by run_toxicity_analyzer(), never by the policy engine.
    "TOXIC_LANGUAGE": 0,
    # Link to a known adult or violent website embedded in the prompt text.
    # 55 puts a single hit in WARN territory; multiple hits will BLOCK.
    "HARMFUL_URL": 55,
}

# When the AI model *reproduces* sensitive data in its output, the risk is higher
# than when a user voluntarily includes the same data in their own prompt.
# These multipliers are applied only in analyze_response().
RESPONSE_RISK_MULTIPLIERS: dict[str, float] = {
    "EMAIL": 1.5,        # 15 → 22 — model leaking an email crosses WARN alone
    "PHONE": 0.8,        # 12 → 10 — de-emphasise; still noisy even after regex fix
    "IBAN": 1.5,         # 35 → 52 — financial data leak is high risk
    "SWIFT_BIC": 1.5,
    "LEGAL_HR": 1.2,
    "API_KEY": 2.0,      # 45 → 90 — always BLOCK; model must never reproduce a secret
    "PASSWORD": 2.0,     # 50 → 100 — always BLOCK
    "TOKEN": 2.0,        # 40 → 80 — always BLOCK
    "INTERNAL_URL": 1.5, # 30 → 45 — internal topology exposed in response
    "SOURCE_CODE": 1.0,  # neutral — code in a response is often intentional
    "PROMPT_INJECTION": 1.0,  # already 70 (BLOCK territory)
}


def _score_hits(hit_types: list[str]) -> int:
    raw_score = sum(RISK_WEIGHTS.get(t, 8) for t in hit_types)
    return min(raw_score, 100)


def _score_hits_response(hit_types: list[str]) -> int:
    raw_score = sum(
        RISK_WEIGHTS.get(t, 8) * RESPONSE_RISK_MULTIPLIERS.get(t, 1.0)
        for t in hit_types
    )
    return min(int(raw_score), 100)


def _decide_action(score: int, hit_types: set[str], user_consent: bool | None) -> tuple[str, list[str]]:
    """Decision logic for USER PROMPTS (input analysis)."""
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


def _decide_action_response(score: int, hit_types: set[str]) -> tuple[str, list[str]]:
    """
    Decision logic for AI MODEL RESPONSES (output analysis).

    Semantics differ from prompt analysis:
    - There is no user-consent concept — the model reproducing sensitive data is
      always an undesirable event, regardless of what the user sent.
    - Thresholds are more aggressive: any identified PII in a response
      should at minimum trigger a WARN so the user is made aware.
    - Secrets (API keys, passwords, tokens) reproduced in a response trigger an
      immediate BLOCK — the model must never echo a secret back to the client.
    """
    reasons: list[str] = []

    # Any reproduced secret is an unconditional BLOCK.
    if {"API_KEY", "PASSWORD", "TOKEN"} & hit_types:
        reasons.append("Model reproduced a critical secret — response blocked to prevent leakage.")
        return "BLOCK", reasons

    if score >= 60:
        reasons.append("High-risk content detected in model response.")
        return "BLOCK", reasons

    if score >= 20:
        reasons.append("Sensitive content detected in model response.")
        return "WARN", reasons

    if score >= 10:
        reasons.append("Potentially sensitive content in model response.")
        return "ANONYMIZE", reasons

    reasons.append("No significant risk detected in model response.")
    return "ALLOW", reasons


def _build_detections(hits: list) -> list[dict]:
    return [
        {
            "type": h.hit_type,
            "valuePreview": (h.raw_value[:21] + "...") if len(h.raw_value) > 24 else h.raw_value,
            "confidence": h.confidence,
        }
        for h in hits
    ]


def analyze_prompt(prompt: str, user_consent: bool | None = None) -> PolicyDecision:
    """
    Input analysis pipeline (USER → AI).
    1) Detect sensitive patterns via deterministic regex.
    2) Score risk using base RISK_WEIGHTS.
    3) Decide action, factoring in optional user consent.
    4) Propose redactions for actionable hits.
    """
    hits = detect_sensitive_content(prompt)
    hit_types = [h.hit_type for h in hits]
    unique_hit_types = set(hit_types)

    risk_score = _score_hits(hit_types)
    action, reasons = _decide_action(risk_score, unique_hit_types, user_consent)

    redactions = build_redactions(hits) if action in {"ANONYMIZE", "WARN", "BLOCK"} else []

    return PolicyDecision(
        action=action,
        risk_score=risk_score,
        reasons=reasons,
        detections=_build_detections(hits),
        redactions=redactions,
        created_at=datetime.now(timezone.utc).isoformat(),
    )


def analyze_response(response_text: str) -> PolicyDecision:
    """
    Output analysis pipeline (AI → USER).
    1) Detect sensitive patterns via deterministic regex.
    2) Score risk using RESPONSE_RISK_MULTIPLIERS (secrets weighted higher).
    3) Decide action — no user-consent concept; stricter thresholds.
    4) Propose redactions so the response can be filtered before display.
    """
    hits = detect_sensitive_content(response_text)
    hit_types = [h.hit_type for h in hits]
    unique_hit_types = set(hit_types)

    risk_score = _score_hits_response(hit_types)
    action, reasons = _decide_action_response(risk_score, unique_hit_types)

    redactions = build_redactions(hits) if action in {"ANONYMIZE", "WARN", "BLOCK"} else []

    return PolicyDecision(
        action=action,
        risk_score=risk_score,
        reasons=reasons,
        detections=_build_detections(hits),
        redactions=redactions,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
