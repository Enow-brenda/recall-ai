import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timezone

from app.config import settings
from app.schemas.support import SupportRequest

logger = logging.getLogger(__name__)


def send_support_email(payload: SupportRequest) -> None:
    """Send a support/contact-form email via Gmail SMTP."""
    if not settings.smtp_username or not settings.smtp_password:
        logger.warning("SMTP credentials not configured — skipping support email")
        return
    if not settings.support_recipient:
        logger.warning("SUPPORT_RECIPIENT not configured — skipping support email")
        return

    category = payload.category or "General"
    subject = f"[Recall Support] {category}"

    body = (
        f"Category: {category}\n"
        f"From: {payload.name or 'Anonymous'} <{payload.email or 'no-reply'}>\n"
        f"Time: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}\n"
        f"{'=' * 40}\n\n"
        f"{payload.message}\n"
    )

    msg = MIMEMultipart()
    msg["From"] = settings.smtp_username
    msg["To"] = settings.support_recipient
    msg["Subject"] = subject
    if payload.email:
        msg["Reply-To"] = payload.email
    msg.attach(MIMEText(body, "plain", "utf-8"))

    with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port) as server:
        server.login(settings.smtp_username, settings.smtp_password)
        server.sendmail(
            settings.smtp_username,
            settings.support_recipient,
            msg.as_string(),
        )
