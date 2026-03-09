# Summit Code UI – Ops Guide

Lightweight browser tool for repo-scale workflows: prompt search, artifact browsing, and release Go/No-Go.

---

## Running Locally

### Prerequisites

- Node.js ≥ 18
- pnpm ≥ 10 (`npm i -g pnpm`)

### Steps

```bash
# 1. Install dependencies
cd apps/summit-ui
pnpm install

# 2. Start dev server (Vite + Express concurrently)
pnpm dev

# Opens:
#   Frontend (hot-reload): http://localhost:5173
#   Backend API:           http://localhost:3741/api/...
#   Metrics:               http://localhost:3741/metrics
#   Health:                http://localhost:3741/health
```

### Production build

```bash
pnpm build          # builds Vite frontend into dist/
pnpm server         # serves dist/ + API on port 3741
```

Set `SUMMIT_UI_PORT=8080` to change the port.

---

## How It Connects to Stored Artifacts

The server resolves paths **relative to the repo root** (three levels up from `apps/summit-ui/server/`).

| UI section | Source on disk |
|---|---|
| Prompt Search | `.agentic-prompts/*.md`, `.claude/**/*.md`, `.jules/*.md` |
| Artifact Browser | `.artifacts/pr/*.json` (must match `schema.json`) |
| Dashboard – branches | `git branch -a` against repo root |
| Dashboard – tags | `git tag` against repo root |
| Go/No-Go – policies | `.ci/policies/*.rego` |
| Go/No-Go – SBOM | `.artifacts/sbom/`, `.ci/scripts/sbom/` |
| Go/No-Go – evidence | `.artifacts/pr/`, `.ci/scripts/cosign_sign_verify.sh` |

No database is required. Everything is read directly from the filesystem and git.

---

## Observability

### Prometheus metrics (`/metrics`)

| Metric | Type | Description |
|---|---|---|
| `http_requests_total` | counter | Per-route request count |
| `http_request_duration_ms` | gauge | Last request latency |
| `summit_ui_prompt_search_total` | counter | Prompt search hits |
| `summit_ui_prompt_stream_total` | counter | SSE stream opens |
| `summit_ui_artifact_list_total` | counter | Artifact list hits |
| `summit_ui_dashboard_total` | counter | Dashboard loads |
| `summit_ui_gonogo_total` | counter | Go/No-Go page loads |
| `summit_ui_branch_count` | gauge | Current branch count |
| `summit_ui_tag_count` | gauge | Current tag count |
| `summit_ui_artifact_count` | gauge | Total PR artifacts |

Scrape `/metrics` with Prometheus or pipe to Grafana (already running at `localhost:3001` per `.claude/settings.json`).

### Health check (`/health`)

Returns `{ status: "ok", timestamp: "..." }`. Wire to your load-balancer or uptime monitor.

---

## Running CI Checks

```bash
pnpm lint        # ESLint across src/ and server/
pnpm typecheck   # tsc --noEmit
pnpm test        # Vitest (server integration tests)
pnpm build       # Full production build
```

CI runs automatically on PRs touching `apps/summit-ui/**` via `.github/workflows/summit-ui-ci.yml`.

---

## Adding New Subsystems to the Dashboard

### 1. Add a backend route

Create `server/routes/my-subsystem.ts`:

```typescript
import { Router } from 'express';
import { incCounter } from '../utils/metrics.js';

export const myRouter = Router();

myRouter.get('/', async (_req, res) => {
  incCounter('summit_ui_mysubsystem_total', 'My subsystem requests');
  // read files, run git commands, etc.
  res.json({ data: [] });
});
```

Register it in `server/index.ts`:

```typescript
import { myRouter } from './routes/my-subsystem.js';
app.use('/api/my-subsystem', myRouter);
```

### 2. Add an API client call

In `src/api.ts`:

```typescript
export function getMySubsystem(): Promise<MyData> {
  return get<MyData>('/my-subsystem');
}
```

### 3. Add a React page or card

Create `src/pages/MySubsystem.tsx`, add it to `App.tsx` + `Nav.tsx`.

### 4. Add tests

Add cases to `test/server.test.ts`.

### 5. Update this doc

Add the new data source to the table in the "How It Connects" section above.

---

## Security Notes

- The server reads local files only; it does not write.
- No auth is implemented – deploy behind your existing auth proxy or VPN.
- OPA policy evaluation is read-only; the server never executes policy actions.
- Git commands are run with a 10-second timeout and stderr suppressed.
