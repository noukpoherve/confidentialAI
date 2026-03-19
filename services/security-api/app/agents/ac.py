from app.core.policy_engine import PolicyDecision


def run_ac(decision: PolicyDecision) -> PolicyDecision:
    """
    AC (Arbitration Controller) for ambiguous decisions.
    V1 keeps deterministic output and only annotates medium-risk WARN cases.
    """
    if decision.action == "WARN" and 40 <= decision.risk_score < 50:
        decision.reasons.append("Arbitration: medium-risk decision confirmed.")
    return decision
