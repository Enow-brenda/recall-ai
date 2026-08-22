# Recall — Build Plan (Aug 21 – Sep 15, 2026)

Assumes ~2 hrs/day, solo. 4 phases, each ending in something demoable — never go more than a few days without something you can click through, so you always know where you actually stand.

---

## PHASE 1 — Foundation (Aug 21–27)
**Goal by end of week: you can log in with Google, and your own Gmail messages are sitting in a database, embedded and searchable via a raw script (no UI needed yet).**

- **Day 1 (Aug 21, today):** Project scaffolding. Stack is decided: FastAPI backend + React frontend later, Neon Postgres with pgvector, Gemini API for embeddings + LLM. Create the Neon project today (the connection string lives in `.env` from day one), set up Alembic, get "hello world" running locally. No deploy yet — Render comes in Phase 3 once there's a real UI worth showing.
- **Day 2:** Google Cloud project + OAuth consent screen + Gmail API + Calendar API enabled. Get OAuth login working — user signs in, you receive and store a token.
- **Day 3:** Pull real Gmail messages via the API for your own account. Just log them to console/DB raw — no processing yet. Confirm you can read Inbox + Sent.
- **Day 4:** Design and create your actual DB schema (Provider, User, ConnectedAccount, Message, Attachment, Link, EventCandidate, Conversation, ChatTurn — from the spec doc) as an Alembic migration. Store the raw messages properly. Creating Conversation/ChatTurn now costs nothing and means chat history just works when the UI arrives.
- **Day 5:** Add embeddings — pick your embedding model/API, embed message content on ingest, store the vector.
- **Day 6:** Build a bare-bones semantic search script (no UI): give it a text query, embed it, return the closest matching messages. Test it on your own inbox with real queries.
- **Day 7:** Buffer / catch-up. If ahead, start attachment text extraction (PDF/DOCX → text).

✅ **End of Phase 1 checkpoint:** you can run a script, type a question, and get back a relevant real email of yours. This is the core bet of the whole project — validate it works before building anything else on top.

---

## PHASE 2 — Core AI pipeline (Aug 28 – Sep 3)
**Goal by end of week: documents, links, and event candidates are being extracted automatically, and it all sits behind a simple chat endpoint.**

- **Day 8:** Attachment text extraction (if not done) + embed attachment content separately from message content.
- **Day 9:** Link extraction from email bodies — regex/parse URLs, store with context snippet.
- **Day 10:** Build the extraction prompt for event candidates: given an email, does it mention a meeting/date? Extract title, datetime guess, attendees. Test against real emails, tune the prompt.
- **Day 11:** Build the chat "router" — given a user message, decide: is this a search query, a document/link ask, or something else? Route to the right retrieval function. Include **query rewriting**: before embedding, rewrite the user message into a standalone search query using the last few turns of the conversation ("and the signed version?" → "signed version of the contract from Acme") — follow-ups return garbage otherwise.
- **Day 12:** Wire retrieval results back into an LLM call that generates a grounded answer with source references (not just raw search results — an actual synthesized response), with the conversation's recent turns (~10) replayed into the prompt. Persist each exchange: user turn + assistant turn (with sources JSONB) onto the Conversation.
- **Day 13:** Test the whole pipeline end-to-end via API calls (Postman/curl is fine, still no real UI). Fix obvious extraction/retrieval quality issues.
- **Day 14:** Buffer / catch-up.

✅ **End of Phase 2 checkpoint:** you can hit one API endpoint with a chat message and get back a real, sourced answer pulled from your actual inbox — including finding documents/links and proposing events. This is your whole backend, proven.

---

## PHASE 3 — Interface + multi-account (Sep 4–10)
**Goal by end of week: the UI mockup is a real, working app connected to your backend.**

- **Day 15:** Build the chat interface shell (use the mockup as your reference) — message list, input box, connect it to your chat endpoint. Wire in the **conversation sidebar**: list past Conversations, "New chat" button, switching loads ChatTurn history from the backend (the tables already exist since Day 4).
- **Day 16:** Render source citations properly in the UI — evidence cards for emails/documents/links inline in chat.
- **Day 17:** Build the event confirmation card — Create/Edit/Dismiss buttons, wire "Create" to actually call the Calendar API and create a real event.
- **Day 18:** Multi-account support: allow connecting a second Gmail account, store it as a separate ConnectedAccount, tag messages with account_id.
- **Day 19:** Build the account filter (chips/dropdown) — scope search to specific connected account(s).
- **Day 20:** Connected accounts sidebar panel + "coming soon" channels (WhatsApp/Slack/SMS, static UI only).
- **Day 21:** Buffer / polish pass — responsive check on mobile, fix any broken flows.

✅ **End of Phase 3 checkpoint:** a stranger could open your deployed app, log in with their own Google account, and actually use it.

---

## PHASE 4 — SaaS layer + submission (Sep 11–15)
**Goal: submission-ready. This week is about polish, proof, and packaging — not new features.**

- **Day 22:** Add plan/usage layer: query counter per user, free-tier limit, visible usage bar + "Upgrade to Pro" button (doesn't need real billing — just needs to visibly exist).
- **Day 23:** Full run-through as a brand-new user — sign up cold, connect Gmail, ask real questions, create an event. Fix anything broken. Write your README (setup instructions matter — it's a required part of the repo submission).
- **Day 24:** Build the 10-slide deck (Problem, Solution, Target Users, Features, Architecture, AI tech used, Impact, Roadmap, incl. multi-channel/team/commitment-ledger as future work).
- **Day 25 (Sep 15, deadline):** Record the 5-minute demo video, do final submission (form, repo link, video, deck). Submit early in the day if at all possible — don't cut it to the wire.

---

## Ground rules to keep yourself on track
- **Don't touch the frontend before Phase 3.** Everything before that is API calls and scripts — it's tempting to build UI early because it feels like progress, but the search/extraction quality is the actual product. Get that right first.
- **If Phase 1 or 2 slips, cut scope, not the timeline.** First thing to cut: event creation. Second: multi-account. Core search + document/link retrieval is the non-negotiable heart of the demo.
- **Test on your own real inbox from Day 3 onward.** You're your own best QA — if a feature doesn't feel useful to you personally, it won't land with judges either.
