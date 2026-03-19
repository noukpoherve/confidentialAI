from app.agents.orchestrator import analyze_prompt_with_agents, validate_response_with_agents


def test_prompt_graph_returns_policy_decision() -> None:
    execution = analyze_prompt_with_agents(
        prompt="My API key is sk_1234567890ABCDEFGHIJKLMNOP", user_consent=False
    )
    decision = execution.decision
    assert decision.action == "BLOCK"
    assert decision.risk_score >= 40
    assert execution.graph_trace == ["afe", "llm_classifier", "ac"]


def test_response_graph_detects_sensitive_output() -> None:
    execution = validate_response_with_agents(
        response_text="You can use this internal URL: https://portal.internal/audit"
    )
    decision = execution.decision
    assert decision.action in {"WARN", "ANONYMIZE", "BLOCK"}
    assert len(decision.detections) >= 1
    assert execution.graph_trace == ["avs", "llm_classifier", "ac"]
