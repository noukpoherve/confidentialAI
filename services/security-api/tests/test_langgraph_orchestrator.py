from app.core.config import settings
from app.agents.orchestrator import analyze_prompt_with_agents, validate_response_with_agents


def test_prompt_graph_returns_policy_decision() -> None:
    execution = analyze_prompt_with_agents(
        prompt="My API key is sk_1234567890ABCDEFGHIJKLMNOP", user_consent=False
    )
    decision = execution.decision
    assert decision.action == "BLOCK"
    assert decision.risk_score >= 40
    # BLOCK decisions skip the toxicity analyzer — trace ends at "ac".
    assert execution.graph_trace == ["afe", "vector_search", "llm_classifier", "ac"]


def test_response_graph_detects_harmful_url_output() -> None:
    """AVS regex layer flags known harmful URLs without treating internal URLs as PII."""
    execution = validate_response_with_agents(
        response_text="See https://www.pornhub.com/video?id=1 for an example."
    )
    decision = execution.decision
    assert decision.action in {"WARN", "ANONYMIZE", "BLOCK"}
    assert any(d["type"] == "HARMFUL_URL" for d in decision.detections)
    assert execution.graph_trace[:3] == ["avs", "llm_classifier", "ac"]


def test_avs_ignores_internal_url_without_llm_escalation() -> None:
    """Internal URLs are out of scope for AVS; without LLM key the graph stays ALLOW."""
    execution = validate_response_with_agents(
        response_text="You can use this internal URL: https://portal.internal/audit"
    )
    decision = execution.decision
    assert decision.action == "ALLOW"
    assert execution.graph_trace[:3] == ["avs", "llm_classifier", "ac"]


def test_avs_detects_toxic_language_in_response() -> None:
    """Profanity in model output is scored on the AVS moral regex layer."""
    execution = validate_response_with_agents(
        response_text=(
            "That is a terrible idea and you are a fucking idiot for suggesting it, "
            "please reconsider your approach to this problem carefully."
        )
    )
    decision = execution.decision
    assert decision.action in {"WARN", "ANONYMIZE", "BLOCK"}
    assert any(d["type"] == "TOXIC_LANGUAGE" for d in decision.detections)
    assert execution.graph_trace[:3] == ["avs", "llm_classifier", "ac"]


def test_prompt_graph_samsung_scenario() -> None:
    """
    Validates the Samsung 2023 combined-leak scenario: a single prompt
    contains source code, an API key, an internal URL and an email address.
    The cumulative risk scoring must produce a BLOCK decision with at least
    3 distinct detection categories.
    """
    samsung_like_prompt = (
        "Can you review our internal auth module?\n"
        "import os\n"
        "from config import settings\n"
        "\n"
        "SECRET_KEY = 'sk_abc123DEFGHIJKLMNOP'\n"
        "DB_HOST = 'https://db-prod.internal/api/v2'\n"
        "\n"
        "Contact john.doe@corp.example.com if anything looks wrong.\n"
        "The audit covers the Q2 security review for project Phoenix."
    )
    execution = analyze_prompt_with_agents(prompt=samsung_like_prompt, user_consent=False)
    decision = execution.decision

    assert decision.action == "BLOCK"
    assert decision.risk_score >= 70

    detected_types = {d["type"] for d in decision.detections}
    # Expects at minimum: SOURCE_CODE, API_KEY, INTERNAL_URL, EMAIL
    assert len(detected_types) >= 3


def test_prompt_graph_semantic_detection_via_llm_classifier(monkeypatch) -> None:
    """
    Validates Gap 1 from the thesis (Chapter 2): the LLM classifier catches
    semantically sensitive content that the deterministic regex layer misses.
    Example: employee name + badge number + location — no regex pattern fires,
    but the combination is clearly PII and the LLM classifier should flag it.
    """
    from app.agents import llm_classifier

    def _fake_classifier(text, response_moral=False):
        return {
            "sensitive": True,
            "severity": "medium",
            "confidence": 0.82,
            "categories": ["personal_identification", "employee_data"],
            "reason": (
                "Contains employee name, badge number and physical location "
                "— a PII combination not individually detectable by regex."
            ),
        }

    monkeypatch.setattr(llm_classifier, "_call_classifier", _fake_classifier)

    # This prompt triggers zero regex hits — relies entirely on semantic analysis.
    ambiguous_prompt = (
        "Mon collègue qui travaille au 3e étage s'appelle Jean Dupont, "
        "son numéro de badge est 4521"
    )
    execution = analyze_prompt_with_agents(prompt=ambiguous_prompt, user_consent=False)
    decision = execution.decision

    assert decision.action != "ALLOW", (
        "Semantic PII combination should not be allowed through — "
        "the LLM classifier layer must escalate the decision."
    )
    assert any(d["type"] == "LLM_SENSITIVE" for d in decision.detections)
    assert any("LLM classifier:" in r for r in decision.reasons)


def test_prompt_graph_skips_llm_classifier_on_vector_cache_hit(monkeypatch) -> None:
    """Strong Qdrant match short-circuits the LLM classifier node."""
    monkeypatch.setattr(settings, "vector_search_enabled", True)
    from app.agents import vector_search_node

    monkeypatch.setattr(
        vector_search_node,
        "search_similar_incident",
        lambda _text: (0.95, {"action": "BLOCK", "riskScore": 90}),
    )
    execution = analyze_prompt_with_agents(
        prompt="benign-looking text that still matches a past incident",
        user_consent=False,
    )
    assert "llm_classifier" not in execution.graph_trace
    assert execution.graph_trace == ["afe", "vector_search", "ac"]
    assert execution.decision.action == "BLOCK"
