"""
Toxicity Analyzer — LangGraph node.

Detects vulgar, aggressive, harassing, or offensive language in text using an LLM
and generates exactly 3 alternative phrasings that preserve the original intent
while removing all offensive content.

Goal: help users express themselves respectfully on platforms such as YouTube
comments, Facebook posts, live chats, etc., without blocking their ability to
communicate.

Behaviour:
- Runs only when `settings.toxicity_analyzer_enabled` is True.
- Fails open: any LLM error returns the original decision unchanged.
- If toxicity is detected AND the current action is ALLOW → action becomes
  SUGGEST_REPHRASE.
- If toxicity is detected AND the current action is WARN or ANONYMIZE →
  suggestions are added but the security action is kept.
- BLOCK decisions are never overridden; suggestions are irrelevant when the
  prompt cannot be sent at all.
"""

import json
import re

import httpx

from app.core.config import settings
from app.core.policy_engine import PolicyDecision

# ── LLM system prompt ─────────────────────────────────────────────────────────
_SYSTEM_PROMPT = """\
You are a professional content moderator whose mission is to promote respectful,
healthy communication on the internet.

Analyze the provided text for toxic content, including:
- Profanity and offensive words (in ANY language: English, French, Spanish, etc.)
- Insults targeting individuals or groups (racism, sexism, homophobia, etc.)
- Aggressive, hostile, threatening, or intimidating tone
- Harassment and cyberbullying
- Sexually explicit language used aggressively or offensively

If toxicity is detected, provide EXACTLY 3 alternative phrasings that:
1. Fully preserve the original intent and core message.
2. Remove ALL offensive, vulgar, or aggressive elements.
3. Use respectful, clear, and constructive language.
4. Feel natural — not overly formal or robotic.
5. Are written in the SAME language as the original text.

Respond ONLY with valid JSON (no markdown, no extra text):
{
  "is_toxic": true,
  "severity": "low" | "medium" | "high",
  "confidence": 0.0-1.0,
  "categories": ["PROFANITY", "AGGRESSION", "INSULT", "HATE_SPEECH", "HARASSMENT"],
  "reason": "brief English explanation",
  "suggestions": [
    "first alternative phrasing",
    "second alternative phrasing",
    "third alternative phrasing"
  ]
}

If NO toxic content is detected, respond ONLY with:
{"is_toxic": false, "severity": "none", "confidence": 0.95, "categories": [], \
"reason": "No toxic content detected", "suggestions": []}
"""

# Maximum number of characters sent to the LLM — keep cost and latency low.
_MAX_CHARS = 1500

_PROFANITY_REPLACEMENTS: dict[str, str] = {
    "fuck": "that",
    "fucking": "very",
    "shit": "this",
    "bitch": "person",
    "asshole": "person",
    "bastard": "person",
    "merde": "cela",
    "foutre": "cela",
    "con": "personne",
    "connard": "personne",
    "salope": "personne",
}
_PROFANITY_PATTERN = re.compile(
    r"\b(" + "|".join(re.escape(k) for k in sorted(_PROFANITY_REPLACEMENTS, key=len, reverse=True)) + r")\b",
    re.IGNORECASE,
)


def _has_toxic_detection(decision: PolicyDecision) -> bool:
    return any(str(d.get("type", "")).upper() == "TOXIC_LANGUAGE" for d in (decision.detections or []))


def _sanitize_toxic_text(text: str) -> str:
    if not text:
        return ""
    cleaned = _PROFANITY_PATTERN.sub(
        lambda m: _PROFANITY_REPLACEMENTS.get(m.group(1).lower(), "this"),
        text,
    )
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def _fallback_suggestions(text: str) -> list[str]:
    """Generate basic rephrase suggestions when LLM is unavailable."""
    cleaned = _sanitize_toxic_text(text)
    if not cleaned:
        cleaned = "Could we discuss this respectfully?"
    return [
        cleaned,
        "I am frustrated about this. Could we address it constructively?",
        "Could you help me with this in a respectful way?",
    ]


