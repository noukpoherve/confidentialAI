from fastapi import APIRouter, Depends, Request

from app.agents.asi import notify_critical_incident
from app.agents.image_moderator import run_image_moderator
from app.agents.orchestrator import analyze_prompt_with_agents, validate_response_with_agents
from app.core.auth import get_current_user, get_current_user_optional
from app.core.config import settings
from app.core.detectors import apply_redactions
from app.core.incident_store import get_incident_store
from app.schemas.analyze import (
    AnalyzeImageRequest,
    AnalyzeImageResponse,
    AnalyzeRequest,
    AnalyzeResponse,
    ValidateResponseRequest,
    ValidateResponseResponse,
)
from app.core.rate_limiter import limiter

router = APIRouter(prefix="/v1", tags=["analysis"])


def _build_incident_payload(
    *,
    request_id: str,
    platform: str,
    raw_text: str,
    user_consent: bool | None,
    metadata: dict,
    response: AnalyzeResponse | ValidateResponseResponse,
    incident_type: str,
    graph_trace: list[str],
) -> dict:
    tenant_id = metadata.get("tenantId")
    payload: dict = {
        "incidentType": incident_type,
        "requestId": request_id,
        "platform": platform,
        "action": response.action,
        "riskScore": response.riskScore,
        "reasons": response.reasons,
        "detections": [d.model_dump() for d in response.detections],
        "redactions": [r.model_dump() for r in response.redactions],
        "createdAt": response.createdAt,
        "tenantId": tenant_id,
        "userConsent": user_consent,
        "metadata": metadata,
        "graphTrace": graph_trace,
        # Keep a short redacted preview only, never raw prompt content.
        "contentPreview": apply_redactions(raw_text, [r.model_dump() for r in response.redactions])[:300],
    }
    # Store rephrase suggestions when the toxicity analyzer triggered.
    if hasattr(response, "suggestions") and response.suggestions:
        payload["suggestions"] = response.suggestions
    # Ephemeral: used only for Qdrant indexing — stripped before Mongo in incident_store.
    if (
        incident_type == "PROMPT"
        and response.action in ("BLOCK", "WARN")
        and settings.vector_search_enabled
    ):
        payload["vectorSourceText"] = raw_text[: settings.vector_source_max_chars]
    return payload


@router.post("/analyze", response_model=AnalyzeResponse)
@limiter.limit(settings.rate_limit_analyze)
def analyze(
    request: Request,
    body: AnalyzeRequest,
    current_user: dict | None = Depends(get_current_user_optional),
) -> AnalyzeResponse:
    user_id = current_user.get("id") if current_user else None
    execution = analyze_prompt_with_agents(
        prompt=body.prompt, user_consent=body.userConsent, user_id=user_id
    )
    decision = execution.decision
    response = AnalyzeResponse(
        requestId=body.requestId,
        action=decision.action,
        riskScore=decision.risk_score,
        reasons=decision.reasons,
        detections=decision.detections,
        redactions=decision.redactions,
        createdAt=decision.created_at,
        graphTrace=execution.graph_trace,
        suggestions=decision.suggestions,
    )
    incident = _build_incident_payload(
        request_id=body.requestId,
        platform=body.platform,
        raw_text=body.prompt,
        user_consent=body.userConsent,
        metadata=body.metadata.model_dump() if body.metadata else {},
        response=response,
        incident_type="PROMPT",
        graph_trace=execution.graph_trace,
    )
    try:
        get_incident_store().save_incident(incident)
        notify_critical_incident(incident)
    except Exception:
        # Keep the API fail-open if incident persistence is temporarily unavailable.
        pass
    return response


@router.post("/validate-response", response_model=ValidateResponseResponse)
@limiter.limit(settings.rate_limit_validate_response)
def validate_response(
    request: Request,
    body: ValidateResponseRequest,
) -> ValidateResponseResponse:
    execution = validate_response_with_agents(response_text=body.responseText)
    decision = execution.decision
    response = ValidateResponseResponse(
        requestId=body.requestId,
        action=decision.action,
        riskScore=decision.risk_score,
        reasons=decision.reasons,
        detections=decision.detections,
        redactions=decision.redactions,
        createdAt=decision.created_at,
        graphTrace=execution.graph_trace,
        suggestions=decision.suggestions,
    )
    incident = _build_incident_payload(
        request_id=body.requestId,
        platform=body.platform,
        raw_text=body.responseText,
        user_consent=None,
        metadata=body.metadata.model_dump() if body.metadata else {},
        response=response,
        incident_type="RESPONSE",
        graph_trace=execution.graph_trace,
    )
    try:
        get_incident_store().save_incident(incident)
        notify_critical_incident(incident)
    except Exception:
        pass
    return response


@router.post("/analyze-image", response_model=AnalyzeImageResponse)
@limiter.limit(settings.rate_limit_analyze_image)
def analyze_image(
    request: Request,
    body: AnalyzeImageRequest,
) -> AnalyzeImageResponse:
    """
    Moderate an image before upload.
    Uses OpenAI's omni-moderation-latest model to detect sexual content,
    graphic violence, hate, self-harm, harassment, and CSAM.
    Fails open when the API key is not configured.
    """
    decision = run_image_moderator(body.imageBase64, body.imageMimeType)
    response = AnalyzeImageResponse(
        requestId=body.requestId,
        action=decision.action,
        riskScore=decision.risk_score,
        reasons=decision.reasons,
        detections=decision.detections,
        createdAt=decision.created_at,
    )
    if decision.action in {"BLOCK", "WARN"}:
        incident = {
            "incidentType": "IMAGE",
            "requestId": body.requestId,
            "platform": body.platform,
            "action": decision.action,
            "riskScore": decision.risk_score,
            "reasons": decision.reasons,
            "detections": [d for d in decision.detections],
            "redactions": [],
            "createdAt": decision.created_at,
            "tenantId": body.metadata.tenantId if body.metadata else None,
            "metadata": body.metadata.model_dump() if body.metadata else {},
            # Never store the raw image — log only metadata.
            "contentPreview": f"[IMAGE mime={body.imageMimeType}]",
        }
        try:
            get_incident_store().save_incident(incident)
            notify_critical_incident(incident)
        except Exception:
            pass
    return response


@router.get("/incidents")
def list_incidents(
    limit: int = settings.incidents_list_limit,
    offset: int = 0,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """
    List incidents — requires authentication.
    Supports pagination via `limit` (max items) and `offset` (skip first N).
    """
    store = get_incident_store()
    items = store.list_incidents(limit=limit, offset=offset)
    return {"items": items, "total": len(items), "limit": limit, "offset": offset}
