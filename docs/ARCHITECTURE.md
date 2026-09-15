# Recall — System Architecture

This document describes how the Recall backend is put together and walks through
the main request flows end to end. It is the map to `backend/app/` — read it
alongside the [database design](DATABASE_DESIGN.md) and the
[API reference](API.md).

---

## 1. High-level topology

```
                          ┌──────────────────┐
                          │   React (Vite)   │   Netlify (SPA, /chat /settings /auth/callback)
                          └────────┬─────────┘
                                   │ HTTPS (CORS allowlist: localhost:5173 + netlify origin)
                                   ▼
                          ┌──────────────────┐          ┌─────────────────────┐
                          │     FastAPI      │          │  Neon Postgres 16    │
                          │  (uvicorn, your  │◄────────►│  + pgvector          │
                          │   own host)      │          │  HNSW cosine index   │
                          └───┬──────┬───────┘          └─────────────────────┘
                              │      │
                ┌─────────────┤      ├───────────────────────────┐
                ▼             ▼      ▼                           ▼
        ┌──────────────┐ ┌──────────┐ ┌──────────────────┐ ┌───────────┐
        │  Google OAuth│ │ Gmail API│ │ OpenRouter LLM   │ │ Gemini LLM│
        │  (auth flow) │ │ (sync)   │ │ (openrouter/free)│ │ +embed    │
        └──────────────┘ └──────────┘ └──────────────────┘ └───────────┘
```

Everything behind FastAPI is served through small HTTP routers
(`app/routers/*`) that own only request/response concerns; business logic lives
in `app/services/*`. There is no task queue or worker process — long-running
work (Gmail sync) runs after the response is sent via FastAPI
`BackgroundTasks`.

---

## 2. Configuration (`app/config.py`)

`pydantic-settings` `Settings` class reads `backend/.env`. Everything else
imports the cached `settings` singleton. Notable knobs:

- `LLM_PROVIDER` = `auto | gemini | openrouter` — controls chat generation
  routing (Section 5).
- `SEARCH_MIN_SIMILARITY` — relevance gate for source cards (Section 4.2).
- `OPENROUTER_*` — free chat generation provider.
- `APP_ORIGIN` / `CORS_ORIGINS` — where Google returns after login and which
  browser origins may call the API.
- `SMTP_*` / `SUPPORT_RECIPIENT` — contact-form delivery.

---

## 3. Auth & account lifecycle

### 3.1 Login (`/auth/login` → `/auth/callback`)

1. `GET /auth/login` generates an OAuth `state`, sets two short-lived httpOnly
   cookies (`OAUTH_STATE_COOKIE`, `OAUTH_INTENT_COOKIE` = `{"mode":"login"}`),
   and 302-redirects to Google.
2. `GET /auth/callback`:
   - verifies the `state` cookie ✓,
   - exchanges the code for tokens, fetches the Google profile,
   - `resolve_login` (`auth_service.py`) upserts the `User` and its
     `ConnectedAccount`, **preserving the stored refresh token on later
     logins** (Google only returns a refresh token on first consent),
   - sets a signed JWT in the `recall_token` httpOnly cookie,
   - 302-redirects to `APP_ORIGIN`.

### 3.2 Connect flow (same callback, different intent)

POST `/accounts/connect` gates on the provider being active, then starts the
same OAuth trip with `OAUTH_INTENT_COOKIE = {"mode":"connect"}`. On callback the
user must already be logged in (`_optional_current_user`); the account is
attached to the existing user — no new session — and an initial background sync
is scheduled.

### 3.3 Sync (background, after response)

Three paths, all fired via `BackgroundTasks` **after** the HTTP response:

| Path | Triggers |
|---|---|
| `sync_account_by_id(account_id)` | `POST /accounts/{id}/sync` |
| `run_initial_sync(user_id, email)` | connect flow |
| `run_sync_for_active_accounts(user_id)` | every login |

Each opens **its own** `SessionLocal()` — never the request session — so it can
outlive the request. Per account it:

1. refreshes the access token if expired,
2. lists the **last 100** messages (`SYNC_BATCH_SIZE`),
3. skips any `external_id` already stored (idempotent — retries are free),
4. parses each message: headers, plain/text body, links, attachments,
5. embeds `subject + "\n\n" + body` (Gemini, `RETRIEVAL_DOCUMENT`),
6. downloads and text-extracts PDF/DOCX attachments and embeds the extract,
7. bulk-inserts emails/attachments/links with `ON CONFLICT DO NOTHING`,
8. commits once.

**Transaction hygiene** (important with Neon): the request session commits
before a background sync is scheduled, and the sync session ends its read
transaction before the slow per-message Gmail loop — a connection sitting
idle-in-transaction for minutes gets terminated by the provider and turned a
teardown commit into a 500 (see `get_db` in `app/db/db_instance.py`).

### 3.4 Account management

`GET /accounts` lists connections (joined with Provider, no credentials ever
serialized); `PATCH /accounts/{id}/toggle` flips `is_active` (inactive accounts
are skipped by sync); `DELETE /users/me` removes the account + all tenant data
(needs `{"confirm":"DELETE"}`).

---

## 4. Chat pipeline (`POST /chat`)

