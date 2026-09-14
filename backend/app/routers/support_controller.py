import time

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request

from app.schemas.common import ok
from app.schemas.support import SupportRequest
from app.services.support_service import send_support_email

router = APIRouter(tags=["Support"])

_MAX_REQUESTS_PER_HOUR = 5
_rate_limits: dict[str, list[float]] = {}


def _check_rate_limit(ip: str) -> None:
    """Simple in-memory per-IP rate limit (5 requests/hour)."""
    cutoff = time.time() - 3600
    timestamps = _rate_limits.get(ip, [])
    timestamps = [t for t in timestamps if t > cutoff]
    if len(timestamps) >= _MAX_REQUESTS_PER_HOUR:
        raise HTTPException(
            status_code=429,
            detail="Too many requests — please try again later.",
        )
    timestamps.append(time.time())
    _rate_limits[ip] = timestamps


@router.post("/support")
def support(
    payload: SupportRequest,
    request: Request,
    background_tasks: BackgroundTasks,
):
    ip = request.client.host if request.client else "unknown"
    _check_rate_limit(ip)
    background_tasks.add_task(send_support_email, payload)
    return ok(None, "Message received")
