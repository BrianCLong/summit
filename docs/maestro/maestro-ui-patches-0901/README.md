Maestro UI Patch Log — 2025-09-01

Scope: Incremental features and dev gateway stubs to unblock end-to-end Maestro Console work. All changes are additive and isolated under conductor-ui.

Highlights

- Node-level logs filter in Run Detail (click “View node logs” to filter SSE stream by node)
- CI/GitHub annotations surfaced (Run detail CI tab + CICD aggregated view)
- A11y: focus trap utility and dialog improvements (command palette, replay)
- DAG badges for retries and compensation; Timeline tab using node startMs
- Pipelines: Validate + Policy Explain for Plan Preview
- Routing: Pin model (dev stub persistence)
- Secrets: Providers health panel + Test connection
- Compare vs previous run view (duration/cost deltas, changed nodes)

How to Run

1. Start dev stub: node conductor-ui/backend/server.js
2. Configure UI (index.html):
   window.**MAESTRO_CFG** = { gatewayBase: 'http://localhost:3001/api/maestro/v1' };
3. Start UI: cd conductor-ui/frontend && npm run dev, navigate to /maestro

Notes

- No IntelGraph UI or server files were overwritten; Maestro runs separately under /maestro.
- Stub endpoints are for local development; replace with real gateway when ready.
