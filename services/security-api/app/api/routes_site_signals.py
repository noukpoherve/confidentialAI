from fastapi import APIRouter

from app.core.config import settings
from app.core.site_signal_store import get_site_signal_store
from app.schemas.site_signals import SiteSignalRequest, SiteSignalResponse

router = APIRouter(prefix="/v1/site-signals", tags=["site-signals"])


@router.post("", response_model=SiteSignalResponse)
def create_site_signal(request: SiteSignalRequest) -> SiteSignalResponse:
    try:
        get_site_signal_store().save_signal(request.model_dump())
    except Exception:
        # Fail-open: telemetry must never block runtime behavior.
        pass
    return SiteSignalResponse(ok=True)


@router.get("/recent")
def list_recent_site_signals() -> dict:
    items = get_site_signal_store().list_signals(limit=settings.site_signals_list_limit)
    return {"items": items, "total": len(items)}


@router.get("/summary")
def summary_site_signals() -> dict:
    rows = get_site_signal_store().aggregate_failures_by_site(limit=100)
    return {"items": rows, "total": len(rows)}
