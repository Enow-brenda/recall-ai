# Recall — 7-Day Backend Completion Plan

**Goal:** Finish *all* backend work in 7 days (Mon–Sun) so Week 2 is pure frontend + deployment.

---

## Current State Summary

| Component | Status |
|-----------|--------|
| Auth (Google OAuth, token refresh, session cookies) | ✅ Done |
| Gmail sync (fetch 100 recent, parse headers/body/links) | ✅ Done |
| DB schema (Alembic migration applied) | ✅ Done |
| User profile/stats endpoints | ✅ Done |
| **Raw body storage** | ⚠️ `String(255)` — **must fix to `Text`** |
| **Embeddings / search / AI pipeline** | ❌ Nothing |
| **Routers for accounts, conversations, chat, events** | ❌ Nothing |
| **Services: embedding, LLM, search, calendar, conversation, provider** | ❌ Nothing |

---

## Day-by-Day Plan

### **Day 1 (Mon) — Foundation Fixes + Embeddings**
**Deliverable:** Emails ingest with 1536-dim vectors; HNSW index usable.

| Task | File(s) | Notes |
|------|---------|-------|
| Fix `raw_body` column → `Text` | New Alembic migration `0002_fix_raw_body.py` | `op.alter_column('emails', 'raw_body', type_=sa.Text())` |
| Create `embedding_service.py` | `app/services/embedding_service.py` | Wrapper around Gemini `gemini-embedding-001`; supports Matryoshka truncation to 1536 |
| Wire embeddings into `sync_account` | Edit `gmail_service.py:61-104` | After `_parse_message`, call `embed_text(raw_body)` → store in `embedding` |
| Add `embedding` to `_parse_message` return | Edit `gmail_service.py:106-130` | Return `"embedding": vector` |
| Seed `Provider` + `Plan` rows | `backend/scripts/seed_providers.py` | Run on startup or via CLI; `gmail` active, `free`/`pro` plans |
| **Test:** Run sync → verify `embedding` column populated + HNSW index works | `psql` / script | `SELECT id, embedding IS NOT NULL FROM emails LIMIT 5;` |

**Time:** ~6 hrs

---

### **Day 2 (Tue) — Semantic Search + Test Harness**
**Deliverable:** `python -m scripts.search "invoice from design agency"` returns ranked emails.

| Task | File(s) | Notes |
|------|---------|-------|
| Create `search_service.py` | `app/services/search_service.py` | `search(user_id, query_vec, account_ids=None, k=10)` → uses cosine (`<=>`) on `emails.embedding` |
| Create test script | `backend/scripts/semantic_search.py` | CLI: embed query → call search → print top 5 with sender/subject/snippet |
| Add query rewriting placeholder | `search_service.py` | For now: identity fn; Day 4 will swap to LLM call |
| **Test:** Run on your inbox with 5 real queries | — | Verify latency < 500ms, results relevant |

**Time:** ~5 hrs

---

### **Day 3 (Wed) — Attachment Text + Link Extraction + Event Candidates**
**Deliverable:** Attachments have `extracted_text` + embeddings; Links have `context_snippet`; EventCandidate table exists.

| Task | File(s) | Notes |
|------|---------|-------|
| Attachment extraction | `gmail_service.py` + new `attachment_service.py` | Use `PyMuPDF` (fitz) for PDF, `python-docx` for DOCX; store text + embed |
| Enhance link extraction | `gmail_service.py:_extract_urls` | Already returns URLs; add `context_snippet` (sentence around URL) |
| EventCandidate migration | New Alembic `0003_event_candidates.py` | Table per spec: `email_id`, `title`, `datetime_guess`, `attendees`, `status` |
| Event extraction | New `extraction_service.py` | LLM prompt: "Given email, extract meeting title, datetime guess, attendees" → upsert EventCandidate |
| Wire into `sync_account` | Edit `gmail_service.py` | After email insert, process attachments/links/events per email |
| **Test:** Sync → verify attachments have text, links have snippets, events created | — | Check a few known emails |

**Time:** ~7 hrs (heaviest day)

---

### **Day 4 (Thu) — Chat Pipeline: Query Rewrite → Search → LLM Answer → Persist**
**Deliverable:** `POST /api/chat` returns sourced answer; conversation history loads.

| Task | File(s) | Notes |
|------|---------|-------|
| Create `llm_service.py` | `app/services/llm_service.py` | Wrapper for Gemini flash: `chat(messages, tools=None)`, `rewrite_query(history, followup)` |
| Create `conversation_service.py` | `app/services/conversation_service.py` | `get_or_create_conversation()`, `add_turn()`, `get_history(limit=10)` |
| Create `provider_service.py` | `app/services/provider_service.py` | `assert_enabled("gmail")` — call at start of every provider action |
| Query rewriting | `conversation_service.py` | `rewrite_query(history, user_msg)` → standalone search query |
| Retrieval + Answer | `search_service.py` + `llm_service.py` | 1) Rewrite → 2) Embed → 3) Search → 4) Build prompt with sources → 5) LLM answer with citations |
| Persist turns | `conversation_service.py` | Save user turn + assistant turn (with `sources` JSONB) |
| **Test:** End-to-end via `curl` / Postman | — | Multi-turn: "find contract" → "and the signed version?" |

**Time:** ~7 hrs

---

### **Day 5 (Fri) — Routers: Accounts, Conversations, Chat, Events**
**Deliverable:** All backend APIs exist and wired; manual sync works; chat works via HTTP.

