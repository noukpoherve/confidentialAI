from app.core.policy_engine import PolicyDecision, analyze_response


def run_avs(response_text: str) -> PolicyDecision:
    """
    AVS (AI Validation Sentinel) — model output validation.

    Dual-purpose scanning of AI-generated responses:

    1. Data leakage detection — the model may reproduce sensitive data it was
       shown earlier in the conversation (emails, API keys, internal URLs…).
       Response-specific risk multipliers ensure these are weighted more
       aggressively than the same patterns in a user prompt.

    2. Indirect prompt injection — adversarial instructions embedded inside
       a response payload designed to hijack subsequent interactions
       (Slack AI 2024 vector). PROMPT_INJECTION carries weight 70 → BLOCK.

    Uses analyze_response() (not analyze_prompt()) because:
    - There is no user-consent concept for model outputs.
    - Secrets reproduced in a response are always an immediate BLOCK.
    - Lower WARN/ANONYMIZE thresholds catch subtle leakage early.
    """
    return analyze_response(response_text=response_text)
