import json

import httpx

from app.core.config import settings
from app.core.policy_engine import PolicyDecision


def _safe_parse_json(text: str) -> dict | None:
    try:
        return json.loads(text)
    except Exception:
        return None


def _extract_content_from_openai_response(payload: dict) -> str:
    choices = payload.get("choices", [])
    if not choices:
        return ""
    message = choices[0].get("message", {})
    content = message.get("content", "")
    return content if isinstance(content, str) else ""


def _build_prompt(text: str) -> str:
    sanitized = text
    sanitized = sanitized.replace("[REDACTED_", "[SANITIZED_")
    return (
        "You are a strict sensitive-data classifier.\n"
        "Return ONLY valid JSON with keys: "
        "sensitive(boolean), severity(low|medium|high), confidence(number 0..1), "
        "categories(array of strings), reason(string).\n"
        "Treat placeholder markers such as [SANITIZED_*] as already redacted and safe.\n"
        "If uncertain, set sensitive=true with medium severity.\n\n"
        f"Text to classify:\n{sanitized}"
    )


def _call_classifier(text: str) -> dict | None:
    if not settings.llm_classifier_enabled:
        return None
    if not settings.llm_classifier_api_key:
        return None

    url = f"{settings.llm_classifier_api_base.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.llm_classifier_api_key}",
        "Content-Type": "application/json",
    }
    body = {
        "model": settings.llm_classifier_model,
        "temperature": 0,
        "messages": [
            {"role": "system", "content": "You output strict JSON only."},
            {"role": "user", "content": _build_prompt(text)},
        ],
    }

    try:
        with httpx.Client(timeout=settings.llm_classifier_timeout_seconds) as client:
            response = client.post(url, headers=headers, json=body)
        if not response.is_success:
            return None
        payload = response.json()
        content = _extract_content_from_openai_response(payload)
        return _safe_parse_json(content)
    except Exception:
        return None


def _to_float(value, fallback: float = 0.7) -> float:
    try:
        return float(value)
    except Exception:
        return fallback


def _escalate_decision(decision: PolicyDecision, result: dict, text: str) -> PolicyDecision:
    sensitive = bool(result.get("sensitive", False))
    if not sensitive:
        return decision

    severity = str(result.get("severity", "medium")).lower()
    confidence = max(0.0, min(1.0, _to_float(result.get("confidence"), 0.7)))
    reason = str(result.get("reason", "LLM classifier flagged potentially sensitive content.")).strip()
    categories = result.get("categories", [])
    if not isinstance(categories, list):
        categories = []

    decision.reasons.append(f"LLM classifier: {reason}")
    decision.detections.append(
        {
            "type": "LLM_SENSITIVE",
            "valuePreview": (text[:21] + "...") if len(text) > 24 else text,
            "confidence": confidence,
        }
    )

    if severity == "high":
        decision.risk_score = max(decision.risk_score, 75)
        decision.action = "BLOCK"
    elif severity == "medium":
        decision.risk_score = max(decision.risk_score, 45)
        if decision.action == "ALLOW":
            decision.action = "WARN"
    else:
        decision.risk_score = max(decision.risk_score, 20)
        if decision.action == "ALLOW":
            decision.action = "ANONYMIZE"

    if categories:
        decision.reasons.append(f"LLM categories: {', '.join(str(c) for c in categories[:6])}")
    return decision


def run_llm_classifier(text: str, decision: PolicyDecision) -> PolicyDecision:
    """
    Optional LLM-sensitive classifier node.
    This runs in fail-open mode: on errors, the original decision is preserved.
    """
    result = _call_classifier(text)
    if not result:
        return decision
    return _escalate_decision(decision, result, text)
