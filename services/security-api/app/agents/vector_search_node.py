"""
LangGraph node: semantic shortcut before the LLM classifier when a prompt matches
a prior BLOCK/WARN incident in Qdrant (similarity >= configured threshold).
"""

from __future__ import annotations

from app.core.config import settings
from app.core.policy_engine import PolicyDecision
from app.stores.vector_store import search_similar_incident


def _apply_vector_hit(
    decision: PolicyDecision,
    score: float,
    payload: dict,
    text: str,
) -> PolicyDecision:
    action = str(payload.get("action", "WARN"))
    matched_risk = int(payload.get("riskScore") or 0)

    decision.reasons.append(
        f"Semantic match to prior {action} incident (similarity {score:.2f})."
    )
    preview = (text[:21] + "...") if len(text) > 24 else text
    decision.detections.append(
        {
            "type": "VECTOR_SIMILARITY",
            "valuePreview": preview,
            "confidence": score,
        }
    )

    if action == "BLOCK":
        decision.risk_score = max(decision.risk_score, 75, min(matched_risk, 100))
        decision.action = "BLOCK"
    else:
        decision.risk_score = max(decision.risk_score, 45, min(matched_risk, 100))
        if decision.action == "ALLOW":
            decision.action = "WARN"
        elif decision.action == "ANONYMIZE":
            decision.action = "WARN"

    return decision


def run_prompt_vector_search(text: str, decision: PolicyDecision) -> tuple[PolicyDecision, bool]:
    """
    Returns (updated decision, skip_llm_classifier).
    When skip_llm_classifier is True, the LLM classifier node should be bypassed.
    """
    if not settings.vector_search_enabled:
        return decision, False

    hit = search_similar_incident(text)
    if hit is None:
        return decision, False

    score, payload = hit
    updated = _apply_vector_hit(decision, score, payload, text)
    return updated, True
