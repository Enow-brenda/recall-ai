# Recall — Database Design

Design reference for the Recall v1 schema (PostgreSQL on Neon with `pgvector`).
This document explains every table, relationship, and the reasoning behind each
decision, so future contributors can change the schema without breaking its logic.

---

## 1. Overview & Goals

Recall is a multi-tenant, chat-based memory layer over Gmail. The database must:

- Isolate every user's data (OAuth-based tenancy — no shared inboxes in v1)
- Store email content **and** embedding vectors in one place for grounded,
  cited answers
- Support semantic search (`query → vector → ranked emails`) at interactive
  latency
- Stay stateless-friendly: the backend keeps nothing in memory; all per-user
  state lives here
- Run permanently on a free tier without data loss during idle periods

**Stack:** PostgreSQL 16 hosted on [Neon](https://neon.tech), `pgvector`
extension for embeddings, SQLAlchemy 2.x models, Alembic migrations from day
one.

### Why Postgres + pgvector instead of a dedicated vector DB

1. **One source of truth.** Vectors sit next to the rows they describe, so
   tenant scoping (`WHERE user_id = ...`) and vector ranking happen in a single
   query. No dual-write consistency bugs.
2. **Neon fits the project.** Permanent free tier (no card, no expiry clock);
   compute scales to zero when idle but storage is never deleted — important
   across a long solo build with uneven activity.
3. **Scale is a non-issue here.** At tens of thousands of vectors, HNSW cosine
   search returns in single-digit milliseconds. A dedicated vector DB would add
   operational cost and a second failure domain for zero benefit.
4. **Escape hatch exists.** If scale ever demands it, embeddings are portable:
   move to any pgvector-compatible host or swap `search_service.py` to an
   external store — business logic never touches vectors directly.

### Capacity math (free tier sanity check)

- One 1536-dim vector ≈ 6 KB
- An Email row incl. body ≈ 10–20 KB total
- Neon free tier storage = 0.5 GB ≈ **25,000–50,000 emails** — several full
  inboxes before a paid plan (~$19/mo) becomes relevant.

---

## 2. Entity-Relationship Diagram

```
PLAN ──1:N──> USER <──1:N── CONVERSATION ──1:N── MESSAGE
                 │
                 ├──1:N── CONNECTED_ACCOUNT N:──1── PROVIDER
                 │             │
                 │             └──1:N── EMAIL ──1:N── ATTACHMENT
                 │                        └────1:N── LINK
                 └── (user_id denormalized onto Email)

MESSAGE.sources (JSONB) ──references──> Email / Attachment / Link ids

EventCandidate (email_id FK) — deferred to Phase 2 migration
```

## 3. Cardinalities & Delete Behavior

| # | Relationship | Cardinality | On delete | Rationale |
|---|---|---|---|---|
| 1 | Plan → User | 1 : N | RESTRICT | Plan rows are configuration; never orphan users |
| 2 | User → ConnectedAccount | 1 : N | CASCADE | Deleting a user wipes their connections |
| 3 | Provider → ConnectedAccount | 1 : N | RESTRICT | Registry rows are permanent system config |
| 4 | ConnectedAccount → Email | 1 : N | CASCADE | Disconnecting a mailbox removes its mail |
| 5 | User → Email | 1 : N | CASCADE | Denormalized tenant scope; cleanup path |
| 6 | Email → Attachment | 1 : N | CASCADE | Artifacts cannot outlive their email |
| 7 | Email → Link | 1 : N | CASCADE | Same |
| 8 | User → Conversation | 1 : N | CASCADE | Chat history belongs to the tenant |
| 9 | Conversation → Message | 1 : N | CASCADE | Turns die with their conversation |

No many-to-many relationships exist in v1: identity conflicts between users
are blocked at connect time (no account merging), and chat messages span
accounts through search results rather than ownership.

---

## 4. Table Reference

All primary keys are UUIDs (`gen_random_uuid()`). All timestamps are
`TIMESTAMPTZ`. Enums are native PostgreSQL types.

### Enums

| Enum | Values |
|---|---|
| `auth_type` | `oauth`, `phone_verification` |
| `message_direction` | `user`, `assistant` |
| `message_status` | `pending`, `sent`, `error` |

### 4.1 Plan

Billing-tier definitions as data (not hardcoded), so tiers can change without
a deploy.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| name | TEXT UNIQUE | `"free"`, `"pro"` |
| max_daily_queries | INT | `-1` = unlimited |
| memory_limit_gb | NUMERIC(6,2) | quota display |
| is_active | BOOL | default true |
| created_at | TIMESTAMPTZ | |

### 4.2 User

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| name | TEXT null | from Google profile |
| primary_email | TEXT UNIQUE | login identity |
| profile_picture_url | TEXT null | Google avatar |
| plan_id | FK → Plan | default free tier |
| plan_usage | INT | queries used today; reset daily |
| last_plan_reset | TIMESTAMPTZ | quota reset marker |
| created_at | TIMESTAMPTZ | |

### 4.3 Provider (system registry)

Which providers exist and whether they may be used — enforced centrally by
`provider_service.assert_enabled(key)`, not scattered per-route.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| key | TEXT UNIQUE | `gmail`, `whatsapp`, `slack`, `sms` |
| display_name | TEXT | UI label |
| auth_type | auth_type enum | oauth vs phone flow |
| is_active | BOOL | kill switch; only `gmail` seeded active |
| created_at | TIMESTAMPTZ | |
| activated_at | TIMESTAMPTZ null | when the provider went live |

### 4.4 ConnectedAccount

One granted access from a user to a mailbox/number on a provider.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | FK → User CASCADE | owner |
| provider_id | FK → Provider RESTRICT | which service |
| account_identifier | TEXT | email today; phone number later |
| display_label | TEXT null | "Work", "Personal" |
| credentials | JSONB | `{access_token, refresh_token}` for OAuth |
| is_active | BOOL | user can toggle a connection off |
| connected_at | TIMESTAMPTZ | |

Constraint: `UNIQUE(user_id, provider_id, account_identifier)` — prevents
duplicate connections of the same mailbox by the same user.

### 4.5 Email (ingested mail)

The searchable memory. Named `Email` (not "Message") to keep it unambiguous
next to the chat table.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | FK → User CASCADE | denormalized tenant scope |
| account_id | FK → ConnectedAccount CASCADE | source mailbox |
| external_id | TEXT | provider's immutable message id |
| thread_id | TEXT null | Gmail deep-linking |
| sender | TEXT null | `"Name <addr>"` |
| subject | TEXT null | |
| raw_body | TEXT | stored body text (see hybrid model) |
| summary | TEXT null | LLM-generated, Phase 2 |
| embedding | VECTOR(1536) null | filled at ingest |
| has_attachment | BOOL | fast filters |
| has_link | BOOL | |
| sent_at | TIMESTAMPTZ | the email's own date |
| created_at | TIMESTAMPTZ | ingest time |

Constraints/indexes:

- `UNIQUE(account_id, external_id)` — idempotent re-syncs (no duplicates)
- HNSW index on `embedding` with `vector_cosine_ops`,
  partial `WHERE embedding IS NOT NULL`
- B-tree `(user_id, sent_at DESC)` — recent-first listing per tenant

### 4.6 Attachment

Metadata + routing only in v1. Binaries are never stored.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| email_id | FK → Email CASCADE | |
| filename | TEXT | e.g. `contract_FINAL.pdf` |
| mime_type | TEXT null | |
| size_bytes | INT null | |
| gmail_attachment_id | TEXT null | re-fetch via Gmail API if ever needed |
| extracted_text | TEXT null | reserved — Phase 2 document memory |
| embedding | VECTOR(1536) null | reserved — Phase 2 |
| version_guess | TEXT null | reserved — "v1"/"v2"/"final" heuristic |
| created_at | TIMESTAMPTZ | |

### 4.7 Link

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| email_id | FK → Email CASCADE | |
| url | TEXT | normalized |
| domain | TEXT null | enables "only Google Docs links"-style filters |
| context_snippet | TEXT null | sentence around the URL |
| created_at | TIMESTAMPTZ | |

### 4.8 Conversation

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | FK → User CASCADE | |
| title | TEXT | default `'New chat'` |
| started_at | TIMESTAMPTZ | creation time |
| last_modified_at | TIMESTAMPTZ | auto-updated on new turns |

### 4.9 Message (one chat turn)

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| conversation_id | FK → Conversation CASCADE | |
| direction | message_direction | who spoke |
| content | TEXT | raw turn text |
| status | message_status | delivery state |
| sources | JSONB null | assistant turns only — evidence cards |
| embedding | VECTOR(1536) null | reserved; chat-history search is out of scope in v1 |
| created_at | TIMESTAMPTZ | |

Index: `(conversation_id, created_at)` — history loading in order.

A `sources` card shape (illustrative):

```json
{
  "type": "email | attachment | link",
  "ref_id": "<uuid>",
  "snippet": "they quoted €4,200, deadline June 30",
  "gmail_url": "https://mail.google.com/mail/u/0/#all/<thread_id>"
}
```

---

## 5. Design Decisions & Rationale

1. **UUID primary keys.** Non-guessable identifiers for a multi-tenant SaaS;
   safe to expose in URLs and citation cards. Sequential bigint IDs leak
   volume and enable enumeration.

2. **`Email` vs `Message` naming split.** The original spec called ingested
   mail "Message" and chat turns "ChatTurn". Renaming to `Email` (inbox data)
   and `Message` (chat bubble) removes constant ambiguity in code, docs, and
   conversation.

3. **Hybrid storage model — bodies yes, binaries never.**
   - Email bodies are stored because building any embedding requires reading
     the full text at ingest anyway; keeping it costs ~10–20 KB/row and makes
     answers instant and factually exact. Dropping bodies would force a Gmail
     API round-trip on *every* answer (+ latency, rate limits, token-refresh
     dependency at query time).
   - Attachment binaries are never stored. Google already provides a secure,
     authenticated viewer; every evidence card deep-links to Gmail via
     `thread_id`. Storing files would add object storage, security surface,
     and zero user value.
   - Attachment *text* extraction is deferred to Phase 2 (nullable columns
     already reserved, so no future breaking migration).

4. **Idempotent ingestion via `external_id`.** Gmail's immutable message id,
   unique per `(account_id, external_id)`, lets sync jobs run repeatedly
   without duplicates and powers "Open in Gmail" links.

5. **`account_identifier` instead of `account_email`.** The connection's
   identity is provider-specific: an email address for Gmail today, a phone
   number for WhatsApp/SMS later. A neutral column name avoids a rename
   migration when non-email providers ship.

6. **Denormalized `user_id` on Email.** Emails already belong to an account,
   and accounts belong to a user — but every search filter and stats COUNT
   starts at the tenant level. Carrying `user_id` directly turns those into
   single-table indexed scans and guarantees isolation even if a join were
   forgotten.

7. **Embeddings: 1536 dims, partial HNSW index.** Gemini's
   `gemini-embedding-001` outputs up to 3072 dims but supports Matryoshka
   truncation; 1536 keeps ~98% retrieval quality at half the storage/index
   size. The HNSW index is partial (`WHERE embedding IS NOT NULL`) so ingest
   rows waiting for embedding don't bloat it. Cosine distance (`<=>`) matches
   how Gemini normalizes text embeddings.

8. **JSONB exactly where shapes evolve, nowhere else.** `credentials` varies
   by provider/auth type; `sources` cards will gain fields as the UI grows.
   Both change frequently and are read as opaque blobs by most code paths —
   ideal JSONB use. Everything queried relationally stays in columns.

9. **Usage stats: live COUNTs + two counters.** Insight numbers ("N emails · N
   attachments · N links") are computed with `COUNT(*)` at request time — at
   this scale it's instant and can never drift from reality. Only the daily
   quota needs stored state (`plan_usage`, `last_plan_reset`) because it must
   increment cheaply and reset deterministically.

10. **EventCandidate deferred, not dropped.** Event extraction is Phase 2
    work; creating the table now would violate lean-v1. Alembic makes adding
    it later a single forward migration with no edits to existing tables.

11. **Native PG enums for fixed vocabularies.** `message_direction`, etc., are
    closed sets enforced by the type system. Anything expected to grow
    (provider keys, plan names) is a plain unique TEXT column backed by rows
    instead.

12. **`TIMESTAMPTZ` everywhere.** Mail arrives from every timezone; naive
    timestamps are a latent bug class. All times stored absolute, rendered
    local in the UI.

13. **Delete policy: CASCADE down ownership chains, RESTRICT on config.**
    Tenant data dies with the tenant; system registry rows (Provider, Plan)
    refuse deletion while referenced.

---

## 6. Index Strategy Summary

| Index | Serves |
|---|---|
| `users.primary_email` UNIQUE | login lookup, OAuth upsert |
| `providers.key` UNIQUE | `assert_enabled` guard |
| `connected_accounts (user_id, provider_id, account_identifier)` UNIQUE | duplicate-connection prevention |
| `connected_accounts.user_id` | sidebar listing |
| `emails (account_id, external_id)` UNIQUE | idempotent sync |
| `emails.embedding` HNSW cosine, partial | semantic search |
| `emails (user_id, sent_at DESC)` | recent-mail listing, stats |
| `attachments.email_id`, `links.email_id` | cascade lookups, per-email joins |
| `conversations.user_id` | sidebar listing |
| `messages (conversation_id, created_at)` | ordered history load |

---

## 7. Evolution Path (Phase 2+)

- **Migration `000X_add_event_candidates`:** EventCandidate table (FK →
  Email), status enum; extraction pipeline populates it.
- **Attachment memory backfill:** populate `extracted_text` + `embedding` for
  PDF/DOCX attachments; add `version_guess` heuristic pass.
- **If scale demands:** move embeddings to a dedicated store behind
  `search_service.py`; schema unchanged for everything else.
- **Multi-provider future:** WhatsApp/SMS rows reuse ConnectedAccount with
  `account_identifier` = phone number; no structural change.
