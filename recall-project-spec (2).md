# Recall — Project Spec (v1 / Hackathon Build)

## One-liner
**Recall is a chat-based memory layer for your inbox.** Ask it anything about your email — in plain language — and it answers with sources: the right message, the right document, the right link, even the right calendar event, pulled from your Gmail.

## Tagline
> "Your inbox remembers. You don't have to."

## The problem
People lose things inside their own email constantly:
- "I know I received this document, I just can't find it."
- "Did I ever get the signed contract from them?"
- "What was the link they sent for the meeting?"
- "They mentioned a date to meet — did I ever put that on my calendar?"

Existing tools (Gmail's own AI Overview, Shortwave, Missive, etc.) do keyword-adjacent search inside an inbox replacement UI. Recall is not an inbox replacement — it's a lightweight, chat-first memory layer that sits on top of Gmail and specializes in **finding things you know exist but can't locate**, plus turning what it finds into action (a calendar event).

## Target user (v1)
Someone who receives a high volume of task-relevant, document-relevant email and needs to retrieve things quickly: freelancers, ops/support staff, consultants, knowledge workers juggling multiple threads.

## Core features (v1 — Gmail only)

### 1. Conversational search
- Chat interface, not a search bar.
- User asks in natural language ("find the invoice from the design agency," "what did they say about pricing").
- Backend does semantic search over email content (embeddings), not just keyword match.
- Every answer cites its source: the email it came from, with a snippet/link back to it.

### 2. Document memory
- Extracts and indexes attachment content (PDF/DOCX text), not just filenames.
- Detects likely versions of the same document across a thread (e.g. "contract_v1," "contract_v2," "contract_FINAL").
- Answers questions like "did I get the signed version?" or "find the deck they sent before the meeting."

### 3. Link memory
- Extracts URLs mentioned in email bodies.
- Same retrieval mechanism as documents — "send me the link to that shared doc."

### 4. Event creation from email
- Detects meeting/date mentions in email content ("let's meet Tuesday at 3").
- Surfaces a proposed calendar event (title, datetime, attendees) pulled from the email.
- User confirms → event is created via Google Calendar API.
- This is the one feature where Recall *acts*, not just retrieves — key demo moment.

### Explicitly OUT of scope for v1
- Passwords / credentials — never indexed, never surfaced. Security liability, not a "later" feature.
- WhatsApp, SMS, Slack — shown in UI as "coming soon," not functional.
- Team/org cross-inbox search — roadmap slide only, no code.
- Commitment/task ledger ("who owes what") — dropped after validation; too ambiguous to extract reliably in the time available, and not personally validated as a real pain point.

## Interface
- Single chat interface as the primary surface (this is the whole app, essentially).
- A "Connected accounts" panel: shows one or more connected Gmail accounts (each with an "Add another Gmail account" option), plus WhatsApp/SMS/Slack greyed out as "coming soon."
- A channel/account filter (chips or dropdown) near the chat input to scope a query to specific Gmail account(s), or search across all.
- Every chat response shows inline source references (email snippet + link, or document/link chip).
- Lightweight settings: plan tier, usage stats.

## Auth & multi-provider model
- **Google OAuth is both login and first data source.** The Gmail account a user first signs in with creates their `User` row *and* their first `ConnectedAccount` row — but these are conceptually distinct: identity vs. granted access.
- **Login flow:** OAuth returns the user's email → check if a `User` exists with that email → create if not, log in either way → ensure a matching `ConnectedAccount` (provider: gmail) exists for that email.
- **Adding another account:** same OAuth flow, but attaches the resulting `ConnectedAccount` to the already-logged-in user instead of creating a session. If that Gmail address is already someone else's login identity, block with a clear error — no account-merging logic for v1.
- **Provider table** — a system-level registry of which providers are enabled, independent of any user's connections. Enforced centrally via one guard function (`provider_service.assert_enabled(key)`) called by every connect/sync/search action — not scattered per-route checks. Lets "coming soon" providers (WhatsApp/Slack/SMS) be backend-enforced, not just UI-greyed-out, and gives a single kill switch if a provider breaks mid-build.

## Data model (core objects)

> Updated to match the implemented v1 schema. Full rationale lives in `docs/DATABASE_DESIGN.md`.
> Naming change from spec v0: ingested mail is now **Email** (was "Message"); chat turns are now **Message** (was "ChatTurn").

```
Plan
 - id, name ("free" | "pro"), max_daily_queries (-1 = unlimited)
 - memory_limit_gb, is_active, created_at

User
 - id (UUID), name, primary_email (unique — login identity), profile_picture_url
 - plan_id (FK -> Plan), plan_usage (daily query counter), last_plan_reset
 - created_at

Provider (system-level registry of enabled providers; central kill switch)
 - id, key ("gmail" | "whatsapp" | "slack" | "sms")
 - display_name, auth_type ("oauth" | "phone_verification")
 - is_active, created_at, activated_at

ConnectedAccount
 - id, user_id (FK), provider_id (FK -> Provider)
 - account_identifier (first-class column: an email address for Gmail today,
   a phone number etc. later — needed for sidebar display and
   identity-conflict checks; never buried inside credentials)
 - display_label (e.g. "Work", "Personal")
 - credentials (JSONB — shape varies by provider:
   {access_token, refresh_token} for OAuth)
 - is_active, connected_at
 - UNIQUE(user_id, provider_id, account_identifier)

Email (an ingested message from a connected mailbox)
 - id, user_id (denormalized tenant scope), account_id (FK -> ConnectedAccount)
 - external_id (provider's immutable message id; UNIQUE per account ->
   idempotent re-syncs + Gmail deep links), thread_id
 - sender, subject, raw_body (stored — grounded answers need exact facts
   without query-time API calls), summary (LLM, Phase 2)
 - embedding (pgvector VECTOR(1536))
 - has_attachment, has_link, sent_at, created_at

Attachment (metadata only in v1 — binaries are NEVER stored; files route
 back to Gmail via deep links. Text extraction columns reserved, Phase 2)
 - id, email_id (FK), filename, mime_type, size_bytes, gmail_attachment_id
 - extracted_text, embedding, version_guess  (nullable until Phase 2)

Link
 - id, email_id (FK), url, domain, context_snippet

EventCandidate — DEFERRED to Phase 2 as its own Alembic migration:
 - id, email_id (FK), title, datetime_guess, attendees
 - status (pending/confirmed/dismissed)

Conversation
 - id, user_id (FK), title, started_at, last_modified_at

Message (one chat turn)
 - id, conversation_id (FK -> Conversation)
 - direction ("user" | "assistant"), content
 - status ("pending" | "sent" | "error")
 - sources (JSONB, assistant turns only — evidence cards referencing
   Email/Attachment/Link ids + Gmail URLs, rendered inline in the UI)
 - embedding (nullable, reserved — chat-history search out of scope in v1)
 - created_at
```

**Hybrid storage rule:** email bodies and metadata live in Postgres;
attachment binaries never do. Every citation card carries a Gmail deep link
built from `thread_id`/`external_id`, so files are fetched from Google by the
authenticated user instead of being stored by us.

**Usage stats:** insight numbers (emails indexed, attachments, links) are
computed live with COUNT queries — no drift-prone counters. Only the daily
query quota persists (`plan_usage` + `last_plan_reset`).

## Backend feature checklist
1. **Auth & identity** — Google OAuth login/callback, session identification on every request
2. **Account management** — connect/list/toggle ConnectedAccounts, enforce Provider.is_enabled
3. **Ingestion** — pull raw messages + attachments from a provider's API
4. **Storage** — persist Email/Attachment/Link rows
5. **Embedding** — embed message/attachment text on ingest, store the vector
6. **Search/retrieval** — embed a query, compare against stored vectors, return ranked matches
7. **Extraction** — LLM call per message to detect documents/links/event mentions, populate structured tables
8. **Chat/answer generation (multi-turn)** — load the recent turns of the active Conversation, rewrite follow-up queries into standalone search queries before retrieval, replay history into the LLM prompt, generate a sourced answer, persist both turns
9. **Conversation persistence** — CRUD for Conversations and their ChatTurns (create/list/get/delete, append turns); chat without this dies on refresh
10. **Actions** — confirm/dismiss an EventCandidate, create it via Calendar API
11. **SaaS layer** — usage counting per user, plan gating

## Engineering conventions (for scalability without over-building)
- Strict routers/services split: routers only handle HTTP, services hold all logic. New features = new files, not edits to existing ones.
- AI providers (embedding, LLM) wrapped behind your own service functions — never call vendor SDKs directly from business logic. Makes swapping models or mocking in tests a one-file change.
- Database migrations (Alembic) from the first real schema, not raw `create_all()` — safe, reversible schema changes as the project grows.
- Slow work (provider sync, embedding a full inbox) runs via FastAPI `BackgroundTasks`, not inline in the request — no timeouts, no blocking.
- Backend stays stateless — all per-user state in Postgres, nothing in memory — so it can be redeployed or scaled without special handling.
- Config (API keys, DB URL, OAuth secrets) via environment variables only, never hardcoded — makes deployment a config change, not a code change.
- Basic retry wrapper around external API calls (Gmail, embedding, LLM, Calendar) to absorb rate limits/flaky failures.
- Multi-turn context budget: last ~10 turns of a conversation replayed verbatim into prompts — no summarization in v1. Follow-up queries get rewritten into standalone queries (one extra flash-model call) before embedding/search; embedding "and the signed version?" literally returns garbage.

## SaaS framing
- Multi-tenant by design (OAuth-based isolation).
- Plan field on User: Free (query limit) / Pro (unlimited + calendar actions).
- Usage counter per user — foundation for both the paywall and a "your Recall stats" screen.
- Retention story for the deck: the product gets *more* valuable the longer it's connected, since more inbox history = more searchable memory. That's the moat.

## Infra & deployment

**Database: Neon (Postgres).** Genuinely permanent free tier — no card, no expiry clock — and supports the `pgvector` extension needed to store and search embedding vectors. Free tier scales compute to zero when idle rather than deleting data, so it survives days without activity during the build. Preferred over Supabase for this project specifically because Supabase's free projects pause after a week of inactivity, a real risk across a 25-day solo build with uneven daily activity.

**Backend hosting: Render.** Free web service tier, deploys directly from the GitHub repo, produces a live HTTPS URL for judges/demo video. Caveat: free-tier services sleep after inactivity with a ~30-50s cold start on the next request — hit the URL a minute before recording/presenting to avoid this showing up live.

**AI stack: Google Gemini API (free tier).** One provider covers everything: `gemini-embedding-001` for embeddings, a flash model for extraction/query-rewriting/chat answers — all behind your own `embedding_service.py` / `llm_service.py` wrappers so swapping vendors later is one file. Free tier has per-minute/per-day rate limits: fine for dev and demo, but chunk the initial inbox sync so an embedding burst can't blow through daily caps mid-sync.

**Why not one bundled platform (e.g. Railway):** Railway's free tier is a one-time trial credit, not a standing free plan, so it starts billing mid-project — a poor fit for a 25-day timeline. Splitting DB (Neon) and backend (Render) costs nothing extra — just put Neon's connection string into Render's environment variables.

**Setup order:** create the Neon project early (Day 1-2, since the connection string goes in `.env` from the start) and develop against it locally. Don't deploy to Render until Phase 3, once there's a real UI worth showing — no reason to deploy an empty skeleton.

## Folder structure
```
recall/
├── app/
│   ├── __init__.py
│   ├── main.py                        # creates the app, mounts all routers
│   ├── config.py                      # loads env vars into one place
│   ├── core/
│   │   ├── __init__.py
│   │   ├── exception_handlers.py      # global error handling
│   │   ├── logging.py
│   │   └── middleware/
│   │       ├── __init__.py
│   │       └── auth_backend.py        # validates the logged-in user on each request
│   ├── db/
│   │   ├── __init__.py
│   │   ├── connector.py               # engine + session setup
│   │   ├── db_instance.py             # session dependency for routes
│   │   └── models.py                  # Plan, User, Provider, ConnectedAccount, Email, Attachment, Link, Conversation, Message (+ EventCandidate in Phase 2)
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── accounts.py
│   │   ├── conversations.py
│   │   ├── search.py
│   │   └── events.py
│   ├── routers/
│   │   ├── __init__.py                 # optionally re-exports routers for shorter imports in main.py
│   │   ├── auth_router.py
│   │   ├── accounts_router.py
│   │   ├── conversations_router.py     # create/list/get/delete conversations + turn history
│   │   ├── search_router.py            # includes /chat — appends turns to a conversation
│   │   └── events_router.py
│   └── services/
│       ├── __init__.py
│       ├── gmail_service.py
│       ├── embedding_service.py
│       ├── llm_service.py
│       ├── search_service.py
│       ├── calendar_service.py
│       ├── conversation_service.py     # history loading, context trimming, query rewriting, turn persistence
│       └── provider_service.py         # assert_enabled() guard, checked before any provider action
├── alembic/                            # DB migrations (from the first real schema onward)
├── scripts/                            # Phase 1 dev scripts: raw ingest dump, semantic-search test harness
├── .env                                # secrets, never committed
├── .env.example                        # template of required keys, committed
├── requirements.txt
└── README.md
```
Rule of thumb for extending this structure: a new feature is almost always one new file in `routers/` plus one new file in `services/` — existing files should rarely need edits when adding something new.

## Roadmap (deck-only, not built)
- WhatsApp / SMS / Slack connectors (same extraction pipeline, new "normalizer" per source)
- Team plan: shared search across an org's inboxes with sensitivity controls
- Commitment tracking, revisited with more validation
