from fastapi import FastAPI

from app.api.routes_analyze import router as analyze_router
from app.core.config import settings

app = FastAPI(title=settings.api_name, version=settings.api_version)

app.include_router(analyze_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
