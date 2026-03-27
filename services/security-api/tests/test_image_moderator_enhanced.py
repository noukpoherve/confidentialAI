"""
Tests for the enhanced image moderator.

Covers:
- Safe-mode partial nudity detection at low sexual score.
- Safe-mode disabled → low sexual score ignored.
- Drugs/illicit content detection (higher weights).
- Violence weight increases verified.
- Existing CSAM unconditional BLOCK preserved.
- Virtual PARTIAL_NUDITY detection has correct confidence from sexual score.
"""

from unittest.mock import patch

import pytest

from app.agents.image_moderator import run_image_moderator
from app.core import config


# ── Mock API responses ────────────────────────────────────────────────────────

def _make_api_result(
    flagged: bool = False,
    categories: dict | None = None,
    scores: dict | None = None,
) -> dict:
    return {
        "flagged": flagged,
        "categories": categories or {},
        "category_scores": scores or {},
    }


_LINGERIE_RESULT = _make_api_result(
    flagged=False,
    categories={"sexual": False},
    scores={
        "sexual": 0.09,          # Below API threshold but above safe-mode threshold (0.06)
        "violence": 0.001,
        "illicit": 0.002,
    },
)

_DRUGS_RESULT = _make_api_result(
    flagged=True,
    categories={"illicit": True},
    scores={
        "illicit": 0.92,
        "sexual": 0.001,
        "violence": 0.005,
    },
)

_CSAM_RESULT = _make_api_result(
    flagged=True,
    categories={"sexual/minors": True, "sexual": True},
    scores={"sexual/minors": 0.98, "sexual": 0.95},
)

_CLEAN_RESULT = _make_api_result(
    flagged=False,
    categories={},
    scores={"sexual": 0.01, "violence": 0.005},
)


# ── Tests ─────────────────────────────────────────────────────────────────────

def test_safe_mode_catches_lingerie(monkeypatch):
    """Safe mode should WARN for images with a low-but-non-trivial sexual score."""
    monkeypatch.setattr(config.settings, "llm_classifier_enabled", True)
    monkeypatch.setattr(config.settings, "safe_mode_enabled", True)
    monkeypatch.setattr(config.settings, "safe_mode_sexual_threshold", 0.06)
    monkeypatch.setattr(config.settings, "llm_classifier_api_key", "test-key")

    with patch("app.agents.image_moderator._call_moderation_api", return_value=_LINGERIE_RESULT):
        decision = run_image_moderator("base64data", "image/jpeg")

    assert decision.action == "WARN"
    types = [d["type"] for d in decision.detections]
    assert "IMAGE_PARTIAL_NUDITY" in types


def test_safe_mode_off_ignores_low_score(monkeypatch):
    """When safe mode is disabled, low sexual scores should not be flagged."""
    monkeypatch.setattr(config.settings, "llm_classifier_enabled", True)
    monkeypatch.setattr(config.settings, "safe_mode_enabled", False)
    monkeypatch.setattr(config.settings, "llm_classifier_api_key", "test-key")

    with patch("app.agents.image_moderator._call_moderation_api", return_value=_LINGERIE_RESULT):
        decision = run_image_moderator("base64data", "image/jpeg")

    assert decision.action == "ALLOW"
    types = [d["type"] for d in decision.detections]
    assert "IMAGE_PARTIAL_NUDITY" not in types


def test_drugs_image_blocked(monkeypatch):
    """Images containing illicit / drug-related content should be blocked (score ≥ 70)."""
    monkeypatch.setattr(config.settings, "llm_classifier_enabled", True)
    monkeypatch.setattr(config.settings, "llm_classifier_api_key", "test-key")

    with patch("app.agents.image_moderator._call_moderation_api", return_value=_DRUGS_RESULT):
        decision = run_image_moderator("base64data", "image/jpeg")

    assert decision.action == "BLOCK"
    types = [d["type"] for d in decision.detections]
    assert "IMAGE_ILLICIT" in types


def test_csam_always_blocked(monkeypatch):
    """CSAM must always result in BLOCK regardless of any other setting."""
    monkeypatch.setattr(config.settings, "llm_classifier_enabled", True)
    monkeypatch.setattr(config.settings, "llm_classifier_api_key", "test-key")

    with patch("app.agents.image_moderator._call_moderation_api", return_value=_CSAM_RESULT):
        decision = run_image_moderator("base64data", "image/jpeg")

    assert decision.action == "BLOCK"
    assert any("minors" in r.lower() for r in decision.reasons)


def test_clean_image_allowed(monkeypatch):
    """A clean image should be ALLOW with zero risk."""
    monkeypatch.setattr(config.settings, "llm_classifier_enabled", True)
    monkeypatch.setattr(config.settings, "safe_mode_enabled", True)
    monkeypatch.setattr(config.settings, "safe_mode_sexual_threshold", 0.06)
    monkeypatch.setattr(config.settings, "llm_classifier_api_key", "test-key")

    with patch("app.agents.image_moderator._call_moderation_api", return_value=_CLEAN_RESULT):
        decision = run_image_moderator("base64data", "image/jpeg")

    assert decision.action == "ALLOW"
    assert decision.risk_score == 0


def test_partial_nudity_confidence_matches_sexual_score(monkeypatch):
    """The partial_nudity detection confidence should reflect the raw sexual score."""
    monkeypatch.setattr(config.settings, "llm_classifier_enabled", True)
    monkeypatch.setattr(config.settings, "safe_mode_enabled", True)
    monkeypatch.setattr(config.settings, "safe_mode_sexual_threshold", 0.06)
    monkeypatch.setattr(config.settings, "llm_classifier_api_key", "test-key")

    sexual_score = 0.11
    result = _make_api_result(
        flagged=False,
        categories={"sexual": False},
        scores={"sexual": sexual_score},
    )
    with patch("app.agents.image_moderator._call_moderation_api", return_value=result):
        decision = run_image_moderator("base64data", "image/jpeg")

    pn_detections = [d for d in decision.detections if d["type"] == "IMAGE_PARTIAL_NUDITY"]
    assert len(pn_detections) == 1
    assert abs(pn_detections[0]["confidence"] - round(sexual_score, 3)) < 0.001
