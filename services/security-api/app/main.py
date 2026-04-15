import logging
import logging.config
from urllib.parse import urlparse

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.routes_analyze import router as analyze_router
from app.api.routes_auth import router as auth_router
from app.api.routes_site_signals import router as site_signals_router
from app.api.routes_user_settings import router as user_settings_router
from app.core.config import settings
from app.core.rate_limiter import limiter

# ── Structured logging ────────────────────────────────────────────────────────
logging.config.dictConfig(
    {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "json": {
                "format": '{"time":"%(asctime)s","level":"%(levelname)s","logger":"%(name)s","msg":%(message)s}',
                "datefmt": "%Y-%m-%dT%H:%M:%SZ",
            },
            "dev": {
                "format": "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
                "datefmt": "%H:%M:%S",
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "dev" if settings.app_env in {"dev", "development", "local"} else "json",
            }
        },
        "root": {"level": "INFO", "handlers": ["console"]},
        # Reduce noise from third-party libs
        "loggers": {
            "httpx": {"level": "WARNING"},
            "pymongo": {"level": "WARNING"},
            "uvicorn.access": {"level": "WARNING"},
        },
    }
)

logger = logging.getLogger(__name__)

app = FastAPI(title=settings.api_name, version=settings.api_version)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)

# ── Rate limiting error handler ───────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.include_router(analyze_router)
app.include_router(auth_router)
app.include_router(user_settings_router)
app.include_router(site_signals_router)


@app.on_event("startup")
def _startup_checks() -> None:
    """Validate critical configuration on boot; block production start with insecure defaults."""
    _DEFAULT_SECRET = "change-me-for-production-with-at-least-32-chars"
    if settings.auth_secret_key == _DEFAULT_SECRET:
        if settings.app_env not in {"dev", "development", "local"}:
            logger.critical(
                '"AUTH_SECRET_KEY is still the default insecure value — '
                "refusing to start in non-dev environment. "
                'Set AUTH_SECRET_KEY to a random 32+ character secret."'
            )
            raise RuntimeError(
                "Insecure AUTH_SECRET_KEY in production. Set AUTH_SECRET_KEY env var."
            )
        logger.warning(
            '"AUTH_SECRET_KEY is using the default value — '
            'acceptable for local dev only, MUST be changed before deployment."'
        )

    if settings.app_env not in {"dev", "development", "local"}:
        if not settings.llm_classifier_api_key:
            logger.warning('"LLM_CLASSIFIER_API_KEY not set — LLM classifier and image moderation disabled."')

    logger.info(
        '"API started env=%s llm_enabled=%s vector_search=%s spacy=%s"',
        settings.app_env,
        settings.llm_classifier_enabled,
        settings.vector_search_enabled,
        settings.spacy_enabled,
    )


@app.get("/health")
def health() -> dict:
    """
    Basic liveness + non-secret LLM config so you can see what this process actually uses
    (shell env overrides .env — restart uvicorn after changing .env).
    """
    base = settings.llm_classifier_api_base
    host = urlparse(base).netloc or base
    return {
        "status": "ok",
        "llmClassifierEnabled": settings.llm_classifier_enabled,
        "llmKeyConfigured": bool(settings.llm_classifier_api_key),
        "llmApiHost": host,
        "llmModel": settings.llm_classifier_model,
    }
