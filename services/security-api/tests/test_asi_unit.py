"""
Unit tests for app/agents/asi.py — Telegram alerting.

No real HTTP calls are made: httpx.Client is monkeypatched throughout.
"""

from unittest.mock import MagicMock, patch

# ── Early-exit paths (no external call) ──────────────────────────────────────


def test_notify_does_nothing_when_telegram_disabled(monkeypatch):
    """When telegram_alerts_enabled=False the function returns immediately."""
    from app.core import config

    monkeypatch.setattr(config.settings, "telegram_alerts_enabled", False)

    with patch("httpx.Client") as mock_client:
        from app.agents.asi import notify_critical_incident

        notify_critical_incident({"action": "BLOCK", "riskScore": 1.0})

    mock_client.assert_not_called()


def test_notify_does_nothing_when_action_not_in_alert_actions(monkeypatch):
    """ALLOW incidents should not trigger a Telegram notification."""
    from app.core import config

    monkeypatch.setattr(config.settings, "telegram_alerts_enabled", True)
    monkeypatch.setattr(config.settings, "telegram_alert_actions", ["BLOCK"])

    with patch("httpx.Client") as mock_client:
        from app.agents.asi import notify_critical_incident

        notify_critical_incident({"action": "ALLOW"})

    mock_client.assert_not_called()


def test_notify_does_nothing_when_bot_token_missing(monkeypatch):
    """Missing bot token → silent return, no HTTP call."""
    from app.core import config

    monkeypatch.setattr(config.settings, "telegram_alerts_enabled", True)
    monkeypatch.setattr(config.settings, "telegram_alert_actions", ["BLOCK"])
    monkeypatch.setattr(config.settings, "telegram_bot_token", "")
    monkeypatch.setattr(config.settings, "telegram_chat_id", "12345")

    with patch("httpx.Client") as mock_client:
        from app.agents.asi import notify_critical_incident

        notify_critical_incident({"action": "BLOCK"})

    mock_client.assert_not_called()


def test_notify_does_nothing_when_chat_id_missing(monkeypatch):
    """Missing chat ID → silent return, no HTTP call."""
    from app.core import config

    monkeypatch.setattr(config.settings, "telegram_alerts_enabled", True)
    monkeypatch.setattr(config.settings, "telegram_alert_actions", ["BLOCK"])
    monkeypatch.setattr(config.settings, "telegram_bot_token", "bot123")
    monkeypatch.setattr(config.settings, "telegram_chat_id", "")

    with patch("httpx.Client") as mock_client:
        from app.agents.asi import notify_critical_incident

        notify_critical_incident({"action": "BLOCK"})

    mock_client.assert_not_called()


# ── HTTP call paths ───────────────────────────────────────────────────────────


def test_notify_sends_post_when_all_conditions_met(monkeypatch):
    """When enabled and conditions match, a POST to Telegram is made."""
    from app.core import config

    monkeypatch.setattr(config.settings, "telegram_alerts_enabled", True)
    monkeypatch.setattr(config.settings, "telegram_alert_actions", ["BLOCK"])
    monkeypatch.setattr(config.settings, "telegram_bot_token", "bot:TOKEN")
    monkeypatch.setattr(config.settings, "telegram_chat_id", "99")

    mock_response = MagicMock()
    mock_http = MagicMock()
    mock_http.__enter__ = MagicMock(return_value=mock_http)
    mock_http.__exit__ = MagicMock(return_value=False)
    mock_http.post = MagicMock(return_value=mock_response)

    with patch("httpx.Client", return_value=mock_http):
        # Reload to pick up fresh monkeypatches on module-level settings
        import importlib

        from app.agents import asi

        importlib.reload(asi)

        asi.notify_critical_incident(
            {
                "action": "BLOCK",
                "requestId": "req-1",
                "platform": "chatgpt.com",
                "riskScore": 0.95,
                "reasons": ["PII detected"],
            }
        )

    mock_http.post.assert_called_once()
    call_kwargs = mock_http.post.call_args
    assert "telegram.org" in call_kwargs[0][0]


def test_notify_swallows_http_exception(monkeypatch):
    """An HTTP error must never propagate and crash the API."""
    from app.core import config

    monkeypatch.setattr(config.settings, "telegram_alerts_enabled", True)
    monkeypatch.setattr(config.settings, "telegram_alert_actions", ["BLOCK"])
    monkeypatch.setattr(config.settings, "telegram_bot_token", "bot:TOKEN")
    monkeypatch.setattr(config.settings, "telegram_chat_id", "99")

    mock_http = MagicMock()
    mock_http.__enter__ = MagicMock(return_value=mock_http)
    mock_http.__exit__ = MagicMock(return_value=False)
    mock_http.post.side_effect = Exception("network error")

    with patch("httpx.Client", return_value=mock_http):
        import importlib

        from app.agents import asi

        importlib.reload(asi)

        # Must not raise
        asi.notify_critical_incident({"action": "BLOCK"})
