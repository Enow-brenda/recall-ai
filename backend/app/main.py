from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.auth_controller import router as auth_router 

from app.config import settings
from app.core.exception_handlers import register_exception_handlers
from app.core.logging import setup_logging

from app.routers.accounts_controller import router as accounts_router
from app.routers.conversations_controller import router as conversations_router
from app.routers.search_controller import router as search_router
from app.routers.support_controller import router as support_router
from app.routers.user_controller import router as user_controller_router

setup_logging()

tags_metadata = [
    {"name": "Users", "description": "Operations related to user management"},
    {"name": "Auth", "description": "Operations related to authentication mostly gmail authentication for now"},
    {"name": "Accounts", "description": "Connected accounts, providers and connections"},
    {"name": "Conversations", "description": "Conversation listing, creation and history"},
    {"name": "Chat", "description": "Send a message and get a cited answer"},
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

app.include_router(accounts_router, prefix="/accounts", tags=["Accounts"]) 

app.include_router(conversations_router, prefix="/conversations", tags=["Conversations"])

app.include_router(search_router, tags=["Chat"])

app.include_router(support_router) 
