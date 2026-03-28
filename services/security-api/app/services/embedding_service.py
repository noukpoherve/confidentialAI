"""
OpenAI-compatible embedding calls + small in-process cache for repeated text.
"""

from __future__ import annotations

import hashlib
from collections import OrderedDict

import httpx

from app.core.config import settings

_EMBED_CACHE: OrderedDict[str, list[float]] = OrderedDict()
_EMBED_CACHE_MAX = 128


def _cache_key(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def get_embedding(text: str) -> list[float] | None:
    """
    Returns the embedding vector for `text`, or None on failure / empty input.
    Uses LLM_CLASSIFIER_API_BASE + the same API key as other OpenAI calls.
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

    try:
        with httpx.Client(timeout=min(settings.llm_classifier_timeout_seconds * 2, 15.0)) as client:
            response = client.post(url, headers=headers, json=body)
        if not response.is_success:
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
    except Exception:
        return None


def clear_embedding_cache_for_tests() -> None:
    """Test helper: reset LRU cache."""
    _EMBED_CACHE.clear()
