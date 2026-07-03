# Frontend — AI Sales Pitch Evaluator

Next.js (App Router) + TypeScript + Tailwind + shadcn/ui. Deployed on **Vercel**.

All API calls go to `/api/*` on the frontend's own origin; `next.config.ts` rewrites
them to the FastAPI backend (`NEXT_PUBLIC_API_URL`). This keeps the JWT auth cookie
first-party, so login works in browsers **and** in the Electron desktop app
(see [`../desktop`](../desktop/README.md)) without third-party-cookie issues.

## Develop

```bash
npm install
npm run dev        # http://localhost:3000 (expects the backend on :8000)
```

## Environment variables

| Variable | Purpose | Example |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend origin that `/api/*` is proxied to | `https://<your-app>.up.railway.app` |

Set it in Vercel → Project → Settings → Environment Variables (and in `.env` for
local Docker; see the repo root `.env.example`).

## Structure

- `src/app/(auth)` — "Who are you?" persona picker (passwordless demo entry)
- `src/app/(app)` — authenticated app (dashboard, scripts, evaluations, leaderboard)
- `src/components` — UI components (shadcn/ui based)
- `src/lib` — API client and utilities
- `src/proxy.ts` — auth guard (excludes `/api/*`)

## Build

```bash
npm run build && npm run start
```

Deploys automatically on Vercel from `main` (project root: `frontend/`).
