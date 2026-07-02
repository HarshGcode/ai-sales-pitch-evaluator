# Backend — AI Sales Pitch Evaluator

FastAPI + SQLAlchemy + Alembic + PostgreSQL. Deployed on **Railway**.

Handles auth (JWT in an httpOnly cookie), script/audio upload and storage,
AI transcription + evaluation (Groq or OpenAI, deterministic mock without a key),
dashboards, leaderboard, and CSV export.

## Develop (SQLite, no Docker)

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
DATABASE_URL="sqlite:///./dev.db" .venv/bin/alembic upgrade head
DATABASE_URL="sqlite:///./dev.db" .venv/bin/python -m app.seed
DATABASE_URL="sqlite:///./dev.db" .venv/bin/uvicorn app.main:app --reload --port 8000
```

API docs at http://localhost:8000/docs.

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Railway provides this) |
| `JWT_SECRET` | Secret for signing JWTs — set a strong value in production |
| `JWT_EXPIRE_MINUTES` | Session lifetime (default 1440) |
| `GROQ_API_KEY` / `OPENAI_API_KEY` | Real AI transcription/evaluation (mock otherwise) |
| `STORAGE_BACKEND` / `STORAGE_ROOT` | File storage (local disk by default) |
| `CORS_ORIGINS` | Allowed browser origins (comma-separated) |
| `COOKIE_SAMESITE` / `COOKIE_SECURE` | `lax`/`false` locally; `none`/`true` only if serving cross-domain without the frontend proxy |

See the repo root `.env.example` for a working local set.

## Tests

```bash
.venv/bin/pytest
```

## Migrations

```bash
.venv/bin/alembic revision --autogenerate -m "describe change"
.venv/bin/alembic upgrade head
```

## Deploy

Railway builds the included `Dockerfile`. Run `alembic upgrade head` on deploy
(configured as the container start step) and seed once with `python -m app.seed`.
