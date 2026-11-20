# STOPIFY

**AI-powered procrastination management — STEM2Connect AI Hackathon**

STOPIFY is a frontend-only productivity app that tracks what you plan, every time you push it
back, and what that delay costs you. It turns your own task and postponement records into a
consequence dashboard, a realistic daily plan, a reflection summary and analytics.

> **Demo build:** there is no backend, no database and no AI provider. All data lives in this
> browser's `localStorage`, and every AI-style feature is generated locally by deterministic rules
> and clearly labelled **Simulated AI**.

---

## Quick start

Requirements: Node.js 18+ (20 recommended) and npm.

```bash
npm install
npm run dev
```

Open the URL printed by Vite (default `http://localhost:5173`).

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run typecheck` | TypeScript check with `tsc --noEmit` |
| `npm test` | Run the Vitest unit suite once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run test:coverage` | Run the suite with V8 coverage |
| `npm run build` | Typecheck, then build to `dist/` |
| `npm run preview` | Serve the production build locally |

### Demo access

- **Register** any name, email and password (8+ characters) to create a local account.
- **Demo workspace** button on the login/register page loads a clearly labelled sample dataset.
- **Demo credentials:** `demo@stopify.app` / `stopify-demo`

Local accounts are stored in this browser only. Clearing site data removes them.

---

## Stack

- React 18 + TypeScript
- Vite 6
- Tailwind CSS 3
- Recharts for analytics
- Lucide React icons
- React Router 6
- Sonner toasts
- `@fontsource-variable` Inter + Plus Jakarta Sans

No Supabase, PostgreSQL, server functions, API keys or backend dependencies are included.

---

## Project structure

```
src/
  components/
    layout/      AppShell (sidebar + mobile drawer), AuthLayout
    tasks/       Task forms, complete/postpone dialogs, task detail
    ui/          Button, Card, Input, Modal, Badge, Progress, EmptyState, …
    charts/      ChartFrame, shared chart theme/tooltip
  context/
    AuthContext.tsx       Local session + account actions
    WorkspaceContext.tsx  Loads the workspace service and exposes typed actions
  lib/
    types.ts     Domain types (Task, Goal, Plan, Reflection, Score, …)
    utils.ts     Formatting and presentation helpers
    toast.ts     Toast helpers
  pages/         Landing, auth, dashboard, tasks, goals, planner, insights,
                 assistant, analytics, reflection, settings, 404
  services/
    authService.ts        Local accounts, password hashing, reset tokens
    workspaceService.ts   Business logic (create/edit/postpone/complete/plan/reflect)
    workspaceStore.ts     Per-user localStorage persistence
    metrics.ts            Delay math, streaks, summary, score, series
    insights.ts           Consequence engine (time, goals, projection, checks)
    planner.ts            Deterministic plan generation
    assistant.ts          Local assistant reply engine
    reflectionSummary.ts  Local reflection summary generation
    achievements.ts       Achievement definitions and evaluation
    sampleData.ts         Clearly labelled demo dataset
    api/stopifyApi.ts     Typed HTTP contract for the future backend
docs/
  BACKEND_INTEGRATION.md  Endpoint contract and wiring guide
```

---

## What is implemented

- **Landing page** — hero, problem, how it works, features, simulated-AI explanation, FAQ, CTA, footer.
- **Local authentication** — register, login, logout, password reset (demo link), protected routes,
  per-user workspace, profile/password/account management.
- **Dashboard** — momentum score, on-time rate, estimated time lost, streak, task counts
  (total/completed/pending/overdue/postponed/completion), daily target, 7-day chart, recommendations,
  today's plan, upcoming deadlines, goals, achievements, recent activity, quick task creation.
- **Tasks** — create, edit, delete, complete (with actual duration), reopen, postpone with reason and
  new deadline, categories, priorities, statuses, filters, search, sort, detail view with full
  postponement history.
- **Goals** — create, edit, complete, archive, target dates, progress, linked tasks, risk signals.
- **Postponement tracking** — immutable records, original vs current deadline, reasons, repeated-delay
  detection, no overwriting of history.
- **Consequence engine** — recorded delay, estimated lost work, on-time rate, current overdue time,
  goal exposure, opportunity cost, end-of-month projection (gated behind real evidence), reality checks.
- **Daily planner** — generate, regenerate, accept, edit a block's title/duration, reorder blocks
  (times re-flow automatically), tick blocks done, save notes, plan history, capacity and break
  handling. Generated locally and labelled simulated.
- **AI assistant (simulated)** — data-aware replies about prioritisation, delays, goals and planning,
  persisted conversation, clear conversation action.
- **Daily reflection** — completed/unfinished work, postponement reasons, learnings, tomorrow's goals,
  generated summary, regenerate, delete, history.
- **Analytics** — daily/weekly/monthly trends, categories, weekday rhythm, delay trends, score
  breakdown, empty states.
- **Gamification** — streaks, ten achievements, progress bars, milestone toasts.
- **Settings** — profile, password, focus window, daily target, plan capacity, notification
  preferences (stored only), sample data loading, JSON export, clear workspace, delete account.
- **Responsive layout** — desktop sidebar, mobile drawer, responsive grids and charts.

---

## How the numbers are calculated

These are real calculations over your records, not placeholders:

- **Delay minutes** = sum of deadline extensions (new deadline − previous deadline, clamped at 0)
  + lateness after the final deadline for completed tasks, or current overdue time for open tasks.
