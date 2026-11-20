# STOPIFY — Backend Integration Guide

This document is the handoff contract for the separate backend engineer. The frontend is complete
and runs on a local browser service. This guide explains exactly what a backend must expose and how
to switch the UI over without rewriting pages.

**Source of truth:** `src/services/api/stopifyApi.ts` (typed client) and `src/lib/types.ts` (domain
types). If this document and the code ever disagree, the TypeScript types win.

---

## 1. How the frontend is structured today

```
Pages / components
      │  typed actions (createTask, postponeTask, generatePlan, …)
      ▼
WorkspaceContext  ──►  LocalWorkspaceService  ──►  localStorage   (default)
      │
      └────────────►  HttpWorkspaceService   ──►  your REST API   (VITE_DATA_MODE=http)
```

- Pages never call `fetch` directly. They call `actions` from `WorkspaceContext`.
- Every service returns a **`WorkspaceSnapshot`** after each mutation.
- `src/services/api/stopifyApi.ts` defines the HTTP contract; `src/services/httpWorkspaceService.ts`
  implements it.
- `VITE_DATA_MODE=http` + `VITE_API_BASE_URL` switches the workspace adapter. Setting only the mode
  without a reachable API shows a clear error state instead of silently falling back.

The important design decision: **every mutation returns the full canonical workspace snapshot**. The
UI replaces its state in one step, so metrics, achievements and charts stay consistent without
incremental cache patching. A backend can implement that directly, or return raw data and let the
client build the snapshot (see §9).

---

## 2. Environment and auth

| Item | Value |
|---|---|
| Base URL | `VITE_API_BASE_URL` (default `http://localhost:8787`) |
| Auth header | `Authorization: Bearer <token>` |
| Token storage | `localStorage` key `stopify.api.token` via `stopifyApi.session.setToken()` |
| Content type | `application/json` |
| CORS | Must allow the frontend origin and the `Authorization` header |

`stopifyApi` treats `401` as a failed request. The adapter should clear the token and send the user
to `/login` on `401` or `403`.

**Never** accept a `userId` from the client for authorization decisions — derive the user from the
token on the server. Every query must be scoped to the authenticated user.

---

## 3. Error format

Return a JSON body with a machine code and a human message:

```json
{ "message": "Task not found.", "code": "task_not_found" }
```

The client also accepts these variants:

```json
{ "error": { "message": "Task not found.", "code": "task_not_found" } }
{ "error": "Task not found." }
```

Use `400` for validation, `401` for missing/expired auth, `403` for cross-user access, `404` for
missing records, `409` for conflicts (duplicate email, already completed), `422` for semantically
invalid input, `500` for unexpected failures. `204 No Content` is accepted for void responses.

Suggested codes already used by the local service: `invalid_title`, `invalid_date`, `invalid_email`,
`weak_password`, `email_taken`, `invalid_credentials`, `task_not_found`, `goal_not_found`,
`already_completed`, `missing_reason`, `plan_not_found`, `reflection_not_found`, `empty_message`.

---

## 4. Auth endpoints

### `POST /api/auth/register`

```json
{ "name": "Ada Lovelace", "email": "ada@example.com", "password": "at-least-8-chars" }
```

`201` (or `200`) response:

```ts
{ user: User; token: string }

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string; // ISO 8601
}
```

