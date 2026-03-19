from app.core.policy_engine import PolicyDecision, analyze_prompt


def run_avs(response_text: str) -> PolicyDecision:
    """
    AVS (AI Validation Sentinel) for model response validation.
    V1 reuses prompt policy logic against response text.
    """
    return analyze_prompt(prompt=response_text, user_consent=False)
