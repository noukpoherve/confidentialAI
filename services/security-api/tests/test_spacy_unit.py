"""
Unit tests for app/core/spacy_detectors.py.

All tests run with spaCy *disabled* (SPACY_ENABLED=false is the CI default)
so no language model download is required. The tests exercise the early-return
and _load_error paths without importing the optional spaCy library.

IMPORTANT: every test that touches module-level cache (_nlp, _matcher, _load_error)
uses monkeypatch.setattr so pytest automatically restores the original value after
the test finishes. Direct assignment (m._nlp = ...) without monkeypatch would leak
state into later test files and cause TypeError in workflow tests.
"""

import pytest

# ── Shared fixture ────────────────────────────────────────────────────────────


@pytest.fixture(autouse=True)
def reset_spacy_module_state(monkeypatch):
    """
    Reset the three module-level cache variables before (and after) every test
    in this file via monkeypatch so state never leaks to other test modules.
    """
    import app.core.spacy_detectors as m

    monkeypatch.setattr(m, "_nlp", None)
    monkeypatch.setattr(m, "_matcher", None)
    monkeypatch.setattr(m, "_load_error", None)
    yield
    # monkeypatch teardown restores the original values automatically


# ── is_spacy_legal_hr_ready ───────────────────────────────────────────────────


def test_is_spacy_legal_hr_ready_returns_false_when_disabled(monkeypatch):
    """When SPACY_ENABLED=false, the function must return False."""
    from app.core import config

    monkeypatch.setattr(config.settings, "spacy_enabled", False)

    from app.core.spacy_detectors import is_spacy_legal_hr_ready

    assert is_spacy_legal_hr_ready() is False


# ── collect_spacy_legal_hr_spans ──────────────────────────────────────────────


def test_collect_spans_returns_empty_when_disabled(monkeypatch):
    """When spaCy is disabled, collect_spacy_legal_hr_spans returns []."""
    from app.core import config

    monkeypatch.setattr(config.settings, "spacy_enabled", False)

    from app.core.spacy_detectors import collect_spacy_legal_hr_spans

    result = collect_spacy_legal_hr_spans("sick leaves and medical records", [])
    assert result == []


def test_collect_spans_returns_empty_for_empty_text(monkeypatch):
    """Blank text → empty list even if spaCy were enabled."""
    from app.core import config

    monkeypatch.setattr(config.settings, "spacy_enabled", False)

    from app.core.spacy_detectors import collect_spacy_legal_hr_spans

    assert collect_spacy_legal_hr_spans("   ", []) == []
    assert collect_spacy_legal_hr_spans("", []) == []


# ── _ensure_matcher ───────────────────────────────────────────────────────────


def test_ensure_matcher_returns_none_when_disabled(monkeypatch):
    """_ensure_matcher returns (None, None) when spacy_enabled=False."""
    from app.core import config

    monkeypatch.setattr(config.settings, "spacy_enabled", False)

    from app.core.spacy_detectors import _ensure_matcher

    nlp, matcher = _ensure_matcher()
    assert nlp is None
    assert matcher is None


def test_ensure_matcher_returns_none_after_load_error(monkeypatch):
    """If _load_error is already set, _ensure_matcher returns (None, None)."""
    import app.core.spacy_detectors as m
    from app.core import config

    monkeypatch.setattr(config.settings, "spacy_enabled", True)
    # Simulate a prior load failure — use monkeypatch so it's undone after the test
    monkeypatch.setattr(m, "_load_error", "model not found")

    from app.core.spacy_detectors import _ensure_matcher

    nlp, matcher = _ensure_matcher()
    assert nlp is None
    assert matcher is None


def test_ensure_matcher_sets_load_error_when_spacy_unavailable(monkeypatch):
    """
    When spacy_enabled=True but the import/load fails,
    _load_error is populated and (None, None) is returned.
    """
    import builtins

    import app.core.spacy_detectors as m
    from app.core import config

    monkeypatch.setattr(config.settings, "spacy_enabled", True)
    monkeypatch.setattr(config.settings, "spacy_model", "nonexistent_model_xyz")

    # Force the spacy import inside _ensure_matcher to raise ImportError
    real_import = builtins.__import__

    def fake_import(name, *args, **kwargs):
        if name == "spacy":
            raise ImportError("spacy not installed")
        return real_import(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", fake_import)

    from app.core.spacy_detectors import _ensure_matcher

    nlp, matcher = _ensure_matcher()
    assert nlp is None
    assert matcher is None
    # _load_error must have been set — monkeypatch will restore None after test
    assert m._load_error is not None


def test_ensure_matcher_returns_cached_values(monkeypatch):
    """When _nlp and _matcher are already set, they are returned without re-importing.

    Uses monkeypatch.setattr for both fakes so module state is fully restored
    after this test and cannot pollute subsequent test files.
    """
    import app.core.spacy_detectors as m
    from app.core import config

    monkeypatch.setattr(config.settings, "spacy_enabled", True)

    # Build callable fakes so if they accidentally leak the error will be clear
    class FakeNlp:
        pass

    class FakeMatcher:
        pass

    fake_nlp = FakeNlp()
    fake_matcher = FakeMatcher()

    # Use monkeypatch — NOT direct assignment — so teardown is guaranteed
    monkeypatch.setattr(m, "_nlp", fake_nlp)
    monkeypatch.setattr(m, "_matcher", fake_matcher)

    from app.core.spacy_detectors import _ensure_matcher

    nlp, matcher = _ensure_matcher()
    assert nlp is fake_nlp
    assert matcher is fake_matcher
