import json
import secrets

from fastapi import APIRouter, Depends, Request
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.orm import Session
from fastapi import BackgroundTasks

from app.config import settings
from app.core.exceptions import AuthenticationError, InvalidRequestError
from app.core.middleware.auth_backend import (
    SESSION_COOKIE,
    create_access_token,
    get_current_user,
)
from app.db.db_instance import get_db
from app.db.models import User
from app.services.gmail_service import run_initial_sync
from app.schemas.common import ok
from app.services.auth_service import (
    OAUTH_INTENT_COOKIE,
    OAUTH_STATE_COOKIE,
    build_auth_url,
    exchange_code,
    fetch_userinfo,
    resolve_login,
)
# controller for all the auth endpoints
router  = APIRouter(tags=["Auth"]) 

@router.get("/login")
def login():
    state = secrets.token_urlsafe(32)
    url = build_auth_url(state)
    resp = RedirectResponse(url)
    resp.set_cookie(OAUTH_STATE_COOKIE, state,
                    max_age=600,        # dies in 10 min
                    httponly=True,
                    samesite="lax")
    resp.set_cookie(OAUTH_INTENT_COOKIE, json.dumps({"mode": "login"}),
                    max_age=600,
                    httponly=True,
                    samesite="lax")
    return resp

@router.get("/callback")
def callback(background_tasks: BackgroundTasks, code: str, state: str, request: Request, db: Session = Depends(get_db)):
    if request.cookies.get(OAUTH_STATE_COOKIE) != state:
        raise InvalidRequestError("OAuth state mismatch")
    tokens = exchange_code(code)
    info   = fetch_userinfo(tokens["access_token"])
    intent = _read_intent(request)

    # connect flow: an already-logged-in user is attaching a new account to
    # their current session — no new session, no new user.
    if intent.get("mode") == "connect":
        current_user = _optional_current_user(request, db)
        if current_user is None:
            raise AuthenticationError("Log in before connecting an account")
        user, _ = resolve_login(db, tokens, info, current_user)
        background_tasks.add_task(run_initial_sync, user.id, info["email"])
        resp = RedirectResponse(settings.app_origin + "?connected=1")
        resp.delete_cookie(OAUTH_STATE_COOKIE)
        resp.delete_cookie(OAUTH_INTENT_COOKIE)
        return resp

    # default login flow
    current_user = _optional_current_user(request, db)   # None if not logged in yet
    user, created_new_user = resolve_login(db, tokens, info, current_user)

    #sync each time a user logs in
    background_tasks.add_task(run_initial_sync, user.id, info["email"])


    token = create_access_token(user.id)
    resp = RedirectResponse(settings.app_origin or "/")
    resp.set_cookie("recall_token", token, httponly=True, samesite="lax",
                    max_age=settings.jwt_expire_days * 86400)
    resp.delete_cookie(OAUTH_STATE_COOKIE)                    # cleanup
    resp.delete_cookie(OAUTH_INTENT_COOKIE)
    return resp

@router.post("/logout")
def logout():
    payload = ok(None, "Logged out")
    resp = JSONResponse(content=payload.model_dump())  
    resp.delete_cookie(SESSION_COOKIE)
    return resp


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return ok({"id": str(user.id), "email": user.primary_email, "name": user.name})


def _optional_current_user(request: Request, db: Session) -> User | None:
    """Same as get_current_user but returns None instead of raising 401.

    Needed because /auth/callback is called both by logged-out visitors
    (signup/login → situations 1-2) and logged-in users adding an account
    (situations 3-4). A missing session is normal here, not an error.
    """
    try:
        return get_current_user(request, db)
    except Exception:
        return None


def _read_intent(request: Request) -> dict:
    """Decode the oauth_intent cookie; anything unexpected falls back to login."""
    raw = request.cookies.get(OAUTH_INTENT_COOKIE)
    if not raw:
        return {"mode": "login"}
    try:
        intent = json.loads(raw)
    except (ValueError, TypeError):
        return {"mode": "login"}
    return intent if isinstance(intent, dict) else {"mode": "login"}