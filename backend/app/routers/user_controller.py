
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.middleware.auth_backend import get_current_user
from app.db.db_instance import get_db
from app.db.models import User
from app.schemas.common import ok
from app.schemas.user import DeleteAccountRequest
from app.services.user_service import delete_account, get_profile, get_stats

router = APIRouter(tags=["Users"])          # main.py mounts under /users


@router.get("/me")
def read_me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return ok(get_profile(db, user.id))


@router.get("/me/stats")
def my_stats(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return ok(get_stats(db, user.id))


@router.delete("/me")
def remove_me(
    payload: DeleteAccountRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    delete_account(db, user.id, payload.confirm)
    return ok(None, "Account deleted")