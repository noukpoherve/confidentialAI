from fastapi import APIRouter

from app.agents.asi import notify_critical_incident
from app.agents.orchestrator import analyze_prompt_with_agents, validate_response_with_agents
from app.core.config import settings
from app.core.incident_store import get_incident_store
from app.schemas.analyze import (
    AnalyzeRequest,
    AnalyzeResponse,
    ValidateResponseRequest,
    ValidateResponseResponse,
)

router = APIRouter(prefix="/v1", tags=["analysis"])


def _build_redacted_prompt(prompt: str, redactions: list[dict]) -> str:
    redacted = prompt
    for item in redactions:
        original = str(item.get("original", ""))
        replacement = str(item.get("replacement", "[REDACTED]"))
        if original:
            redacted = redacted.replace(original, replacement)
    return redacted


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
    return {
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
        "contentPreview": _build_redacted_prompt(raw_text, [r.model_dump() for r in response.redactions])[
            :300
        ],
    }


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze(request: AnalyzeRequest) -> AnalyzeResponse:
    execution = analyze_prompt_with_agents(prompt=request.prompt, user_consent=request.userConsent)
    decision = execution.decision
    response = AnalyzeResponse(
        requestId=request.requestId,
        action=decision.action,
        riskScore=decision.risk_score,
        reasons=decision.reasons,
        detections=decision.detections,
        redactions=decision.redactions,
        createdAt=decision.created_at,
        graphTrace=execution.graph_trace,
    )
    incident = _build_incident_payload(
        request_id=request.requestId,
        platform=request.platform,
        raw_text=request.prompt,
        user_consent=request.userConsent,
        metadata=request.metadata.model_dump() if request.metadata else {},
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
def validate_response(request: ValidateResponseRequest) -> ValidateResponseResponse:
    execution = validate_response_with_agents(response_text=request.responseText)
    decision = execution.decision
    response = ValidateResponseResponse(
        requestId=request.requestId,
        action=decision.action,
        riskScore=decision.risk_score,
        reasons=decision.reasons,
        detections=decision.detections,
        redactions=decision.redactions,
        createdAt=decision.created_at,
        graphTrace=execution.graph_trace,
    )
    incident = _build_incident_payload(
        request_id=request.requestId,
        platform=request.platform,
        raw_text=request.responseText,
        user_consent=None,
        metadata=request.metadata.model_dump() if request.metadata else {},
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


@router.get("/incidents")
def list_incidents() -> dict:
    store = get_incident_store()
    items = store.list_incidents(limit=settings.incidents_list_limit)
    return {"items": items, "total": len(items)}
