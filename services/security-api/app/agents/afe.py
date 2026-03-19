from app.core.policy_engine import PolicyDecision, analyze_prompt


def run_afe(prompt: str, user_consent: bool | None) -> PolicyDecision:
    """
    AFE (Input Filtering Agent) for prompt-level risk analysis.
    V1 implementation delegates to deterministic policy logic.
    """
    return analyze_prompt(prompt=prompt, user_consent=user_consent)
