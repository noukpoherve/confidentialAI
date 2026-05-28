"""
Unit tests for app/core/error_tracking.py.

No network calls are made: sentry_sdk.init is monkeypatched in every test
that reaches the initialization path.
"""

from app.core.error_tracking import (
    _filter_sensitive_event,
    _filter_sensitive_transaction,
    init_sentry,
)

# ── _filter_sensitive_event ───────────────────────────────────────────────────


def test_filter_event_redacts_sensitive_headers():
    event = {
        "request": {
            "headers": {
                "Authorization": "Bearer secret-token",
                "Content-Type": "application/json",
                "api_key": "my-api-key",
            }
        }
    }
    result = _filter_sensitive_event(event, {})

    assert result["request"]["headers"]["Authorization"] == "[FILTERED]"
    assert result["request"]["headers"]["api_key"] == "[FILTERED]"
    # Non-sensitive header is preserved
    assert result["request"]["headers"]["Content-Type"] == "application/json"


def test_filter_event_removes_request_body_data():
    event = {
        "request": {
            "headers": {},
            "data": '{"prompt": "user message with PII"}',
        }
    }
    result = _filter_sensitive_event(event, {})

    assert result["request"]["data"] == "[PROMPT CONTENT NOT SENT TO GLITCHTIP]"


def test_filter_event_redacts_sensitive_extra_keys():
    event = {
        "extra": {
            "llm_api_key": "sk-secret",
            "user_agent": "Mozilla/5.0",
            "auth_secret_key": "my-jwt-secret",
        }
    }
    result = _filter_sensitive_event(event, {})

    assert result["extra"]["llm_api_key"] == "[FILTERED]"
    assert result["extra"]["auth_secret_key"] == "[FILTERED]"
    # Non-sensitive key preserved
    assert result["extra"]["user_agent"] == "Mozilla/5.0"


def test_filter_event_removes_runtime_env_from_contexts():
    event = {
        "contexts": {
            "runtime": {
                "name": "CPython",
                "version": "3.11",
                "env": {"SECRET_KEY": "should-be-removed"},
            }
        }
    }
    result = _filter_sensitive_event(event, {})

    assert "env" not in result["contexts"]["runtime"]
    assert result["contexts"]["runtime"]["name"] == "CPython"


def test_filter_event_passthrough_when_no_sensitive_data():
    event = {
        "message": "Something went wrong",
        "level": "error",
    }
    result = _filter_sensitive_event(event, {})

    assert result["message"] == "Something went wrong"
    assert result["level"] == "error"


def test_filter_event_handles_empty_event():
    result = _filter_sensitive_event({}, {})
    assert result == {}


def test_filter_event_request_with_no_data_key():
    # Only headers, no 'data' key — should not add the placeholder
    event = {"request": {"headers": {"X-Custom": "value"}}}
    result = _filter_sensitive_event(event, {})
    assert "data" not in result["request"]


def test_filter_event_contexts_without_runtime():
    event = {"contexts": {"device": {"brand": "Apple"}}}
    result = _filter_sensitive_event(event, {})
    assert result["contexts"]["device"]["brand"] == "Apple"


# ── _filter_sensitive_transaction ────────────────────────────────────────────


def test_filter_transaction_returns_transaction_unchanged():
    txn = {"op": "http.server", "name": "GET /health", "duration": 0.05}
    result = _filter_sensitive_transaction(txn, {})
    assert result is txn


def test_filter_transaction_with_empty_dict():
    result = _filter_sensitive_transaction({}, {})
    assert result == {}


# ── init_sentry ───────────────────────────────────────────────────────────────


def test_init_sentry_calls_sdk_init(monkeypatch):
    """init_sentry should call sentry_sdk.init with correct arguments."""
    import sentry_sdk

    captured: dict = {}

    def fake_init(**kwargs):
        captured.update(kwargs)

    monkeypatch.setattr(sentry_sdk, "init", fake_init)

    init_sentry(
        dsn="https://test@glitchtip.example.com/1",
        environment="staging",
        release="0.2.0",
    )

    assert captured["dsn"] == "https://test@glitchtip.example.com/1"
    assert captured["environment"] == "staging"
    assert captured["release"] == "0.2.0"
    assert "before_send" in captured
    assert "before_send_transaction" in captured


def test_init_sentry_uses_default_release(monkeypatch):
    import sentry_sdk

    captured: dict = {}
    monkeypatch.setattr(sentry_sdk, "init", lambda **kw: captured.update(kw))

    init_sentry(dsn="https://test@example.com/1", environment="production")

    assert captured.get("release") == "0.1.0"


def test_init_sentry_does_not_raise_on_sdk_exception(monkeypatch):
    """A failing sentry_sdk.init must never crash the API startup."""
    import sentry_sdk

    def broken_init(**kwargs):
        raise RuntimeError("network error")

    monkeypatch.setattr(sentry_sdk, "init", broken_init)

    # Must not raise
    init_sentry(dsn="https://test@example.com/1", environment="production")
