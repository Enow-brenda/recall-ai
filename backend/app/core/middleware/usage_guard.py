from datetime import datetime, timezone

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.exceptions import QuotaExceededError
from app.core.middleware.auth_backend import get_current_user
from app.db.db_instance import get_db
from app.db.models import User


def maybe_reset_usage(user: User, now: datetime | None = None) -> bool:
    """Reset plan_usage when a new UTC day has begun. Mutates the user in
    memory; the caller decides when to commit. Returns True if reset."""
    if now is None:
        now = datetime.now(timezone.utc)
    if user.last_plan_reset is None or user.last_plan_reset.date() < now.date():
        user.plan_usage = 0
        user.last_plan_reset = now
        return True
    return False


def check_quota(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> User:
    """Enforce per-day query limits; unlimited when plan.max_daily_queries == -1."""
    plan = user.plan
    if plan is None or plan.max_daily_queries == -1:
        return user

    if maybe_reset_usage(user, datetime.now(timezone.utc)):
        db.commit()

    if user.plan_usage >= plan.max_daily_queries:
        raise QuotaExceededError()
    return user


def increment_usage(db: Session, user: User) -> None:
    """Charge one unit of usage for a completed /chat turn."""
    user.plan_usage += 1
    db.commit()