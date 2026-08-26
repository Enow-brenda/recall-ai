import uuid

import jwt
from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.config import settings
from app.core.exceptions import AuthenticationError
from app.db.db_instance import get_db
from app.db.models import User

from datetime import datetime, timedelta, timezone

SESSION_COOKIE = "recall_token"


def create_access_token(user_id: uuid.UUID) -> str:
    payload = {
        "sub": str(user_id),
        "exp": datetime.now(timezone.utc) + timedelta(days=settings.jwt_expire_days), #expiration date
        "iat": datetime.now(timezone.utc), #issued date
    }   
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        token = _bearer_from_header(request)           # dev/testing fallback, see below
    if not token:
        raise AuthenticationError()
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.ExpiredSignatureError:
        raise AuthenticationError("Session expired") from None
    except jwt.InvalidTokenError:
        raise AuthenticationError("Invalid session") from None
    user = db.get(User, uuid.UUID(payload["sub"]))
    if user is None:
        raise AuthenticationError()
    return user


def _bearer_from_header(request: Request) -> str | None:
    auth = request.headers.get("Authorization", "")
    return auth.removeprefix("Bearer ").strip() or None