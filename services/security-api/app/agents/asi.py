import json

import httpx

from app.core.config import settings


def notify_critical_incident(incident: dict) -> None:
    """
    ASI (Alerting and Surveillance Intelligence) notification hook.
    Sends Telegram alerts for configured critical actions.
    """
    if not settings.telegram_alerts_enabled:
        return
    if incident.get("action") not in settings.telegram_alert_actions:
        return
    if not settings.telegram_bot_token or not settings.telegram_chat_id:
        return

    message = {
        "title": "Confidential-Agent Incident Alert",
        "requestId": incident.get("requestId"),
        "platform": incident.get("platform"),
        "action": incident.get("action"),
        "riskScore": incident.get("riskScore"),
        "reasons": incident.get("reasons", []),
    }
    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    payload = {
        "chat_id": settings.telegram_chat_id,
        "text": json.dumps(message, ensure_ascii=True),
    }

    # Do not block API flow on external notification failures.
    try:
        with httpx.Client(timeout=2.0) as client:
            client.post(url, json=payload)
    except Exception:
        pass