def _call_toxicity_llm(text: str) -> dict | None:
    """
    Call the chat-completions endpoint to analyse toxicity.
    Returns the parsed JSON dict or None on any error (fail-open).
    """
    if not settings.llm_classifier_api_key or not settings.llm_classifier_enabled:
        return None

    truncated = text[:_MAX_CHARS] + ("…" if len(text) > _MAX_CHARS else "")

    url = f"{settings.llm_classifier_api_base.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.llm_classifier_api_key}",
        "Content-Type": "application/json",
    }
    body = {
        "model": settings.llm_classifier_model,
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": truncated},
        ],
        "temperature": 0,
        "max_tokens": 800,
        "response_format": {"type": "json_object"},
    }

    try:
        with httpx.Client(timeout=settings.llm_classifier_timeout_seconds * 2) as client:
            resp = client.post(url, headers=headers, json=body)
        if not resp.is_success:
            return None
        content = resp.json()["choices"][0]["message"]["content"]
        return json.loads(content)
    except Exception:
        return None


def run_toxicity_analyzer(text: str, decision: PolicyDecision) -> PolicyDecision:
    """
    Analyse text for toxic, vulgar, aggressive, or harassing content.

    Decision update rules:
    - ALLOW + toxicity found  → action becomes SUGGEST_REPHRASE, suggestions added.
    - WARN / ANONYMIZE + toxicity found → action kept, suggestions added.
    - BLOCK → always returned unchanged (no point suggesting rephrases).
    - LLM unavailable or not toxic → original decision returned unchanged.

    Args:
        text:     Raw text to analyse (prompt or response).
        decision: The PolicyDecision from earlier agents in the pipeline.

    Returns:
        Updated PolicyDecision or the original one if no toxicity / fail-open.
    """
    if not settings.toxicity_analyzer_enabled:
        return decision

    # BLOCK is absolute — toxicity analysis cannot change it.
    if decision.action == "BLOCK":
        return decision

    result = _call_toxicity_llm(text)
    if result is None:
        # LLM unavailable: if toxicity was already flagged upstream by deterministic
        # detectors, still provide suggestions so users are never blocked without help.
        if not _has_toxic_detection(decision):
            return decision
        suggestions = _fallback_suggestions(text)
        new_action = "SUGGEST_REPHRASE" if decision.action == "ALLOW" else decision.action
        return PolicyDecision(
            action=new_action,
            risk_score=decision.risk_score,
            reasons=list(decision.reasons) + ["[Toxicity] Offensive language detected (fallback suggestions)."],
            detections=decision.detections,
            redactions=decision.redactions,
            created_at=decision.created_at,
            suggestions=suggestions,
        )
    if not result.get("is_toxic", False):
        return decision

    severity: str = result.get("severity", "low")
    confidence: float = float(result.get("confidence", 0.7))
    categories: list[str] = result.get("categories", [])
    reason: str = result.get("reason", "Offensive or aggressive language detected.")
    raw_suggestions: list = result.get("suggestions", [])

    # Keep only non-empty string suggestions, max 3.
    suggestions = [s.strip() for s in raw_suggestions if isinstance(s, str) and s.strip()][:3]

    # Severity → risk score contribution.
    severity_score = {"low": 15, "medium": 30, "high": 55}.get(severity, 15)

    new_detections = list(decision.detections) + [
        {
            "type": "TOXIC_LANGUAGE",
            "valuePreview": ", ".join(categories[:3]) if categories else severity.upper(),
            "confidence": round(confidence, 3),
        }
    ]

    new_reasons = list(decision.reasons) + [
        f"[Toxicity] {severity.capitalize()} severity ({', '.join(categories) or 'general'}): {reason}"
    ]

    # ALLOW → SUGGEST_REPHRASE; WARN / ANONYMIZE → keep action but attach suggestions.
    new_action = "SUGGEST_REPHRASE" if decision.action == "ALLOW" else decision.action
    new_risk = max(decision.risk_score, severity_score) if new_action == "SUGGEST_REPHRASE" else decision.risk_score

    return PolicyDecision(
        action=new_action,
        risk_score=new_risk,
        reasons=new_reasons,
        detections=new_detections,
        redactions=decision.redactions,
        created_at=decision.created_at,
        suggestions=suggestions,
    )
