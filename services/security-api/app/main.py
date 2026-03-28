from fastapi import FastAPI

from app.api.routes_analyze import router as analyze_router
from app.api.routes_auth import router as auth_router
from app.api.routes_site_signals import router as site_signals_router
from app.api.routes_user_settings import router as user_settings_router
from app.core.config import settings

app = FastAPI(title=settings.api_name, version=settings.api_version)

app.include_router(analyze_router)
app.include_router(auth_router)
app.include_router(user_settings_router)
app.include_router(site_signals_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