```
check_quota ──> get_or_create conversation ──> store user turn
      └──> history (last 10 turns)
      └──> _is_small_talk?  ──yes──> canned reply (no search, no LLM, no charge)
      └──> rewrite_query(context, message)   # standalone follow-ups
      └──> embed query (RETRIEVAL_QUERY)
      └──> semantic search (emails + attachment extracts)  ──no qualified hits──> "couldn't find anything"
      └──> LLM grounded answer([1]..[k] sources)
      └──> map citations to real Source cards (JSONB)  ──> store assistant turn
      └──> increment_usage (only if a real, sourced answer was produced)
```

### 4.1 Search (`services/search_service.py`)

One 1536-dim metric space over two pgvector columns:

- `emails.embedding` — subject + body
- `attachments.embedding` — extracted attachment text

Query is embedded with `task_type=RETRIEVAL_QUERY` (same space as stored
`RETRIEVAL_DOCUMENT` vectors) and ranked by cosine distance (`<=>`), computed
inside Postgres over the partial HNSW index. Search **never raises**: an
unembeddable query simply yields no hits.

### 4.2 Relevance gate (`SEARCH_MIN_SIMILARITY=0.30`)

Only hits with `cosine_distance <= 1 - min_similarity` qualify. Below that the
chat returns "I couldn't find anything about that…" with **no** source cards —
this prevents the LLM from fabricating cited sources for weak matches.
Lowering the value makes matching more permissive.

### 4.3 Small talk short-circuit

`_is_small_talk` (regex-clean + keyword/phrase sets) catches greetings, thanks,
"ok", etc. — canned `SMALL_TALK_REPLY`, no search, no LLM call, no quota charge.

### 4.4 LLM generation (`services/llm_service.py`)

Generation (chat answers + query rewriting) is a **provider chain**:

```
desired provider chain =
      openrouter  (if key set AND provider is auto|openrouter)
      gemini      (always appended as final fallback)
perform = try each; break on success
```

- **OpenRouter** (`_openrouter_chat`): OpenAI-compatible call to
  `openrouter/free` — free router over `:free` model variants.
- **Gemini** (`_gemini_generate`): tries `[gemini-3.6-flash, gemini-2.5-flash,
  gemini-2.0-flash, gemini-1.5-flash]` in order (list derived from the current
  model catalog). Each model has a small daily free-tier cap, so a 429
  (`_is_quota_error`) **cycles to the next model** instead of failing.
- If every model is quota-limited: raise `LLMQuotaLimited` → the UI gets
  "I've reached my daily AI limit — please try again tomorrow." Any other
  failure surfaces as a retry message.

Embeddings are **always Gemini** (`gemini-embedding-001`, 1536-dim Matryoshka
output, batched with backoff) — the `EMBEDDING_DIMENSION` constant must agree
with the `Vector(1536)` DB columns.

### 4.5 Conversation persistence

Each turn is stored as a `Message` (`direction` user/assistant,
`sources` JSONB for assistant turns). History is replayed (last ~10 turns, user
message excluded) into the query-rewrite step so follow-ups resolve properly.
Conversations can be listed (`last_modified_at DESC`), fetched per-message, and
deleted.

---

## 5. Usage gating & stats

- `check_quota` (dependency on `/chat`): enforces `plan.max_daily_queries`
  (`-1` = unlimited) on top of the signed-in user.
- `maybe_reset_usage`: zeroes `plan_usage` when the UTC calendar day rolls
  over (`last_plan_reset`), so the free tier resets at midnight UTC.
- `increment_usage`: charges **one** unit only after a real, sourced answer was
  produced and persisted — failed attempts and small talk are free.
- `GET /users/me/stats` returns **live** counts (`COUNT(*)` at request time —
  can't drift) for emails, attachments, links, conversations, messages, quota,
  and rough storage usage.

---

## 6. Support form (`POST /support`)

In-memory per-IP rate limit (5/hour); `support_service` sends the payload to
`SUPPORT_RECIPIENT` over Gmail SMTP (SSL, app password). No DB involvement —
the session-less endpoint ends immediately.

---

## 7. Resilience & operational notes

- **Never-raise guess-free paths:** embedding and search degrade to
  "no results"/`None` instead of 500ing; sync background failures are logged
  and reachable again via the manual `/sync` endpoint.
- **Session teardown** (`db_instance.get_db`): commit on success, rollback on
  error, close is guarded — a failed `COMMIT/ROLLBACK` is logged, never allowed
  to masquerade as an unrelated 500.
- **Connection pool:** `pool_pre_ping=True` + `pool_recycle=300` keeps idle
  Neon connections fresh (compute scales to zero after idle).
- **CORS:** fixed allowlist (`http://localhost:5173` + the Netlify app) with
  credentials.
- **Monitoring:** structured logging via `app/core/logging.py`; every unhandled
  error is captured by `register_exception_handlers` with `logger.exception`.

---

## 8. Directory map

| Path | Responsibility |
|---|---|
| `app/main.py` | app factory, CORS, exception handlers, router wiring |
| `app/config.py` | env-driven settings |
| `app/routers/` | `auth`, `accounts`, `conversations`, `search` (chat), `support`, `users` |
| `app/services/` | `gmail` (sync), `auth` (OAuth), `embedding`, `llm`, `search`, `attachment`, `conversation`, `provider`, `support`, `user`, `serializers` |
| `app/core/middleware/` | `auth_backend` (JWT cookie → user), `usage_guard` (quota) |
| `app/db/` | `connector` (engine/session), `db_instance` (`get_db`), `models` |
| `app/schemas/` | Pydantic request/response models |
| `alembic/` | migrations (see DATABASE_DESIGN §7) |