| Task | File(s) | Notes |
|------|---------|-------|
| `accounts_router.py` | `app/routers/accounts_router.py` | `GET /accounts` (list), `POST /accounts/sync` (manual), `PATCH /accounts/{id}/toggle` |
| `conversations_router.py` | `app/routers/conversations_router.py` | `GET /conversations`, `POST /conversations`, `GET /conversations/{id}`, `DELETE /conversations/{id}` |
| `search_router.py` (includes `/chat`) | `app/routers/search_router.py` | `POST /chat` — body: `{conversation_id?, message, account_ids?}` → returns answer + sources |
| `events_router.py` | `app/routers/events_router.py` | `GET /events/candidates`, `POST /events/candidates/{id}/confirm`, `POST /events/candidates/{id}/dismiss` |
| Mount all routers in `main.py` | Edit `app/main.py` | Add prefixes: `/accounts`, `/conversations`, `/search`, `/events` |
| **Test:** Full flow via HTTP — connect account → sync → chat → create event | Postman/curl | Verify cookies, auth, multi-account scoping |

**Time:** ~6 hrs

---

### **Day 6 (Sat) — Calendar Actions + Usage Gating + Polish**
**Deliverable:** Event creation works; free-tier query limit enforced; error handling solid.

| Task | File(s) | Notes |
|------|---------|-------|
| `calendar_service.py` | `app/services/calendar_service.py` | `create_event(access_token, title, start, end, attendees)` → Google Calendar API |
| Wire `confirm` → Calendar create | `events_router.py` + `calendar_service.py` | On confirm: fetch account creds → call Calendar API → update EventCandidate status |
| Usage middleware/dependency | `app/core/middleware/usage_guard.py` | `check_quota(user)` — increment `plan_usage`, reset daily, raise 429 if exceeded |
| Apply quota guard to `/chat` | `search_router.py` | `Depends(check_quota)` |
| Global exception handlers review | `app/core/exception_handlers.py` | Ensure all custom exceptions map to proper HTTP codes |
| **Test:** Hit quota limit → 429; create event → appears in Google Calendar | — | |

**Time:** ~5 hrs

---

### **Day 7 (Sun) — Integration Test + Bug Bash + Docs**
**Deliverable:** Clean end-to-end run; README updated; ready for frontend.

| Task | File(s) | Notes |
|------|---------|-------|
| Full integration test script | `backend/scripts/integration_test.py` | 1) Sign up → 2) Connect Gmail → 3) Sync → 4) Chat 3 turns → 5) Create event → 6) Verify stats |
| Fix any flaky tests / edge cases | — | Token refresh during long sync, empty inbox, huge attachments, rate limits |
| Update `README.md` with setup + API docs | `README.md` | Env vars, run commands, endpoint list |
| Seed script for demo data (optional) | `backend/scripts/seed_demo.py` | Pre-populate free/pro plans, gmail provider |
| Final lint/typecheck | `ruff check .`, `mypy app/` | Must pass clean |
| Commit + push | — | Tag `backend-complete` |

**Time:** ~4 hrs

---

## File Inventory — What You'll Create/Edit

| Category | Files to Create | Files to Edit |
|----------|-----------------|---------------|
| **Migrations** | `alembic/versions/0002_fix_raw_body.py`, `0003_event_candidates.py` | — |
| **Services** | `embedding_service.py`, `search_service.py`, `attachment_service.py`, `extraction_service.py`, `llm_service.py`, `conversation_service.py`, `provider_service.py`, `calendar_service.py` | `gmail_service.py` (wire embeddings, attachments, events) |
| **Routers** | `accounts_router.py`, `conversations_router.py`, `search_router.py`, `events_router.py` | `main.py` (mount routers) |
| **Middleware** | `usage_guard.py` | `exception_handlers.py` |
| **Scripts** | `semantic_search.py`, `integration_test.py` | `seed_providers.py` |
| **Schemas** | (add request/response models as needed) | `user.py`, `common.py` |

---

## Dependencies to Add (`requirements.txt`)

```
# Day 1
google-generativeai>=0.8.0   # Gemini embeddings + LLM
# Day 3
pymupdf>=1.23.0              # PDF text extraction
python-docx>=1.1.0           # DOCX text extraction
# Day 6
google-api-python-client>=2.100.0  # Calendar API
```

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Gemini rate limits during initial sync | Chunk sync: embed in batches of 20, `asyncio.sleep(1)` between batches |
| Attachment extraction fails on corrupt files | Wrap in try/except; log error, store `extracted_text=None`, continue |
| Query rewriting adds latency | Start with identity function; add LLM rewrite only if follow-ups fail |
| Calendar API scope not granted | Ensure `https://www.googleapis.com/auth/calendar.events` in OAuth scopes (add to `auth_service.py:SCOPES`) |
| HNSW index not used | Verify with `EXPLAIN ANALYZE SELECT ... ORDER BY embedding <=> $1 LIMIT 10` |

---

## Clarifying Questions (Answer Before Day 1)

1. **Calendar scope:** Current `SCOPES` in `auth_service.py` only has `gmail.readonly`. Need to add `calendar.events` — OK to modify now?
2. **Embedding model:** Use Gemini `gemini-embedding-001` (1536 dims via Matryoshka) or `text-embedding-004` (768 dims)? Spec says 1536.
3. **Free tier query limit:** What daily cap? (e.g., 20 queries/day for free, -1 for pro)
4. **Event extraction prompt:** Want me to draft the prompt, or do you have one?
5. **Frontend contract:** Any specific response shapes the frontend expects for `/chat` (streaming vs non-streaming)?

---

## Suggested Daily Rhythm

- **Morning (2-3 hrs):** Core implementation
- **Afternoon (2-3 hrs):** Integration + testing
- **Evening (1 hr):** Bug fixes, commit, prep next day

---

## Next Steps

Once you answer the 5 clarifying questions, I'll start **Day 1 artifacts**:
1. `alembic/versions/0002_fix_raw_body.py`
2. `app/services/embedding_service.py`
3. Updated `gmail_service.py` wiring