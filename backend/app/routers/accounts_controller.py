import json
import secrets
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.middleware.auth_backend import get_current_user
from app.core.exceptions import NotFoundError
from app.db.db_instance import get_db
from app.db.models import ConnectedAccount, Provider, User
from app.schemas.account import AccountSummary, ConnectProviderRequest, ProviderInfo
from app.schemas.common import ok
from app.services.auth_service import (
    OAUTH_INTENT_COOKIE,
    OAUTH_STATE_COOKIE,
    build_auth_url,
)
from app.services.gmail_service import run_initial_sync
from app.services.provider_service import get_active_provider

router = APIRouter(tags=["Accounts"])

INTENT_MAX_AGE = 600        # dies in 10 min, same as oauth_state


@router.post("/connect")
def connect_account(
    payload: ConnectProviderRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # gate on the provider before starting any OAuth flow
    provider = get_active_provider(db, payload.provider)

    state = secrets.token_urlsafe(32)
    url = build_auth_url(state)

    resp = JSONResponse(
        content=ok({"redirect_url": url}, "Connect flow started").model_dump()
    )
    resp.set_cookie(
        OAUTH_STATE_COOKIE, state,
        max_age=INTENT_MAX_AGE, httponly=True, samesite="lax",
    )
    resp.set_cookie(
        OAUTH_INTENT_COOKIE,
        json.dumps({"mode": "connect", "provider_key": provider.key}),
        max_age=INTENT_MAX_AGE, httponly=True, samesite="lax",
    )
    return resp


@router.get("")
def list_accounts(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(ConnectedAccount, Provider)
        .join(Provider, ConnectedAccount.provider_id == Provider.id)
        .filter(ConnectedAccount.user_id == user.id)
        .order_by(ConnectedAccount.connected_at)
        .all()
    )
    return ok([_to_summary(account, provider) for account, provider in rows])


@router.get("/providers")
def list_providers(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    providers = db.query(Provider).order_by(Provider.display_name).all()
    return ok([_to_provider_info(p) for p in providers])


@router.post("/{account_id}/sync")
def sync_account_endpoint(
    account_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    account = _get_owned_account(db, account_id, user.id)
    background_tasks.add_task(run_initial_sync, user.id, account.account_identifier)
    return ok(None, "Sync started")


@router.patch("/{account_id}/toggle")
def toggle_account(
    account_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    account = _get_owned_account(db, account_id, user.id)
    account.is_active = not account.is_active
    db.commit()
    provider = db.get(Provider, account.provider_id)
    return ok(_to_summary(account, provider), "Account toggled")


def _get_owned_account(db: Session, account_id: uuid.UUID, user_id: uuid.UUID) -> ConnectedAccount:
    account = (
        db.query(ConnectedAccount)
        .filter(ConnectedAccount.id == account_id, ConnectedAccount.user_id == user_id)
        .first()
    )
    if account is None:
        raise NotFoundError("Account not found")
    return account


def _to_summary(account: ConnectedAccount, provider: Provider) -> AccountSummary:
    return AccountSummary(
        id=account.id,
        provider_key=provider.key,
        provider_display_name=provider.display_name,
        account_identifier=account.account_identifier,
        display_label=account.display_label,
        is_active=account.is_active,
        connected_at=account.connected_at,
    )


def _to_provider_info(provider: Provider) -> ProviderInfo:
    return ProviderInfo(
        key=provider.key,
        display_name=provider.display_name,
        auth_type=provider.auth_type,
        is_active=provider.is_active,
    )