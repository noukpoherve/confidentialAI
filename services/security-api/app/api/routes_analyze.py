from fastapi import APIRouter

from app.core.config import settings
from app.core.incident_store import get_incident_store
from app.core.policy_engine import analyze_prompt
from app.schemas.analyze import AnalyzeRequest, AnalyzeResponse

router = APIRouter(prefix="/v1", tags=["analysis"])


def _build_redacted_prompt(prompt: str, redactions: list[dict]) -> str:
    redacted = prompt
    for item in redactions:
        original = str(item.get("original", ""))
        replacement = str(item.get("replacement", "[REDACTED]"))
        if original:
            redacted = redacted.replace(original, replacement)
    return redacted


def _build_incident_payload(request: AnalyzeRequest, response: AnalyzeResponse) -> dict:
    tenant_id = request.metadata.tenantId if request.metadata else None
    return {
        "requestId": request.requestId,
        "platform": request.platform,
        "action": response.action,
        "riskScore": response.riskScore,
        "reasons": response.reasons,
        "detections": [d.model_dump() for d in response.detections],
        "redactions": [r.model_dump() for r in response.redactions],
        "createdAt": response.createdAt,
        "tenantId": tenant_id,
        "userConsent": request.userConsent,
        "metadata": request.metadata.model_dump() if request.metadata else {},
        # Keep a short redacted preview only, never raw prompt content.
        "promptPreview": _build_redacted_prompt(request.prompt, [r.model_dump() for r in response.redactions])[
            :300
        ],
    }


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze(request: AnalyzeRequest) -> AnalyzeResponse:
    decision = analyze_prompt(prompt=request.prompt, user_consent=request.userConsent)
    response = AnalyzeResponse(
        requestId=request.requestId,
        action=decision.action,
        riskScore=decision.risk_score,
        reasons=decision.reasons,
        detections=decision.detections,
        redactions=decision.redactions,
        createdAt=decision.created_at,
    )
    incident = _build_incident_payload(request, response)
    try:
        get_incident_store().save_incident(incident)
    except Exception:
        # Keep the API fail-open if incident persistence is temporarily unavailable.
        pass
    return response


@router.get("/incidents")
def list_incidents() -> dict:
    store = get_incident_store()
    items = store.list_incidents(limit=settings.incidents_list_limit)
    return {"items": items, "total": len(items)}
