"""
OpenAI-compatible embedding calls + small in-process cache for repeated text.
Retries up to 2 times with exponential backoff on timeout and 429 errors.
"""

from __future__ import annotations

import hashlib
import logging
import time
from collections import OrderedDict

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

_EMBED_CACHE: OrderedDict[str, list[float]] = OrderedDict()
_EMBED_CACHE_MAX = 128

_MAX_RETRIES = 2
_RETRY_BACKOFF_BASE = 0.3  # seconds — doubles each attempt (0.3 → 0.6)


def _cache_key(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def get_embedding(text: str) -> list[float] | None:
    """
    Returns the embedding vector for `text`, or None on failure / empty input.
    Uses LLM_CLASSIFIER_API_BASE + the same API key as other OpenAI calls.
    Retries on transient network errors and rate-limits (HTTP 429).
    """
    stripped = text.strip()
    if not stripped:
        return None
    if not settings.llm_classifier_api_key:
        return None

    key = _cache_key(stripped)
    if key in _EMBED_CACHE:
        _EMBED_CACHE.move_to_end(key)
        return _EMBED_CACHE[key]

    url = f"{settings.llm_classifier_api_base.rstrip('/')}/embeddings"
    headers = {
        "Authorization": f"Bearer {settings.llm_classifier_api_key}",
        "Content-Type": "application/json",
    }
    body: dict = {
        "model": settings.embedding_model,
        "input": stripped[: settings.vector_source_max_chars],
    }
    if settings.embedding_dimensions:
        body["dimensions"] = settings.embedding_dimensions

    timeout = min(settings.llm_classifier_timeout_seconds * 2, 15.0)

    for attempt in range(_MAX_RETRIES + 1):
        if attempt > 0:
            delay = _RETRY_BACKOFF_BASE * (2 ** (attempt - 1))
            logger.debug("Embedding retry %d/%d after %.1fs", attempt, _MAX_RETRIES, delay)
            time.sleep(delay)
        try:
            with httpx.Client(timeout=timeout) as client:
                response = client.post(url, headers=headers, json=body)
            if response.status_code == 429:
                logger.debug("Embedding rate-limited (attempt %d/%d)", attempt + 1, _MAX_RETRIES + 1)
                continue
            if not response.is_success:
                logger.debug("Embedding HTTP %d (attempt %d)", response.status_code, attempt + 1)
                return None
            payload = response.json()
            data = payload.get("data", [])
            if not data:
                return None
            vec = data[0].get("embedding")
            if not isinstance(vec, list) or not vec:
                return None
            out = [float(x) for x in vec]
            _EMBED_CACHE[key] = out
            if len(_EMBED_CACHE) > _EMBED_CACHE_MAX:
                _EMBED_CACHE.popitem(last=False)
            return out
        except httpx.TimeoutException:
            logger.debug("Embedding timeout (attempt %d/%d)", attempt + 1, _MAX_RETRIES + 1)
        except Exception as exc:
            logger.debug("Embedding error (attempt %d/%d): %s", attempt + 1, _MAX_RETRIES + 1, exc)
            return None  # Non-transient errors don't benefit from retry

    logger.warning("Embedding failed after %d attempts — vector search skipped.", _MAX_RETRIES + 1)
    return None


def clear_embedding_cache_for_tests() -> None:
    """Test helper: reset LRU cache."""
    _EMBED_CACHE.clear()
