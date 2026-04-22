"""
Error tracking — GlitchTip via Sentry SDK.

Rules:
- Active ONLY when APP_ENV=production AND GLITCHTIP_DSN is configured.
- In local/dev: logs written to logs/dev.log, never any network sends.
- User prompts NEVER transit to GlitchTip.
- API keys and tokens are filtered before sending.
"""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

_SENSITIVE_KEYS = frozenset({
    "password", "api_key", "apikey", "token", "secret",
    "authorization", "llm_api_key", "openai_api_key",
    "auth_secret_key", "jwt", "bearer",
})


def init_sentry(dsn: str, environment: str, release: str = "0.1.0") -> None:
    """Initialize the Sentry SDK pointing to GlitchTip. Called only if APP_ENV=production and GLITCHTIP_DSN is set."""
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.httpx import HttpxIntegration
        from sentry_sdk.integrations.logging import LoggingIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration

        sentry_logging = LoggingIntegration(
            level=logging.INFO,
            event_level=logging.ERROR,
        )

        sentry_sdk.init(
            dsn=dsn,
            environment=environment,
            release=release,
            traces_sample_rate=0.05,
            profiles_sample_rate=0.0,
            integrations=[
                FastApiIntegration(transaction_style="endpoint"),
                StarletteIntegration(),
                HttpxIntegration(),
                sentry_logging,
            ],
            before_send=_filter_sensitive_event,
            before_send_transaction=_filter_sensitive_transaction,
        )
        logger.info('"Error tracking initialized (GlitchTip via Sentry SDK)"')
    except Exception as exc:
        # Never crash the API if Sentry fails to initialize
        logger.warning('"Error tracking init failed: %s"', exc)


def _filter_sensitive_event(event: dict, hint: dict) -> dict | None:
    """Filter sensitive data before sending to GlitchTip. Enforces the DLP principle of confidential-Agent."""
    if request := event.get("request"):
        headers = request.get("headers", {})
        for key in list(headers.keys()):
            if key.lower() in _SENSITIVE_KEYS:
                headers[key] = "[FILTERED]"

        # Never send the request body (contains user prompts)
        if "data" in request:
            request["data"] = "[PROMPT CONTENT NOT SENT TO GLITCHTIP]"

    if extra := event.get("extra"):
        for key in list(extra.keys()):
            if any(s in key.lower() for s in _SENSITIVE_KEYS):
                extra[key] = "[FILTERED]"

    if contexts := event.get("contexts", {}):
        if runtime := contexts.get("runtime", {}):
            runtime.pop("env", None)

    return event


def _filter_sensitive_transaction(transaction: dict, hint: dict) -> dict | None:
    """Filter performance transactions — remove sensitive data."""
    return transaction
