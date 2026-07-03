# AI Sales Pitch Evaluator

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Latest release](https://img.shields.io/github/v/release/HarshGcode/ai-sales-pitch-evaluator)](https://github.com/HarshGcode/ai-sales-pitch-evaluator/releases/latest)
[![Desktop build](https://github.com/HarshGcode/ai-sales-pitch-evaluator/actions/workflows/desktop-release.yml/badge.svg)](https://github.com/HarshGcode/ai-sales-pitch-evaluator/actions/workflows/desktop-release.yml)

Upload your ideal sales script, then evaluate sales executives by comparing recorded or
uploaded pitch audio against it. AI transcribes the audio and scores script adherence,
tone, confidence, compliance, and more.

**Try it:** [web app](https://frontend-ochre-ten-27.vercel.app) ·
[download for macOS / Windows](https://pitch-evaluator-download.vercel.app) ·
no sign-up — just enter your name and pick a role. Bring your own AI key
(Claude, OpenAI, Groq, or Gemini) or use the built-in engine.

Contributions welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). Licensed under
the [MIT License](LICENSE).

## What's included (MVP scope)

- Email/password auth with JWT (httpOnly cookie) and role-based access control
  (Admin, Manager, Sales Executive)
- Script upload (TXT/PDF/DOCX) with AI-structured sections: mandatory points, optional
  points, compliance statements, objection handling, closing
- Audio upload (MP3/WAV/M4A/OGG) or in-browser recording, transcribed and scored
  against the script (adherence %, tone, confidence, empathy, clarity, compliance,
  closing quality, filler words, strengths/weaknesses/improvement tips)
- Dashboard (total evaluations, average score, best/weakest performer, script
  compliance rate, monthly trend, recent evaluations), leaderboard, and search/CSV
  export of evaluations
- Every AI call (transcription, script structuring, evaluation) runs through a
  pluggable service layer that uses Groq (free tier, OpenAI-compatible) or OpenAI
  (Whisper + GPT) when a key is set, and a deterministic mock otherwise — the whole
  app is demoable with zero external accounts

**Deliberately out of scope for this MVP** (left as clean extension points, not
implemented): live AI voice roleplay/practice mode, an AI chat coach, gamification
(badges/XP/certificates), Pinecone/vector search, speaker diarization, multi-language
UI, email notifications, and full cloud/Docker+Nginx+AWS deployment automation.
Multi-tenancy is schema-ready (`organization_id` on every table) but the app currently
seeds and runs as a single organization — no platform-admin UI for creating additional
orgs yet.

## Stack

- Frontend: Next.js (App Router) + TypeScript + Tailwind + shadcn/ui — deployed on Vercel
- Backend: FastAPI (Python) — deployed on Railway
- Database: PostgreSQL
- Desktop: Electron + electron-builder (Windows `.exe` + portable, macOS universal `.dmg`)
- AI: Groq or OpenAI (Whisper/whisper-large-v3 + GPT/Llama) when a key is set,
  otherwise a deterministic mock so the whole app is demoable with zero external
  accounts.

## Desktop app (Windows + macOS)

The [`desktop/`](desktop/README.md) folder contains a native desktop app that wraps
the deployed frontend and talks to the Railway backend — same login, same features,
plus tray icon, native notifications, auto-updates, and offline-safe session
persistence.

```bash
npm run desktop        # run against production
npm run desktop:dev    # run against http://localhost:3000
npm run build:mac      # build macOS .dmg (universal)
npm run build:win      # build Windows installer + portable .exe
npm run release:patch  # tag vX.Y.Z -> CI builds installers -> GitHub Release
```

Installers are published automatically to
[GitHub Releases](https://github.com/HarshGcode/ai-sales-pitch-evaluator/releases)
by `.github/workflows/desktop-release.yml` on every version tag. See
[desktop/docs/INSTALL.md](desktop/docs/INSTALL.md) and
[desktop/docs/RELEASING.md](desktop/docs/RELEASING.md).

## Run locally with Docker

```bash
cp .env.example .env
docker compose up --build
docker compose exec backend python -m app.seed
```

Visit http://localhost:3000 and pick a persona on the "Who are you?" screen —
Alice (Admin), Mark (Manager) or Sam (Sales Executive). No passwords: entry is a
one-click demo login (`POST /auth/demo-login`) restricted to the three seeded
accounts, and role-based access control still applies per persona.

Everything works out of the box using mocked AI responses. To use real AI models,
set `GROQ_API_KEY` (free, get one at https://console.groq.com/keys) or `OPENAI_API_KEY`
in `.env` and restart the backend service. If both are set, Groq takes precedence.

## Run locally without Docker

Backend:

```bash
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
DATABASE_URL="sqlite:///./dev.db" .venv/bin/alembic upgrade head
DATABASE_URL="sqlite:///./dev.db" .venv/bin/python -m app.seed
DATABASE_URL="sqlite:///./dev.db" .venv/bin/uvicorn app.main:app --reload --port 8000
```

Frontend (in another terminal):

```bash
cd frontend
npm install
npm run dev
```

## Tests

```bash
cd backend
.venv/bin/pytest
```
