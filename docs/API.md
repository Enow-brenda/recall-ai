# Recall — API Reference

Base URL: `http://localhost:8000` (dev). Interactive spec lives at
`/docs` (Swagger) — this page is the human summary.

All endpoints except `/health`, `/auth/login`, `/auth/callback` and
`/support` require an authenticated session: the `recall_token` httpOnly JWT
cookie set by `/auth/callback`.

## Response envelope

Every endpoint returns the same `ApiResponse` shape:

```json
{
  "success": true,
  "status_code": 200,
  "message": "…",
  "data": { },
  "errors": null,
  "pagination": null
}
```

Errors use `success: false` with a 4xx/5xx `status_code` and a human-readable
`message` (e.g. quota: 429 "Daily query limit reached" style message).

---

## Health

### `GET /health`

No auth. Returns `{ "status": "ok", "app": "Recall API", "environment": "dev" }`.

---

## Auth

### `GET /auth/login`

Starts Google OAuth. Sets `oauth_state`/`oauth_intent` cookies (10 min) and
302-redirects to Google's consent screen.

### `GET /auth/callback?code=…&state=…`

Completes OAuth. Verifies the state cookie, upserts the user + connected
account, sets the `recall_token` cookie, and 302-redirects to `APP_ORIGIN`
(`?connected=1` when used by the connect flow). Errors (state mismatch, account
conflict) redirect with an error query param.

### `POST /auth/logout`

Clears the session cookie.

### `GET /auth/me`

```json
{ "id": "uuid", "email": "…", "name": "…" }
```

---

## Accounts

Base `GET /accounts/…`, all auth-protected.

### `GET /accounts`

Lists connected accounts:

```json
[
  { "id": "uuid", "provider_key": "gmail", "provider_display_name": "Gmail",
    "account_identifier": "me@example.com", "display_label": "me@example.com",
    "is_active": true, "connected_at": "2026-09-15T…Z" }
]
```

### `GET /accounts/providers`

```json
[ { "key": "gmail", "display_name": "Gmail", "auth_type": "oauth", "is_active": true } ]
```

### `POST /accounts/connect`

Body: `{ "provider": "gmail" }`. Gates on the provider being active, then
returns `{ "redirect_url": "https://accounts.google.com…" }` for the browser to
follow in a popup.

### `POST /accounts/{id}/sync`

Ownership-checked, then returns immediately ("Sync started") while Gmail sync
runs in the background under its own DB session.

### `PATCH /accounts/{id}/toggle`

Flips `is_active`, returns the updated `AccountSummary`.

---

## Conversations

### `GET /conversations`

```json
[ { "id": "uuid", "title": "New chat", "started_at": "…", "last_modified_at": "…" } ]
```

### `POST /conversations`

Optional body `{ "title": "…" }`. Creates a conversation (or reuses the
draft/active one via `get_or_create`). Returns a `Conversation`.

### `GET /conversations/{id}`

Full message history, oldest first. Each message:

```json
{
  "id": "uuid", "conversation_id": "uuid",
  "direction": "user", "content": "…", "status": "sent",
  "sources": null, "created_at": "…"
}
```

### `DELETE /conversations/{id}`

Deletes the conversation and all its messages (CASCADE).

---

## Chat

### `POST /chat`

Auth **and** daily-quota gated (`plan.max_daily_queries`, `-1` = unlimited).

Request:

```json
{ "conversation_id": "uuid | null", "message": "find the signed contract",
  "account_ids": ["uuid", "…"] }
```

`account_ids` (optional) scopes the search to specific connected accounts.

Response `data`:

```json
{
  "conversation": { "id": "uuid", "title": "…", "started_at": "…", "last_modified_at": "…" },
  "message": {
    "id": "uuid", "conversation_id": "uuid", "direction": "assistant",
    "content": "…grounded answer…", "status": "sent",
    "sources": [
      { "type": "email", "ref_id": "uuid", "account_label": "…", "subject": "…",
        "sender": "…", "snippet": "…", "url": "https://mail.google.com/…" }
    ],
    "created_at": "…"
  }
}
```

Behavior details:

- **Greetings/small talk** return a canned reply, no `sources`, and are **not**
  charged against the quota.
- **No qualified hits** (below `SEARCH_MIN_SIMILARITY`, default 0.30): "I
  couldn't find anything about that in your connected accounts." — no invented
  sources.
- **All models quota-limited:** "I've reached my daily AI limit — please try
  again tomorrow."
- Quota is incremented only when a real, sourced answer is produced and stored.

---

## Users

### `GET /users/me`

```json
{
  "id": "uuid", "name": "…", "primary_email": "…", "profile_picture_url": "…",
  "plan": { "id": "uuid", "name": "free", "max_daily_queries": 20, "memory_limit_gb": 0.5 },
  "plan_usage": 3, "last_plan_reset": "…", "created_at": "…"
}
```

### `GET /users/me/stats`

```json
{
  "emails_indexed": 128, "attachments": 5, "links": 23, "conversations": 4,
  "messages_sent": 41, "quota_used": 3, "quota_limit": 20, "storage_used": 42
}
```

Live `COUNT(*)` values rendered at request time.

### `DELETE /users/me`

Body: `{ "confirm": "DELETE" }` (anything else is rejected). Wipes the user and
all tenant data (accounts → emails/attachments/links, conversations).

---

## Support

### `POST /support`

Rate limited (5/hour per IP, in-memory). Body:

```json
{ "name": "…", "email": "…", "category": "…", "message": "…" }
```

Delivers to `SUPPORT_RECIPIENT` via Gmail SMTP. No session required.