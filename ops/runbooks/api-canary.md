# API Canary Rollback Runbook

**Primary Dashboard:** Grafana → `API Service Health`

## 1. Trigger Conditions
- PagerDuty incident from `APISLOFastBurn` or `APISLOSlowBurn` alert.
- Canary job failure in `summit-ci-cd` GitHub Action with rollback executed.

## 2. Immediate Actions
1. Acknowledge the page within 5 minutes.
2. Confirm rollback completion in the GitHub Action logs (`Simulate canary deployment` and `Rollback canary`).
3. Freeze further deploys by pausing the `release` job (`workflow_run` guard) until SLO burn <40%.

## 3. Diagnostics
- **SLI Validation:**
  - Check Grafana panel `Error Rate` for spike correlation with deploy time.
  - Run Prometheus query `sum by (status) (rate(http_server_requests_total{service="api"}[5m]))` to isolate failing routes.
- **Trace Sampling:**
  - Use Tempo to pull traces tagged with `service.version=<failed version>` and inspect spans with status `ERROR`.
- **Log Review:**
  - Loki query `{service="api",level="error",version="<failed version>"}` for stack traces.

## 4. Mitigation Steps
- Validate stable version health: ensure error rate <0.05% post-rollback.
- If config or feature flag related, revert via `scripts/feature-flags.ts` and re-run smoke tests.
- Coordinate with release manager before re-attempting deployment.

## 5. Post-Incident
- File RCA within 24 hours including:
  - Root cause summary and blast radius.
  - Guardrail metrics (error budget % consumed, cost impact).
  - Follow-up tasks for automation gaps.
