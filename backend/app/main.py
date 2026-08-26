from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.auth_controller import router as auth_router 

from app.config import settings
from app.core.exception_handlers import register_exception_handlers
from app.core.logging import setup_logging

from app.routers.user_controller import router as user_controller_router

setup_logging()

tags_metadata = [
    {"name": "Users", "description": "Operations related to user management"},
    {"name": "Auth", "description": "Operations related to authentication mostly gmail authentication for now"}
]
app = FastAPI(title=settings.app_name, openapi_tags=tags_metadata, version=settings.app_version)

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



# Include the routers from controller modules
app.include_router(user_controller_router, prefix="/users", tags=["Users"])
         
app.include_router(auth_router, prefix="/auth", tags=["Auth"]) 