Rules: normalise email to lowercase, reject duplicates, hash with Argon2id or bcrypt **on the
server** (do not reuse the demo's client-side SHA-256), minimum 8 characters, maximum 72.

### `POST /api/auth/login`

```json
{ "email": "ada@example.com", "password": "…" }
```

Response: `{ user, token }`. Use one generic error for unknown email and wrong password.

### `POST /api/auth/demo`

No body. Creates or reuses a demo account and returns `{ user, token }`. Mark the account as demo so
its seeded data is clearly separable and resettable.

### `GET /api/auth/me`

Response: `{ user }`.

### `POST /api/auth/logout`

`204`. Invalidate the token/session server-side.

### `PATCH /api/auth/profile`

```json
{ "name": "Optional", "email": "optional@example.com" }
```

Response: `User`. Enforce uniqueness and validation.

### `POST /api/auth/password`

```json
{ "currentPassword": "…", "newPassword": "…" }
```

`204`. Verify the current password and re-hash the new one.

### `DELETE /api/auth/account`

```json
{ "password": "…" }
```

`204`. Verify the password, then delete the user and all owned records (cascade).

### `POST /api/auth/password/forgot`

```json
{ "email": "ada@example.com" }
```

Response: `{ "message": "If an account exists, a reset email has been sent." }`. Always return the
same message to avoid account enumeration. Send the email server-side.

### `POST /api/auth/password/reset`

```json
{ "token": "one-time-token", "password": "new-password" }
```

`204`. Token must be single-use and expire (30 minutes is a sensible default).

---

## 5. Workspace endpoints

### `GET /api/workspace`

Returns the full `WorkspaceSnapshot`. Top-level keys:

```ts
{
  profile, preferences,
  tasks, goals, plans, reflections,
  achievements, achievementState, conversation,
  summary, score, analytics, insights, dashboard,
  isSampleData, updatedAt, generatedAt
}
```

See `src/services/snapshot.ts` for the exact shape. A minimal backend can persist only the raw
entities and compute the derived bundle server-side with the same rules, or use the client-side
alternative in §9.

### `GET /api/workspace/export`

Returns the raw exportable workspace:

```ts
{
  version: 1,
  tasks, goals, plans, reflections, achievements, conversations,
  profile, preferences, isSampleData, createdAt, updatedAt
}
```

### `DELETE /api/workspace`

Clears tasks, goals, plans, reflections, achievements and conversation for the user, keeps account
and preferences. Returns the new snapshot.

### `POST /api/workspace/sample`

Replaces the user's workspace with the demo dataset (`src/services/sampleData.ts`). Returns the new
snapshot and sets `isSampleData: true`.

### `PATCH /api/workspace/preferences`

Body: `Partial<Preferences>`:

```ts
{
  focusStart?: "09:00",
  focusEnd?: "17:00",
  dailyTarget?: 3,
  defaultPlanMinutes?: 180,
  notifications?: { email?: boolean, weekly?: boolean }
}
```

Returns the new snapshot. Validate `HH:mm`, `focusStart !== focusEnd`, `1 ≤ dailyTarget ≤ 12`,
`30 ≤ defaultPlanMinutes ≤ 720`.

### `PATCH /api/workspace/profile`

```json
{ "name": "Optional", "email": "optional@example.com" }
```

Returns the new snapshot. Keep this in sync with the auth profile.

---

## 6. Tasks, goals, plans, reflections, assistant

All mutation responses are the **full `WorkspaceSnapshot`** unless stated otherwise.

### Tasks

| Method | Path | Body | Notes |
|---|---|---|---|
| `POST` | `/api/tasks` | `TaskInput` | Create |
| `PATCH` | `/api/tasks/:id` | `TaskPatch` | Edit fields |
| `DELETE` | `/api/tasks/:id` | — | Delete |
| `POST` | `/api/tasks/:id/complete` | `{ actualDuration: number \| null }` | Sets `completedAt`, status `completed` |
| `POST` | `/api/tasks/:id/reopen` | — | Clears `completedAt`, status `not_started` |
| `POST` | `/api/tasks/:id/postpone` | `{ newDeadline?: string \| null, reason: string }` | Appends a record; never overwrites history |

```ts
interface TaskInput {
  title: string;                    // required, ≤ 160
  description?: string;             // ≤ 4000
  category?: string;                // ≤ 40, default "General"
  priority?: 'low' | 'medium' | 'high' | 'critical';
  status?: 'not_started' | 'in_progress' | 'postponed';
  deadline?: string | null;         // ISO 8601
  estimatedDuration?: number | null; // minutes, 1–1440
  goalId?: string | null;
}

interface TaskPatch extends Partial<TaskInput> {
  actualDuration?: number | null;
}
```

Postponement rules to preserve:

- A completed task cannot be postponed (`409 already_completed`).
- A reason is required (`400 missing_reason`).
- If `newDeadline` is omitted, keep the current deadline.
- Append, never delete or mutate older postponement records.
- Deliberate postponement is distinct from automatic overdue status.

### Goals

| Method | Path | Body |
|---|---|---|
| `POST` | `/api/goals` | `GoalInput` |
| `PATCH` | `/api/goals/:id` | `GoalPatch` |
| `DELETE` | `/api/goals/:id` | — |

```ts
interface GoalInput {
  title: string;
  description?: string;
  targetDate?: string | null;
}

interface GoalPatch {
  title?: string;
  description?: string;
  targetDate?: string | null;
  status?: 'active' | 'completed' | 'archived';
}
```

Deleting a goal must null out `goalId` on its linked tasks.

### Plans

| Method | Path | Body |
|---|---|---|
| `POST` | `/api/plans` | `PlanInput` |
| `DELETE` | `/api/plans/:id` | — |
| `POST` | `/api/plans/:id/items/:itemId/toggle` | — |
| `PATCH` | `/api/plans/:id/items/:itemId` | `{ title?: string; durationMinutes?: number }` |
| `POST` | `/api/plans/:id/items/:itemId/move` | `{ direction: 'up' \| 'down' }` |
| `PATCH` | `/api/plans/:id/notes` | `{ notes: string }` |
| `POST` | `/api/plans/:id/accept` | — |

`PATCH item` and `POST move` must re-flow the day: keep each block's duration, start each block where
the previous one ends, beginning at the first block's original start time, and reset `acceptedAt`.
`accept` sets `acceptedAt` to the server timestamp.

```ts
interface PlanInput {
  date: string;             // YYYY-MM-DD
  availableMinutes: number; // 30–720
  focusText?: string;       // optional keywords
}
```

A plan item:

```ts
interface PlanItem {
  id: string;
  title: string;
  startTime: string;        // "09:00"
  endTime: string;          // "09:45"
  durationMinutes: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  kind: 'focus' | 'break' | 'buffer';
  taskId: string | null;
  why: string;
  steps: string[];
  done: boolean;
}
```

If AI is connected, keep `source: 'simulated'` only for local rules. Extend `PlanSource` to include a
real-AI value and keep the UI badge honest. If the provider fails, return a rules-based plan with a
`notice` explaining the fallback — never present it as a model response.

### Reflections

| Method | Path | Body |
|---|---|---|
| `POST` | `/api/reflections` | `ReflectionInput` |
| `POST` | `/api/reflections/:id/summary` | — (regenerate AI summary) |
| `DELETE` | `/api/reflections/:id` | — |
| `GET` | `/api/reflections/:id` | — (returns one `Reflection`) |

```ts
interface ReflectionInput {
  date: string;                 // YYYY-MM-DD, unique per user
  completedTasks: string;
  unfinishedTasks: string;
  postponementReasons: string;
  learnings: string;
  tomorrowGoals: string;
  generateSummary: boolean;
}
```

One reflection per user per date. Upsert on the same date.

### Assistant

| Method | Path | Body |
|---|---|---|
| `POST` | `/api/assistant/messages` | `{ message: string }` (≤ 1000) |
| `DELETE` | `/api/assistant/messages` | — (clear conversation) |

The assistant reply must be built from the authenticated user's tasks, goals, deadlines,
postponements and reflections. Store the conversation (cap at ~100 messages is fine). Never include
another user's data in the prompt or the response.

---

## 7. Data model the backend should persist

Minimum tables, all with `user_id` foreign keys and `ON DELETE CASCADE`:

- `users` / `profiles`
- `tasks`
- `goals`
- `postponement_records` (append-only; `previous_deadline`, `new_deadline`, `reason`, `created_at`)
- `daily_plans`
- `daily_plan_items`
- `daily_reflections` (unique `(user_id, reflection_date)`)
- `achievements` (unique `(user_id, type)`)
- `ai_conversations`

Indexes: `tasks (user_id, deadline)`, `tasks (user_id, status)`, `postponement_records (task_id)`,
`daily_reflections (user_id, reflection_date)`, `daily_plans (user_id, plan_date)`.

Validation at the API boundary is mandatory: required titles, length caps, valid dates, valid enums,
and ownership checks on every `:id` (a task ID from another user must behave exactly like `404`).

---

## 8. How the HTTP adapter is wired

The switch is already implemented in this repository:

- `src/services/types.ts` exports `WorkspaceServiceContract`, implemented by both services.
- `src/services/httpWorkspaceService.ts` maps every action to `stopifyApi` and caches the latest
  snapshot.
- `src/context/WorkspaceContext.tsx` picks the adapter from `dataMode` and awaits the first snapshot.
- `src/services/reflectionContext.ts` builds the daily check-in from the snapshot, so **no extra
  reflection-context endpoint is required**.
- `VITE_DATA_MODE=http` without a reachable API shows a clear error state instead of silently falling
  back to localStorage.

**To connect your backend:**

1. Copy `.env.example` to `.env` and set:

   ```bash
   VITE_DATA_MODE=http
   VITE_API_BASE_URL=http://localhost:8787
   ```

2. Implement the endpoints in §4–§6. Every mutation must return the canonical `WorkspaceSnapshot`.
3. Implement `/api/auth/*` returning `{ user, token }`, then call
   `stopifyApi.session.setToken(token)` after login. Until then, the full demo auth keeps working —
   the workspace adapter is independent of the auth adapter.
4. Allow CORS from the frontend origin with `Authorization` and `Content-Type`.
5. On `401`, clear the token and redirect to `/login`.

**Behaviour to preserve:**

- `refresh()` fires `GET /api/workspace` in the background (the provider polls every 60s).
- `exportWorkspace()` returns `GET /api/workspace/export`, fetched at connect time.
- Postponement records are append-only; editing a plan item or moving it resets `acceptedAt`.
- Keeping `VITE_DATA_MODE` unset (`local`) must always work without a backend.

No page or component needs to change when you flip the mode.

---

## 9. Simpler alternative: return raw data

If returning the full derived snapshot is too much work, return the raw `WorkspaceData` shape from
`GET /api/workspace` and let the client build the rest:

```ts
import { buildSnapshot } from '@/services/snapshot';

const raw = await fetchWorkspaceData();          // WorkspaceData
const { snapshot } = buildSnapshot(convertRaw(raw));
```

For mutations, return the updated raw workspace (or just `204`) and re-fetch `GET /api/workspace`,
then rebuild. This keeps all scoring, delay and insight logic in one place on the client, at the cost
of an extra request. Either approach is acceptable; document which one you chose.

---

## 10. Security checklist

- Server-side password hashing (Argon2id/bcrypt), never SHA-256 alone.
- Tokens with expiry and revocation; do not put secrets in `VITE_*` variables.
- Authorize every read and write by token, not by a client-provided user ID.
- Validate and normalise all input; cap string lengths and numeric ranges.
- Rate-limit login, register and password reset.
- Return `404` rather than leaking the existence of another user's records.
- CORS restricted to the deployed frontend origin.
- Cascade deletes for account removal.
- AI provider keys stay server-side only; never return them to the client.
- When AI is unavailable, return a clearly labelled rules-based fallback and keep the UI's
  `notice`/`source` fields accurate.

---

## 11. Smoke tests for the integration

```bash
# Register
curl -X POST http://localhost:8787/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada","email":"ada@example.com","password":"password123"}'

# Authenticated workspace
curl http://localhost:8787/api/workspace \
  -H "Authorization: Bearer <token>"

# Create a task
curl -X POST http://localhost:8787/api/tasks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Finish problem set","deadline":"2026-11-21T17:00:00.000Z","estimatedDuration":90}'

# Postpone it (reason required)
curl -X POST http://localhost:8787/api/tasks/<taskId>/postpone \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"newDeadline":"2026-11-22T17:00:00.000Z","reason":"Underestimated the reading"}'
```

Then verify in the UI: dashboard counters update, the task shows a postponement record, Insights
reports delay and a reality check, and Analytics reflects the new data.