- **Estimated lost work** = `min(task estimate || 60, delay minutes)`. It is deliberately capped at the
  task's own estimate, so a delay never claims more productive time than the task expected to take.
- **On-time rate** = dated tasks completed at or before the deadline / all completed dated tasks.
- **Completion rate** = completed tasks / all tasks.
- **Current streak** = consecutive days ending today (or yesterday) with at least one completion.
- **Momentum score** = weighted mix of on-time delivery (35%), completion follow-through (25%),
  14-day consistency (25%) and delay control (15%). Components with no data are excluded and the
  remaining weights are re-normalised. The Analytics page shows the full breakdown.
- **Monthly projection** = extensions recorded in the last 14 days ÷ 14 × remaining days in the month.
  It is only shown after at least two qualifying postponements, and the UI lists its assumptions and
  labels it an estimate.

---

## Data and privacy

- Account records: `stopify.accounts.v1`
- Session: `stopify.session.v1`
- Workspace per user: `stopify.workspace.v1.<userId>`
- Demo reset tokens: `stopify.password-resets.v1`
- Optional API token (future backend): `stopify.api.token`

Everything stays on the device. There is no telemetry, analytics SDK or network request in the demo.
Any script on the same origin could read `localStorage`, so this is a demo, not a secure vault. The
password hashing (SHA-256 + random salt) is a demo measure, not a replacement for server-side auth.

---

## Environment variables

Copy `.env.example` to `.env` if you want to override defaults:

| Variable | Default | Meaning |
|---|---|---|
| `VITE_DATA_MODE` | `local` | `local` uses the browser service. `http` switches the workspace to `HttpWorkspaceService`. |
| `VITE_API_BASE_URL` | `http://localhost:8787` | Base URL used by the typed API client in HTTP mode. |

In `http` mode the UI loads the first snapshot from `GET /api/workspace` and calls the REST
endpoints for every action. **Demo authentication stays local until the backend implements the
`/api/auth/*` endpoints** — store the returned bearer token with
`stopifyApi.session.setToken(token)` after a real login. The full contract and wiring steps are in
[`docs/BACKEND_INTEGRATION.md`](docs/BACKEND_INTEGRATION.md).

---

## Verification

Last run on 20 November 2026:

- `npm run typecheck` — passed, 0 errors.
- `npm test` — 15 tests across 4 files passed (dates, metrics, planner, reflection context).
- `npm run build` — passed; production bundle written to `dist/`.

Manual smoke test before a live demo:

1. Register a new account, log out, log back in.
2. Create a task with a deadline and estimate; edit it; mark it in progress.
3. Postpone it with a reason and a new deadline; confirm the entry appears in task history.
4. Complete it; check delay and estimated lost work on Dashboard and Insights.
5. Create a goal, link a task, mark the goal complete.
6. Generate a plan, accept it, edit a block, reorder a block, regenerate, tick and note it.
7. Ask the assistant two questions; clear the conversation.
8. Save a reflection, generate the summary, regenerate it.
9. Check Analytics, achievements and Settings export.
10. Repeat navigation on a narrow viewport.

---

## Deployment

The build is a static SPA. Host `dist/` on any static host (Vercel, Netlify, GitHub Pages, S3, …).

Because routing uses `BrowserRouter`, deep links such as `/dashboard` need an SPA fallback to
`index.html`. The repository includes a `vercel.json` with that rewrite (plus immutable caching for
hashed assets), so importing the repo into Vercel works without extra configuration:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

On Netlify, use `_redirects` with `/* /index.html 200`. Never place secrets in `VITE_*` variables —
they are bundled into the client.

---

## Known limitations

- Frontend demo only: no server, database, real authentication or real AI provider in local mode.
- Accounts and data are per browser profile; there is no cross-device sync in local mode.
- Notification preferences are stored but no email/push notifications are sent.
- In `http` mode, authentication still uses the local demo account until the backend team exposes
  `/api/auth/*`; the workspace adapter and token plumbing are already in place.
- No calendar integration, advanced reminders or multi-device conflict handling.
- The production bundle is a single chunk (~934 kB raw, ~258 kB gzip); route-level code splitting is
  a sensible next step, not a blocker for the demo.

---

## Backend handoff

The frontend expects the endpoints and payloads documented in
[`docs/BACKEND_INTEGRATION.md`](docs/BACKEND_INTEGRATION.md). The contract source of truth is
[`src/services/api/stopifyApi.ts`](src/services/api/stopifyApi.ts) and the domain types are in
[`src/lib/types.ts`](src/lib/types.ts).

**What the backend engineer needs to do, in order:**

1. Read `docs/BACKEND_INTEGRATION.md` — it lists every endpoint, payload, response and error shape.
2. Implement the REST API (any stack). Every workspace mutation must return the canonical
   `WorkspaceSnapshot` so the UI can replace state in one step.
3. Implement `/api/auth/*` and return `{ user, token }`. The frontend stores it with
   `stopifyApi.session.setToken(token)`.
4. Enable CORS for the frontend origin and allow the `Authorization` header.
5. Set `VITE_DATA_MODE=http` and `VITE_API_BASE_URL=https://your-api.example.com` at build time.
6. Run `npm run dev` and walk the README smoke test. The UI will now read/write your API instead of
   `localStorage`. Switching `VITE_DATA_MODE` back to `local` restores the offline demo instantly.
7. If you add AI, keep the provider key server-side and return the same response shapes; the UI keeps
   showing the "Simulated AI" badge unless `source` is extended (see the guide).

**Never** put secret keys in `VITE_*` variables — Vite inlines them into the public bundle.
