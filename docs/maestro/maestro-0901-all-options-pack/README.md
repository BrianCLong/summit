# Maestro 0901 “All Options” Pack

This pack documents the additive patches shipped under `/maestro` and supporting CI stubs. Everything is dev‑stubbed and safe for local use without breaking existing flows.

## What’s Included

- CICD
  - CI annotations page with summary cards, filters, and deep links.
- Routing Studio
  - Pin/unpin with Policy Explain and audit note; Auto‑Rollback Watchdog (thresholds + history/events + manual rollback).
- Pipeline Detail
  - Observability tab with Error Budget burn + Grafana embeds; Eval baselines editor.
- Tenants
  - SLO widgets + burn timeline (stub), Cost drill‑down (by pipeline/model, recent runs), Budget forecast (EMA) with risk state, Cost anomalies (z‑score), alert routes.
- DLQ Ops
  - Signatures persistence + trends, Policy tab (rate limits + allowlists + audit), Root‑cause explorer (step+kind+provider), Policy simulator.
- Alerting
  - Alert routes/events for forecast; AlertCenter events; Incidents correlation (CI+SLO+Forecast) with details + Playbook one‑click.
- Provider Ops
  - Providers usage (RPM vs limit, drops, p95); inline “Set limit” update.
- Agent/HITL
  - Agent steps SSE stream; Approve/Block/Edit with scratchpad diff preview (focus‑trapped dialog).
- EvalOps
  - Run scorecards, pipeline baselines, and gate checks (ALLOW/BLOCK) with failing metrics.
- CI Gate Action
  - Composite GitHub Action to call `/eval/gates/check` and fail on BLOCK.

## Key Endpoints (Dev Stub)

- CI: `GET /api/maestro/v1/ci/annotations`
- Routing: `GET/PUT/DELETE /api/maestro/v1/routing/pin(s)`; `GET /routing/pins/history`; `POST /routing/rollback`
- Watchdog: `GET/PUT /routing/watchdog/configs`; `GET /routing/watchdog/events`
- Tenants: `GET /metrics/slo(*/timeseries)`; `GET /metrics/cost/tenant(*/timeseries/forecast/anomalies)`; `GET /metrics/cost/models/anomalies`
- DLQ: `GET /ops/dlq`; `GET /ops/dlq/signatures(*/timeseries)`; `GET/PUT /ops/dlq/policy`; `GET /ops/dlq/audit`; `GET /ops/dlq/rootcauses`; `POST /ops/dlq/policy/simulate`
- Alerts: `GET/POST/DELETE /alerts/routes`; `GET /alerts/events`; `POST /alerts/events/test`; `GET /alertcenter/events`; `GET /alertcenter/incidents`
- Providers: `PUT /providers/:id/limits`; `GET /providers/usage`
- EvalOps: `GET /eval/scorecards/run/:id`; `GET/PUT /eval/scorecards/pipeline/:id/baseline`; `GET /eval/gates/pipeline/:id`; `POST /eval/gates/check`
- Agent/HITL: `GET /runs/:id/agent/steps`; `GET /runs/:id/agent/stream` (SSE); `POST /runs/:id/agent/actions`

## UI Routes

- CICD: `#/maestro/cicd`
- Routing Studio: `#/maestro/routing`
- Pipeline Detail: `#/maestro/pipelines/:id`
- Tenant Observability: `#/maestro/tenants/observability`
- Tenant Costs: `#/maestro/tenants/costs`
- DLQ: `#/maestro/ops/dlq/signatures`, `#/maestro/ops/dlq/policy`, `#/maestro/ops/dlq/root`, `#/maestro/ops/dlq/sim`
- AlertCenter: `#/maestro/alertcenter` (Events/Incidents toggle)
- Provider Rates: `#/maestro/providers/rates`
- Run Detail: `#/maestro/runs/:id` (Scorecard and Agent tabs)

## CI Gate Check (GitHub)

- Composite Action: `.github/actions/maestro-gate-check/action.yml`
- Example Workflow: `.github/workflows/maestro-gate.yml`

Inputs:

- `gateway-base`: e.g., `https://gateway.example.com/api/maestro/v1`
- `pipeline`: pipeline id/name (e.g., `intelgraph_pr_build`)
- `run-id`: Maestro run id to check
- `token`: optional bearer token

Behavior: Exits non‑zero if gate `status=BLOCK` (annotates failing metrics).

## Build & Dev

- Frontend build for Maestro only: `cd conductor-ui/frontend && npm run build:maestro`
- Recharts added to package.json; run `npm i` before using charted variants.
- Typescript relaxed for rapid iteration: `tsconfig.app.json` has `strict: false` (skipLibCheck already enabled).

## Accessibility

- Dialogs use focus trap; tables/regions labeled; buttons have clear text; color is not the sole signal.

## Notes

- This pack is dev‑stubbed. Replace endpoints with your gateway when integrating.
- Grafana base/UIDs are read from `window.__MAESTRO_CFG__` (see `src/maestro/config.ts`).
