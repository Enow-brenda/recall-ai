import secrets

from fastapi import APIRouter, Depends, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.core.exceptions import InvalidRequestError
from app.core.middleware.auth_backend import (
    SESSION_COOKIE,
    create_access_token,
    get_current_user,
)
from app.db.db_instance import get_db
from app.db.models import User
from app.schemas.common import ok
from app.services.auth_service import (
    build_auth_url,
    exchange_code,
    fetch_userinfo,
    resolve_login,
)
# controller for all the auth endpoints
router  = APIRouter(tags=["auth"]) 

@router.get("/login")
def login():
    state = secrets.token_urlsafe(32)
    url = build_auth_url(state)
    resp = RedirectResponse(url)
    resp.set_cookie("oauth_state", state,
                    max_age=600,        # dies in 10 min
                    httponly=True,
                    samesite="lax")
    return resp

@router.get("/callback")
def callback(code: str, state: str, request: Request, db: Session = Depends(get_db)):
    if request.cookies.get("oauth_state") != state:
        raise InvalidRequestError("OAuth state mismatch")
    tokens = exchange_code(code)
    info   = fetch_userinfo(tokens["access_token"])
    current_user = _optional_current_user(request, db)   # None if not logged in yet
    user, created_new_user = resolve_login(db, tokens, info, current_user)

    token = create_access_token(user.id)
    resp = RedirectResponse(settings.app_origin or "/")
    resp.set_cookie("recall_token", token, httponly=True, samesite="lax",
                    max_age=settings.jwt_expire_days * 86400)
    resp.delete_cookie("oauth_state")                    # cleanup
    return resp

@router.post("/logout")
def logout():
    resp = ok(None, "Logged out")
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