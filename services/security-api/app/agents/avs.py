from app.core.policy_engine import PolicyDecision, analyze_avs_response


def run_avs(response_text: str) -> PolicyDecision:
    """
    AVS (AI Validation Sentinel) — model output validation for *immoral / harmful*
    content only on the deterministic regex layer.

    Emails, phones, IBANs, API keys, HR phrases, prompt-injection heuristics, etc.
    are intentionally excluded here so AVS does not blur benign AI answers that
    merely mention everyday data. Those concerns belong to prompt-side
    anonymization / input policy, not to AVS display moderation.

    Regex stage: profanity / toxic language and known harmful URLs only
    (see analyze_avs_response). Semantic harmful-content classification runs in
    the LangGraph LLM node with a response-specific prompt.
    """
    return analyze_avs_response(response_text=response_text)
