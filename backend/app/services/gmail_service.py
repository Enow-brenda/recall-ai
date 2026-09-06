from datetime import datetime, timedelta, timezone
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from sqlalchemy.dialects.postgresql import insert as pg_insert
from app.core.exception_handlers import logger
import uuid
from app.db.connector import SessionLocal


from app.config import settings
from app.core.exceptions import InvalidRequestError
from app.db.models import ConnectedAccount, Email, Attachment,Link,User
import httpx
import base64

import re
from urllib.parse import urlparse

URL_REGEX = re.compile(r'https?://[^\s<>"\']+')


# this service is in charge of the gmail functionalities
GMAIL_SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
]
SYNC_BATCH_SIZE = 100          # get the most recent 100 emails since last sync


# job 1: get the must up to date access token
def get_fresh_access_token(account: ConnectedAccount) -> str:
    creds_data = account.credentials or {}
    expires_at = datetime.fromisoformat(creds_data["expires_at"])
    access_token = creds_data["access_token"]

    if expires_at - timedelta(minutes=60) > datetime.now(timezone.utc):
        return access_token

    if not creds_data.get("refresh_token"):
        raise InvalidRequestError("Reconnect this account to continue syncing")
    
    resp = httpx.post("https://oauth2.googleapis.com/token", data={
        "client_id": settings.google_client_id,
        "client_secret": settings.google_client_secret,
        "refresh_token": creds_data["refresh_token"],
        "grant_type": "refresh_token",
    })
    resp.raise_for_status()
    new_tokens = resp.json()

    account.credentials = {
        **creds_data,
        "access_token": new_tokens["access_token"],
        "expires_at": (
            datetime.now(timezone.utc)
            + timedelta(seconds=new_tokens["expires_in"])
        ).isoformat(),
    }
    return new_tokens["access_token"]

def sync_account(db, account: ConnectedAccount) -> int:
    access_token = get_fresh_access_token(account)
    creds = Credentials(
        token=access_token,
        scopes=GMAIL_SCOPES,
    )
    service = build("gmail", "v1", credentials=creds)

    # get the last 100 emails

    listing = service.users().messages().list(
        userId="me", maxResults=SYNC_BATCH_SIZE
    ).execute()
    msg_ids = [m["id"] for m in listing.get("messages", [])]

    already_stored = {
        row[0] for row in db.query(Email.external_id).filter(
            Email.account_id == account.id,
            Email.external_id.in_(msg_ids),
        )
    }

    emails_to_insert = []
    attachments_to_insert = []
    links_to_insert = []

    for mid in msg_ids:
        if mid in already_stored:
            continue
        raw = service.users().messages().get(userId="me", id=mid).execute()
        email_row, att_rows, link_rows = _parse_message(account.user_id,account.id, mid, raw)
        emails_to_insert.append(email_row)
        attachments_to_insert.extend(att_rows)
        links_to_insert.extend(link_rows)

    if emails_to_insert:
        db.execute(pg_insert(Email).values(emails_to_insert).on_conflict_do_nothing(index_elements=["account_id", "external_id"]))

    message_ids = [r["_message_id"] for r in attachments_to_insert + links_to_insert]
    rows = db.query(Email.external_id, Email.id).filter(
     Email.account_id == account.id, Email.external_id.in_(message_ids)
    )
    email_id_map = {e: i for e, i in rows}
    for row in attachments_to_insert + links_to_insert:
        row["email_id"] = email_id_map[row.pop("_message_id")]
    if attachments_to_insert:
        db.execute(pg_insert(Attachment).values(attachments_to_insert))
    if links_to_insert:
        db.execute(pg_insert(Link).values(links_to_insert))
    db.commit()

    return len(emails_to_insert)

def _parse_message(user_id, account_id, msg_id: str, raw: dict) :
    headers = {h["name"].lower(): h["value"] for h in raw["payload"].get("headers", [])}
    body = _extract_body(raw["payload"])

    ts_raw = headers.get("date")
    try:
        from email.utils import parsedate_to_datetime
        sent_at = parsedate_to_datetime(ts_raw) if ts_raw else datetime.now(timezone.utc)
    except Exception:
        sent_at = datetime.now(timezone.utc)

    parts = _flatten_parts(raw["payload"])
    email_row = {
        "user_id": user_id,
        "account_id": account_id,
        "external_id": msg_id,
        "thread_id": raw.get("threadId"),
        "sender": headers.get("from"),
        "subject": headers.get("subject"),
        "raw_body": body,
        "has_attachment": any(p.get("filename") for p in parts),
        "has_link": _has_links(body),
        "sent_at": sent_at,
    }
    att_rows = []
    for p in parts:
        if not p.get("filename"):
            continue
        body_info = p.get("body", {}) or {}
        att_rows.append({
            "_message_id": msg_id,
            "filename": p["filename"],
            "mime_type": p.get("mimeType"),
            "size_bytes": body_info.get("size"),
            "gmail_attachment_id": body_info.get("attachmentId"),
        })
    link_rows = []
    urls = _extract_urls(body)
    for url in urls:
        link_rows.append({
            "_message_id": msg_id,
            "domain": _extract_domain(url),
            "url": url,
        })
    return email_row, att_rows, link_rows


def _extract_body(payload: dict) -> str:
    # Gmail nests MIME parts: look for text/plain first, then text/html
    if payload.get("body", {}).get("data"):
        return base64.urlsafe_b64decode(payload["body"]["data"]).decode("utf-8", errors="replace")
    for part in payload.get("parts", []):
        text = _extract_body(part)
        if text:
            return text
    return ""

def _flatten_parts(payload: dict) -> list[dict]:
    parts = []
    if "parts" in payload:
        for p in payload["parts"]:
            parts.extend(_flatten_parts(p))
    else:
        parts.append(payload)
    return parts


def _has_links(body: str) -> bool:
    return bool(URL_REGEX.search(body))

def _extract_urls(body: str) -> list[str]:
    return list(set(URL_REGEX.findall(body)))     # deduplicate per-message

def _extract_domain(url: str) -> str:
    return urlparse(url).netloc

def _parse_date(raw: str | None) -> datetime:
    if not raw:
        return datetime.now(timezone.utc)
    try:
        from email.utils import parsedate_to_datetime
        return parsedate_to_datetime(raw)
    except Exception:
        return datetime.now(timezone.utc)

def run_initial_sync(user_id: uuid.UUID, account_email: str) -> None:
    """Runs AFTER the response is sent — must open its own DB session,
    because the request's session is closed by then."""
    db = SessionLocal()
    try:
        account = (
            db.query(ConnectedAccount)
            .join(User, ConnectedAccount.user_id == User.id)
            .filter(User.id == user_id, ConnectedAccount.account_identifier == account_email)
            .first()
        )
        if account and account.is_active:
            sync_account(db, account)
            logger.info("Initial sync done for %s (%s)", account_email, user_id)
    except Exception:
        logger.exception("Background sync failed for %s", account_email)
        # never raise out of a background task — it can't reach the browser anyway;
        # the manual /sync endpoint remains as retry path
    finally:
        db.close()