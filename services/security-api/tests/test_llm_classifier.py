from app.agents.llm_classifier import run_llm_classifier
from app.core.policy_engine import PolicyDecision


def _base_decision() -> PolicyDecision:
    return PolicyDecision(
        action="ALLOW",
        risk_score=0,
        reasons=["No significant risk detected."],
        detections=[],
        redactions=[],
        created_at="2026-01-01T00:00:00Z",
    )


def test_llm_classifier_escalates_allow_to_warn(monkeypatch) -> None:
    from app.agents import llm_classifier

    monkeypatch.setattr(
        llm_classifier,
        "_call_classifier",
        lambda text: {
            "sensitive": True,
            "severity": "medium",
            "confidence": 0.89,
            "categories": ["credentials", "secret"],
            "reason": "Potential credentials were detected from context.",
        },
    )

    decision = run_llm_classifier("The passphrase might be hidden here.", _base_decision())
    assert decision.action == "WARN"
    assert decision.risk_score >= 40
    assert any(d["type"] == "LLM_SENSITIVE" for d in decision.detections)
    assert any("LLM classifier:" in r for r in decision.reasons)


def test_llm_classifier_fail_open_on_no_result(monkeypatch) -> None:
    from app.agents import llm_classifier

    monkeypatch.setattr(llm_classifier, "_call_classifier", lambda text: None)
    original = _base_decision()
    decision = run_llm_classifier("harmless", original)
    assert decision.action == "ALLOW"
    assert decision.risk_score == 0
