"""
Qdrant persistence for semantic similarity over past BLOCK/WARN prompt incidents.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any
from urllib.parse import urlparse

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams

from app.core.config import settings
from app.services.embedding_service import get_embedding

logger = logging.getLogger(__name__)

_client: QdrantClient | None = None
_collection_ready: bool = False


def _build_client() -> QdrantClient | None:
    try:
        kwargs: dict = {"timeout": 5}
        if settings.qdrant_api_key:
            kwargs["api_key"] = settings.qdrant_api_key
        if settings.qdrant_prefer_grpc:
            parsed = urlparse(settings.qdrant_url)
            host = parsed.hostname or "localhost"
            return QdrantClient(
                host=host,
                grpc_port=settings.qdrant_grpc_port,
                prefer_grpc=True,
                **kwargs,
            )
        return QdrantClient(url=settings.qdrant_url, **kwargs)
    except Exception as exc:  # pragma: no cover - connection failures
        logger.debug("Qdrant client init failed: %s", exc)
        return None


def get_qdrant_client() -> QdrantClient | None:
    global _client
    if _client is None:
        _client = _build_client()
    return _client


def reset_qdrant_client_for_tests() -> None:
    global _client, _collection_ready
    _client = None
    _collection_ready = False


def _ensure_collection(client: QdrantClient) -> bool:
    global _collection_ready
    if _collection_ready:
        return True
    name = settings.qdrant_collection
    try:
        exists = False
        for c in client.get_collections().collections:
            if c.name == name:
                exists = True
                break
        if not exists:
            client.create_collection(
                collection_name=name,
                vectors_config=VectorParams(
                    size=settings.embedding_dimensions,
                    distance=Distance.COSINE,
                ),
            )
        _collection_ready = True
        return True
    except Exception as exc:
        logger.debug("Qdrant ensure_collection failed: %s", exc)
        return False


def upsert_incident_vector(
    *,
    source_text: str,
    action: str,
    risk_score: int,
    request_id: str,
) -> bool:
    """
    Embed `source_text` and store a point for future similarity search.
    """
    if not settings.vector_search_enabled:
        return False
    client = get_qdrant_client()
    if client is None or not _ensure_collection(client):
        return False
    vector = get_embedding(source_text)
    if vector is None:
        return False
    if action not in {"BLOCK", "WARN"}:
        return False
    try:
        point = PointStruct(
            id=str(uuid.uuid4()),
            vector=vector,
            payload={
                "action": action,
                "riskScore": int(risk_score),
                "requestId": str(request_id),
            },
        )
        client.upsert(collection_name=settings.qdrant_collection, points=[point])
        return True
    except Exception as exc:
        logger.debug("Qdrant upsert failed: %s", exc)
        return False


def search_similar_incident(query_text: str) -> tuple[float, dict[str, Any]] | None:
    """
    Return (similarity_score, payload) for the best match above the configured
    threshold, or None if no hit / error.
    """
    if not settings.vector_search_enabled:
        return None
    client = get_qdrant_client()
    if client is None or not _ensure_collection(client):
        return None
    vector = get_embedding(query_text)
    if vector is None:
        return None
    try:
        hits = client.search(
            collection_name=settings.qdrant_collection,
            query_vector=vector,
            limit=1,
            score_threshold=settings.vector_match_min_score,
        )
        if not hits:
            return None
        h = hits[0]
        payload = h.payload or {}
        return (float(h.score), payload)
    except Exception as exc:
        logger.debug("Qdrant search failed: %s", exc)
        return None


def maybe_index_incident_from_payload(vector_text: str | None, incident: dict) -> None:
    """
    Called after persisting an incident: index BLOCK/WARN prompts for vector search.
    `incident` must no longer contain vectorSourceText (already popped).
    """
    if not vector_text or not settings.vector_search_enabled:
        return
    action = incident.get("action")
    if action not in {"BLOCK", "WARN"}:
        return
    if incident.get("incidentType") != "PROMPT":
        return
    upsert_incident_vector(
        source_text=vector_text,
        action=str(action),
        risk_score=int(incident.get("riskScore") or 0),
        request_id=str(incident.get("requestId") or ""),
    )
