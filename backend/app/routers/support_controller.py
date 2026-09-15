import logging
import smtplib
import time

from fastapi import APIRouter, HTTPException, Request

from app.schemas.common import ok
from app.schemas.support import SupportRequest
from app.services.support_service import SMTPNotConfiguredError, send_support_email

logger = logging.getLogger(__name__)

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
):
    ip = request.client.host if request.client else "unknown"
    _check_rate_limit(ip)
    # Send inline (with a timeout) so the response reflects the real outcome —
    # a background task would return "message received" while the email silently
    # never goes out.
    try:
        send_support_email(payload)
    except SMTPNotConfiguredError as exc:
        logger.error("Support email misconfigured: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="Support email is not configured on the server.",
        ) from exc
    except smtplib.SMTPException as exc:
        logger.exception("Sending support email failed")
        raise HTTPException(
            status_code=502,
            detail="Could not send your message — please try again shortly.",
        ) from exc
    return ok(None, "Message sent")
