from types import SimpleNamespace

from app.agents.afe import run_afe
from app.agents.orchestrator import analyze_prompt_with_agents


def test_workflow_toxic_plus_sensitive_still_returns_rephrase_suggestions(monkeypatch) -> None:
    """
    Workflow contract:
    - Text contains toxicity + sensitive data (email/phone).
    - Even if toxicity LLM is unavailable, user still gets rephrase suggestions.
    """
    from app.agents import toxicity_analyzer

    monkeypatch.setattr(toxicity_analyzer, "_call_toxicity_llm", lambda _text: None)

    execution = analyze_prompt_with_agents(
        prompt="fuck you, contact me at bob@example.com or +33 6 12 34 56 78",
        user_consent=False,
    )
    decision = execution.decision

    # Security decision should remain enforced (not ALLOW) due to sensitive data.
    assert decision.action in {"WARN", "ANONYMIZE", "BLOCK", "SUGGEST_REPHRASE"}
    assert len(decision.suggestions) == 3
    assert any(d["type"] == "TOXIC_LANGUAGE" for d in decision.detections)


def test_workflow_person_false_positive_filtered_for_lowercase_insult(monkeypatch) -> None:
    """
    Workflow contract:
    - Lowercase profanity phrase like 'fuck you' must not become PERSONNE.
    """
    from app.agents import afe

    class FakeEnt:
        def __init__(self, text: str, label_: str, start: int, start_char: int, end_char: int) -> None:
            self.text = text
            self.label_ = label_
            self.start = start
            self.start_char = start_char
            self.end_char = end_char

    class FakeDoc:
        def __init__(self, ents):
            self.ents = ents

    class FakeNlp:
        def __call__(self, _prompt: str):
            # Force a PER entity exactly where the false positive usually appears.
            return FakeDoc([FakeEnt("fuck you", "PERSON", start=0, start_char=0, end_char=8)])

    monkeypatch.setattr(afe, "_detect_language_code", lambda _text: "en")
    monkeypatch.setattr(afe, "_nlp_for_ner", lambda _lang: FakeNlp())

    decision = run_afe(prompt="fuck you", user_consent=False)
    detected_types = {d["type"] for d in decision.detections}

    assert "PERSONNE" not in detected_types


def test_workflow_person_name_still_detected_when_capitalized(monkeypatch) -> None:
    """
    Workflow contract:
    - Real person-like entity with capitalization should remain detectable.
    """
    from app.agents import afe

    class FakeEnt:
        def __init__(self, text: str, label_: str, start: int, start_char: int, end_char: int) -> None:
            self.text = text
            self.label_ = label_
            self.start = start
            self.start_char = start_char
            self.end_char = end_char

    fake_doc = SimpleNamespace(
        ents=[FakeEnt("John Doe", "PERSON", start=1, start_char=7, end_char=15)]
    )
    monkeypatch.setattr(afe, "_detect_language_code", lambda _text: "en")
    monkeypatch.setattr(afe, "_nlp_for_ner", lambda _lang: (lambda _prompt: fake_doc))

    decision = run_afe(prompt="hello John Doe", user_consent=False)
    detected_types = {d["type"] for d in decision.detections}

    assert "PERSONNE" in detected_types
