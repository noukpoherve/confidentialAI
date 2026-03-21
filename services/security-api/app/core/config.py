import os

from dotenv import load_dotenv
from pydantic import BaseModel

# Load .env file if present — allows running the server without manually
# exporting environment variables in the shell.
# Shell-level exports always take precedence over .env values.
load_dotenv()

# Resolve the LLM API key before building the settings instance so that
# llm_classifier_enabled can default to True whenever a key is present.
# This avoids the common mistake of setting a key but forgetting the flag.
_llm_api_key: str = os.getenv("LLM_CLASSIFIER_API_KEY", os.getenv("OPENAI_API_KEY", ""))
_llm_enabled_default: str = "true" if _llm_api_key else "false"


class Settings(BaseModel):
    """
    API configuration loaded from environment variables.
    Copy .env.example → .env and fill in your values.

    LLM Classifier activation rules:
    - If OPENAI_API_KEY (or LLM_CLASSIFIER_API_KEY) is set, the LLM classifier
      is enabled automatically — no need to also set LLM_CLASSIFIER_ENABLED.
    - Set LLM_CLASSIFIER_ENABLED=false to explicitly disable it even with a key.
    """

    api_name: str = "confidential-agent-security-api"
    api_version: str = "0.1.0"
    max_prompt_chars: int = 20_000
    enable_strict_block_on_secret: bool = True
    mongodb_uri: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    mongodb_db_name: str = os.getenv("MONGODB_DB_NAME", "confidential_agent")
    mongodb_incidents_collection: str = os.getenv("MONGODB_INCIDENTS_COLLECTION", "incidents")
    incidents_list_limit: int = int(os.getenv("INCIDENTS_LIST_LIMIT", "100"))
    telegram_alerts_enabled: bool = os.getenv("TELEGRAM_ALERTS_ENABLED", "false").lower() == "true"
    telegram_bot_token: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    telegram_chat_id: str = os.getenv("TELEGRAM_CHAT_ID", "")
    telegram_alert_actions: list[str] = [
        action.strip().upper()
        for action in os.getenv("TELEGRAM_ALERT_ACTIONS", "BLOCK,WARN").split(",")
        if action.strip()
    ]
    # LLM Classifier — auto-enabled when a key is present.
    llm_classifier_enabled: bool = (
        os.getenv("LLM_CLASSIFIER_ENABLED", _llm_enabled_default).lower() == "true"
    )
    llm_classifier_api_base: str = os.getenv("LLM_CLASSIFIER_API_BASE", "https://api.openai.com/v1")
    llm_classifier_model: str = os.getenv("LLM_CLASSIFIER_MODEL", "gpt-4.1-mini")
    llm_classifier_api_key: str = _llm_api_key
    llm_classifier_timeout_seconds: float = float(os.getenv("LLM_CLASSIFIER_TIMEOUT_SECONDS", "2.5"))
    auth_secret_key: str = os.getenv(
        "AUTH_SECRET_KEY", "change-me-for-production-with-at-least-32-chars"
    )
    auth_algorithm: str = os.getenv("AUTH_ALGORITHM", "HS256")
    auth_access_token_minutes: int = int(os.getenv("AUTH_ACCESS_TOKEN_MINUTES", "120"))
    users_collection: str = os.getenv("MONGODB_USERS_COLLECTION", "users")
    user_settings_collection: str = os.getenv("MONGODB_USER_SETTINGS_COLLECTION", "user_settings")
    site_signals_collection: str = os.getenv("MONGODB_SITE_SIGNALS_COLLECTION", "site_signals")
    site_signals_list_limit: int = int(os.getenv("SITE_SIGNALS_LIST_LIMIT", "200"))


settings = Settings()
