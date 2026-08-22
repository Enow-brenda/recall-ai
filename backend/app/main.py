from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.exception_handlers import register_exception_handlers
from app.core.logging import setup_logging

setup_logging()

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "app": settings.app_name, "environment": settings.environment}
