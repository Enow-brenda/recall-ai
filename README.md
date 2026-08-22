# Recall

> "Your inbox remembers. You don't have to."

Recall is a chat-based memory layer for your inbox. Ask anything about your email in plain language — *"find the invoice from the design agency"*, *"did I ever get the signed contract?"*, *"what was the link they sent for the meeting?"* — and get an answer backed by sources: the right message, the right document, the right link, even the right calendar event, pulled from your Gmail.

Recall is not an inbox replacement. It's a lightweight, chat-first search layer that specializes in finding things you know exist but can't locate — and turning what it finds into action.

## Features

- **Conversational semantic search** — natural-language questions answered with embeddings-based search over email content, every answer citing its source
- **Document memory** — extracts and indexes attachment text (PDF/DOCX), not just filenames; detects versions of the same document across a thread (`contract_v1`, `contract_FINAL`)
- **Link memory** — every URL mentioned in email bodies is extracted and searchable ("send me that shared doc link")
- **Event creation from email** — detects meeting/date mentions and proposes calendar events you can confirm into Google Calendar
- **Multi-account support** — connect multiple Gmail accounts and scope searches per account or across all
- **Coming soon** — WhatsApp, SMS, Slack

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11, FastAPI |
| Database | PostgreSQL ([Neon](https://neon.tech)) with `pgvector` |
| Embeddings / LLM | Google Gemini (`gemini-embedding-001` + flash model) |
| Auth | Google OAuth 2.0 |
| Integrations | Gmail API, Google Calendar API |
| Migrations | Alembic |
| Frontend | React (Vite) |

The complete database schema and the reasoning behind every design decision are documented in [docs/DATABASE_DESIGN.md](docs/DATABASE_DESIGN.md).

## Project Structure

```
recall/
├── backend/
│   ├── app/
│   │   ├── core/          # logging, exception handlers, auth middleware
│   │   ├── db/            # engine/session setup + SQLAlchemy models
│   │   ├── routers/       # HTTP endpoints only
│   │   ├── schemas/       # Pydantic request/response models
│   │   ├── services/      # all business logic (Gmail, embeddings, LLM, search...)
│   │   ├── config.py      # env var loading
│   │   └── main.py        # app entrypoint
│   ├── alembic/           # DB migrations
│   ├── scripts/           # dev/test harness scripts
│   └── requirements.txt
└── frontend/              # React UI (in progress)
```

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+ (for the frontend)
- A [Neon](https://neon.tech) project (free tier works — grab the pooled connection string)
- A [Gemini API key](https://aistudio.google.com/apikey) (free tier)
- A Google Cloud project with **Gmail API** and **Calendar API** enabled, plus an OAuth 2.0 Client ID (Web application) with redirect URI `http://localhost:8000/auth/callback`

### Backend Setup

```bash
git clone https://github.com/Enow-brenda/recall-ai.git
cd recall-ai/backend

python -m venv .venv
.venv\Scripts\Activate.ps1        # Windows (Linux/Mac: source .venv/bin/activate)

pip install -r requirements.txt
```

Create a `.env` file in `backend/` (see `.env.example`) and fill it in:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon pooled connection string (`...-pooler...neon.tech/neondb?sslmode=require`) |
| `GEMINI_API_KEY` | Key from Google AI Studio |
| `GOOGLE_CLIENT_ID` | OAuth client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |
| `OAUTH_REDIRECT_URI` | `http://localhost:8000/auth/callback` |
| `JWT_SECRET` | Random string — `python -c "import secrets; print(secrets.token_urlsafe(48))"` |

Run the server:

```bash
uvicorn app.main:app --reload
```

Open the API docs at http://127.0.0.1:8000/docs.

### Frontend Setup

> **In development** — the frontend scaffold lands in Phase 3. Steps below reflect the planned stack.

```bash
cd recall-ai/frontend    # once scaffolded

npm install
npm run dev
```

The dev server runs on http://localhost:5173 and proxies API calls to the backend on port 8000.

## Roadmap

- [x] Phase 1 — Foundation: Neon setup, schema + migrations, OAuth login, Gmail ingestion, embeddings, semantic search
- [ ] Phase 2 — Core AI pipeline: extraction (documents/links/events), query rewriting, chat answers with sources, conversation persistence
- [ ] Phase 3 — Interface + multi-account: React chat UI, citations UI, event confirmation cards, account filters
- [ ] Phase 4 — SaaS layer + submission: usage gating, polish, demo video, deck

## License

Distributed under the [MIT License](LICENSE).
