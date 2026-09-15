# Recall

> "Your inbox remembers. You don't have to."

Recall is a chat-based memory layer for your inbox. Ask anything about your email in plain language — *"find the invoice from the design agency"*, *"did I ever get the signed contract?"*, *"what was the link they sent for the meeting?"* — and get a grounded answer backed by sources: the right message, the right document, the right link, pulled from your Gmail.

Recall is not an inbox replacement. It's a lightweight, chat-first search layer that specializes in finding things you know exist but can't locate — and turning what it finds into action.

## Features

- **Conversational semantic search** — natural-language questions answered with embeddings-based (pgvector) search over email content and attachment text; every answer cites its sources
- **Document memory** — attachment text is extracted (PDF/DOCX) and embedded, so you can search *inside* documents, not just filenames
- **Link memory** — every URL in an email body is extracted, deduplicated, and searchable ("send me that shared doc link")
- **Multi-account Gmail** — connect several accounts, toggle them active/inactive, manual or on-login background sync
- **Chat with source cards** — answers render with evidence chips that deep-link back to the message in Gmail
- **Conversation history** — sidebar with past chats, new-chat, load-history, and delete-conversation
- **Usage gating & storage stats** — daily query quota per plan (free/pro) resetting at UTC, plus live counts of emails/attachments/links on the Settings page
- **Smart weak-match handling** — greetings and queries with no relevant matches get honest responses instead of fabricated cited sources (tunable `SEARCH_MIN_SIMILARITY`)
- **Contact form** — `POST /support` delivers the message to your inbox via Gmail SMTP (rate-limited)
- **Mock API mode** — the frontend can run fully against fixture data for UI work without a backend

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11, FastAPI, SQLAlchemy 2.x, Alembic, psycopg3 |
| Database | PostgreSQL ([Neon](https://neon.tech)) with `pgvector` (HNSW cosine index) |
| Embeddings | Google Gemini (`gemini-embedding-001`) |
| Chat LLM | [OpenRouter](https://openrouter.ai) `openrouter/free` primary, Gemini fallback (auto-fails-over per model on daily quota) |
| Auth | Google OAuth 2.0, JWT signed httpOnly cookie |
| Integrations | Gmail API, Gmail SMTP (support dispatcher) |
| Frontend | React 19, Vite 8, TypeScript, Tailwind CSS 4, react-router |
| Deploy | Frontend on Netlify (SPA redirects), backend self-hosted |

The complete database schema and the reasoning behind every design decision live in [docs/DATABASE_DESIGN.md](docs/DATABASE_DESIGN.md).

## Project Structure

```
recall/
├── backend/
│   ├── alembic/            # migrations + migration config
│   ├── scripts/
│   │   └── seed_providers.py   # seeds Provider/Plan rows (first run only)
│   ├── app/
│   │   ├── config.py       # pydantic-settings env loading
│   │   ├── main.py         # FastAPI app, CORS, exception handlers
│   │   ├── core/           # logging, exceptions, auth middleware, usage guard
│   │   ├── db/             # engine/session factory + SQLAlchemy models
│   │   ├── routers/        # HTTP endpoints (auth, accounts, conversations, chat, support, users)
│   │   ├── schemas/        # Pydantic request/response models
│   │   └── services/       # business logic (gmail, embedding, llm, search,
│   │                       # attachment, conversation, auth, provider, support, user)
│   ├── requirements.txt
│   └── pyproject.toml      # tooling + pinned deps (uv.lock)
└── frontend/               # React + Vite UI
    ├── src/api/            # typed API client + mock fixtures
    ├── src/components/     # chat, sidebar, modals
    ├── src/context/        # auth/chat state
    ├── src/layout/         # app shell
    └── src/pages/          # Landing, AuthCallback, Chat, Settings
```

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+ (frontend)
- A [Neon](https://neon.tech) project with `pgvector` enabled (free tier works)
- A [Gemini API key](https://aistudio.google.com/apikey) — required; embeddings always use Gemini
- A Google Cloud project with the **Gmail API** enabled and an OAuth 2.0 Client ID (Web application), redirect URI `http://localhost:8000/auth/callback`
- Optional: an [OpenRouter](https://openrouter.ai/keys) key for free chat generation (email signup, no card)

### 1. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1        # Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
# or, if you use uv:  uv sync
```

Copy `.env.example` to `.env` and fill it in:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Neon connection string — prefer the **direct** ("Primary", no `-pooler`) host: `postgresql+psycopg://...` |
| `GEMINI_API_KEY` | yes | Google AI Studio key (embeddings + chat fallback) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | yes | Google Cloud OAuth client |
| `OAUTH_REDIRECT_URI` | yes | `http://localhost:8000/auth/callback` |
| `JWT_SECRET` | yes | `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `APP_ORIGIN` | yes | Where Google returns after sign-in (`http://localhost:5173/auth/callback` locally) |
| `OPENROUTER_API_KEY` | no | Free chat generation; leave empty to stay on Gemini |
| `OPENROUTER_BASE_URL` / `OPENROUTER_MODEL` | no | Defaults to `openrouter.ai/api/v1` / `openrouter/free` |
| `LLM_PROVIDER` | no | `auto` (OpenRouter only if key set) \| `gemini` \| `openrouter` |
| `SEARCH_MIN_SIMILARITY` | no | Relevance gate (0.30 default); lower = more permissive |
| `SMTP_*` / `SUPPORT_RECIPIENT` | no | Gmail app password to deliver support-form submissions |
| `ENVIRONMENT` | no | `dev` by default |

Apply migrations and seed the registry (once):

```bash
alembic upgrade head
python scripts/seed_providers.py
```

Run the server:

```bash
uvicorn app.main:app --reload        # or: uv run uvicorn app.main:app --reload
```

Interactive API docs: http://127.0.0.1:8000/docs.

### 2. Frontend

```bash
cd frontend
npm install
```

Create `.env.local`:

```
VITE_API_URL=http://localhost:8000
VITE_USE_MOCK_API=false        # true to run against fixture data without a backend
```

Run in dev:

```bash
npm run dev      # http://localhost:5173
```

Production build + lint:

```bash
npm run build
npm run lint
```

## API Overview

Base path | Endpoints | Purpose
|---|---|---|
| `/health` | GET | Liveness + app/env |
| `/auth` | GET `/login`, GET `/callback`, POST `/logout`, GET `/me` | Google OAuth sign-in/sign-up, session |
| `/accounts` | GET `""`, GET `/providers`, POST `/connect`, POST `/{id}/sync`, PATCH `/{id}/toggle` | Manage connected Gmail accounts; sync runs in the background after the response |
| `/conversations` | GET `/`, POST, GET `/{id}`, DELETE `/{id}` | Chat history CRUD |
| `/chat` | POST | Ask a question → grounded answer with sources |
| `/users` | GET `/me`, GET `/me/stats`, DELETE `/me` | Identity + live usage/storage statistics |
| `/support` | POST | Rate-limited contact form → email |

## Deployment

The frontend deploys automatically to Netlify from this repo (`netlify.toml` runs `npm ci && npm run build` and ships `frontend/dist` with SPA redirects to `index.html`). The FastAPI backend runs as your own service and must be reachable from the browser — set `VITE_API_URL` at build time and allow the frontend origin in the backend's `CORS_ORIGINS` / `APP_ORIGIN`.

## Status

- [x] Phase 1 — Foundation: Neon + `pgvector`, schema/migrations, Google OAuth (login + connect flow), Gmail sync, embeddings, semantic search
- [x] Phase 2 — Chat pipeline: attachment/link extraction, LLM answers with source cards, conversation persistence, usage gating, multi-provider LLM (OpenRouter + Gemini fallback)
- [x] Phase 3 — Frontend: chat UI with conversation sidebar, connected-accounts management, Settings (usage/storage stats), pricing
- [ ] Next — host the backend, event/calendar extraction, WhatsApp/SMS/Slack providers

## License

Distributed under the [MIT License](LICENSE).