import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timezone

from app.config import settings
from app.schemas.support import SupportRequest

logger = logging.getLogger(__name__)

SMTP_TIMEOUT = 15  # seconds — don't let a dead SMTP hang the request forever


class SMTPNotConfiguredError(Exception):
    """Raised when SMTP settings are missing on the server."""


def send_support_email(payload: SupportRequest) -> None:
    """Send a support/contact-form email via Gmail SMTP.

    Raises on failure so the caller can report the real outcome instead of
    claiming the message was received when nothing was sent.
    """
    missing = [
        name
        for name, value in (
            ("SMTP_USERNAME", settings.smtp_username),
            ("SMTP_PASSWORD", settings.smtp_password),
            ("SUPPORT_RECIPIENT", settings.support_recipient),
        )
        if not value
    ]
    if missing:
        raise SMTPNotConfiguredError("Missing server setting(s): " + ", ".join(missing))

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

    with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=SMTP_TIMEOUT) as server:
        server.login(settings.smtp_username, settings.smtp_password)
        server.sendmail(
            settings.smtp_username,
            settings.support_recipient,
            msg.as_string(),
        )
