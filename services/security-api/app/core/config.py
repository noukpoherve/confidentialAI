import os

from pydantic import BaseModel


class Settings(BaseModel):
    """
    Minimal API configuration.
    In a future version, this should be backed by environment variables
    and a proper secret-management layer.
    """

    api_name: str = "confidential-agent-security-api"
    api_version: str = "0.1.0"
    max_prompt_chars: int = 20_000
    enable_strict_block_on_secret: bool = True
    mongodb_uri: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    mongodb_db_name: str = os.getenv("MONGODB_DB_NAME", "confidential_agent")
    mongodb_incidents_collection: str = os.getenv("MONGODB_INCIDENTS_COLLECTION", "incidents")
    incidents_list_limit: int = int(os.getenv("INCIDENTS_LIST_LIMIT", "100"))


settings = Settings()
