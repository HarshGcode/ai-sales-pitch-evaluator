# AI Sales Pitch Evaluator

Upload your ideal sales script, then evaluate sales executives by comparing recorded or
uploaded pitch audio against it. AI transcribes the audio and scores script adherence,
tone, confidence, compliance, and more.

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

- Frontend: Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- Backend: FastAPI (Python)
- Database: PostgreSQL
- AI: Groq or OpenAI (Whisper/whisper-large-v3 + GPT/Llama) when a key is set,
  otherwise a deterministic mock so the whole app is demoable with zero external
  accounts.

## Run locally with Docker

```bash
cp .env.example .env
docker compose up --build
docker compose exec backend python -m app.seed
```

Visit http://localhost:3000 and sign in with one of the seeded demo accounts:

- `admin@acmecorp.com` / `admin123`
- `manager@acmecorp.com` / `manager123`
- `exec@acmecorp.com` / `exec123`

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
