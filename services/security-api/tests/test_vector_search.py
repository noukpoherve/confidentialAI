"""Tests for Qdrant-backed vector shortcut before the LLM classifier."""

from unittest.mock import patch

import pytest

from app.agents import vector_search_node
from app.core.config import settings
from app.core.policy_engine import PolicyDecision
from app.stores import vector_store


def _sample_decision(action: str = "ALLOW", risk_score: int = 5) -> PolicyDecision:
    return PolicyDecision(
        action=action,
        risk_score=risk_score,
        reasons=[],
        detections=[],
        redactions=[],
        created_at="2025-01-01T00:00:00Z",
    )


def test_vector_search_disabled_no_skip(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "vector_search_enabled", False)
    d, skip = vector_search_node.run_prompt_vector_search(
        "hello world", _sample_decision()
    )
    assert skip is False
    assert d.action == "ALLOW"


def test_vector_search_hit_sets_skip_and_escalates(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "vector_search_enabled", True)

    def _fake_search(_text: str):
        return (0.91, {"action": "BLOCK", "riskScore": 88})

    monkeypatch.setattr(vector_search_node, "search_similar_incident", _fake_search)
    d, skip = vector_search_node.run_prompt_vector_search(
        "sensitive prompt fragment", _sample_decision()
    )
    assert skip is True
    assert d.action == "BLOCK"
    assert d.risk_score >= 75
    assert any(x.get("type") == "VECTOR_SIMILARITY" for x in d.detections)


def test_vector_search_no_match_does_not_skip(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "vector_search_enabled", True)
    monkeypatch.setattr(vector_search_node, "search_similar_incident", lambda _t: None)
    d, skip = vector_search_node.run_prompt_vector_search("unique text", _sample_decision())
    assert skip is False
    assert d.action == "ALLOW"


def test_maybe_index_skips_non_prompt_incidents(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "vector_search_enabled", True)
    with patch.object(vector_store, "upsert_incident_vector", return_value=True) as mock_upsert:
        vector_store.maybe_index_incident_from_payload(
            "text",
            {"incidentType": "RESPONSE", "action": "BLOCK", "requestId": "r1", "riskScore": 80},
        )
    mock_upsert.assert_not_called()


def test_maybe_index_calls_upsert_for_prompt_block(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "vector_search_enabled", True)
    with patch.object(vector_store, "upsert_incident_vector", return_value=True) as mock_upsert:
        vector_store.maybe_index_incident_from_payload(
            "prompt body",
            {
                "incidentType": "PROMPT",
                "action": "WARN",
                "requestId": "r2",
                "riskScore": 50,
            },
        )
    mock_upsert.assert_called_once()
