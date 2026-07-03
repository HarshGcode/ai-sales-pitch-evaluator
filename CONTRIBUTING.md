# Contributing

Thanks for your interest in improving AI Sales Pitch Evaluator! Issues and pull
requests are welcome.

## Project layout

| Directory | What it is | Stack |
|---|---|---|
| `frontend/` | Web app | Next.js (App Router), TypeScript, Tailwind, shadcn/ui + Base UI |
| `backend/` | API | FastAPI, SQLAlchemy, Alembic, PostgreSQL (SQLite for local dev) |
| `desktop/` | Desktop app for Windows/macOS | Electron + electron-builder |
| `landing/` | Static download page | Plain HTML/CSS |

## Getting started

The quickest way is Docker (`cp .env.example .env && docker compose up --build`),
or run the pieces natively — see the [root README](README.md) and the per-directory
READMEs for details. Everything works with **zero API keys** thanks to deterministic
mock AI services; set `GROQ_API_KEY` or `OPENAI_API_KEY` in `.env` for real AI.

## Before you open a PR

- **Backend:** `cd backend && .venv/bin/pytest` — all tests must pass. If you change
  models, add an Alembic migration (`alembic revision --autogenerate -m "..."`).
- **Frontend:** `cd frontend && npx tsc --noEmit && npm run lint`.
- **Desktop:** `cd desktop && npm start` should launch cleanly. Keep the Electron
  security posture intact (context isolation on, node integration off, sandboxed
  renderer, allow-listed preload API).
- Keep PRs focused — one feature or fix per PR, with a short description of the why.

## Releases (maintainers)

Desktop installers are built by CI on version tags: `npm run release:patch` from the
repo root. See [desktop/docs/RELEASING.md](desktop/docs/RELEASING.md). The frontend
(Vercel) and backend (Railway) are deployed with their respective CLIs — there is no
git-push auto-deploy.

## Reporting bugs / security issues

Open a [GitHub issue](https://github.com/HarshGcode/ai-sales-pitch-evaluator/issues).
For security-sensitive reports, please avoid posting exploit details publicly —
mention that it's security-related and the maintainer will follow up.
