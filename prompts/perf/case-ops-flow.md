# Prompt: Case Ops Perf Harness + Switchboard Telemetry

## Intent

Deliver a performance harness that exercises case start/cancel/approve/export flows, capture p95/p99
baselines, and add Switchboard-aligned telemetry instrumentation in the web metrics layer.

## Scope

- Add k6 load script for case lifecycle flows.
- Persist a baseline report under perf/.
- Instrument Switchboard telemetry events from the web metrics layer.
- Ensure case workflow approval routes are reachable in the API service.
- Document how to run the harness and interpret results.

## Constraints

- Use existing API routes in `server/src/routes/cases.ts` and `server/src/routes/case-workflow.ts`.
- Keep telemetry events routed through `/api/monitoring/telemetry/events`.
- No secrets, no production endpoints.

## Output

- New k6 script in `tests/k6/`.
- Baseline JSON in `perf/baselines/`.
- Runbook under `docs/runbooks/`.
- Web telemetry update under `apps/web/src/telemetry/`.
