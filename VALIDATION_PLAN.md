# Validation Plan: Product & Engineering Analytics

This document outlines how to validate the new telemetry and dashboards.

## 1. Verify Metrics Exposure

**Action**: Curl the metrics endpoint.
**Command**: `curl http://localhost:3001/metrics`
**Expectation**: The output should contain the new metrics:
- `golden_path_step_total`
- `maestro_deployments_total`
- `maestro_pr_lead_time_hours`
- `maestro_change_failure_rate`
- `maestro_mttr_hours`

## 2. Verify Golden Path Instrumentation (Backend)

**Investigation Creation**:
- **Action**: Create a new case via API (POST /api/cases).
- **Verification**: Check `golden_path_step_total{step="investigation_created"}` increments.

**Copilot Query**:
- **Action**: Send a request to POST /api/copilot/nl-to-cypher.
- **Verification**: Check `golden_path_step_total{step="copilot_query"}` increments.

**Graph Exploration**:
- **Action**: Access GET /api/graph/graph.
- **Verification**: Check `golden_path_step_total{step="relationships_explored"}` increments.

## 3. Verify Telemetry Endpoint (Frontend/General)

**Action**: Send a custom telemetry event.
**Command**:
```bash
curl -X POST http://localhost:3001/telemetry/events \
  -H "Content-Type: application/json" \
  -d '{"event": "golden_path_step", "labels": {"step": "results_viewed"}}'
```
**Verification**: Check `golden_path_step_total{step="results_viewed"}` increments.

## 4. Verify Grafana Dashboard

**Action**: Import `server/observability/grafana-dashboard.json` into a local Grafana instance.
**Verification**:
- "Product Analytics (Golden Path)" row exists.
- "Golden Path Funnel" shows counts for the steps exercised above.
- "Engineering Productivity (DORA)" row exists (panels may be empty/zero if no data yet).

## 5. Verify DORA Metrics

Since DORA metrics typically come from CI/CD, verify the webhook endpoint:

**Deployment**:
```bash
curl -X POST http://localhost:3001/telemetry/dora \
  -H "Content-Type: application/json" \
  -d '{"metric": "deployment", "labels": {"environment": "production", "status": "success"}}'
```
**Verification**: Check `maestro_deployments_total` increases.

**Lead Time**:
```bash
curl -X POST http://localhost:3001/telemetry/dora \
  -H "Content-Type: application/json" \
  -d '{"metric": "lead_time", "value": 24}'
```
**Verification**: Check `maestro_pr_lead_time_hours` histogram.

## 6. Automated Testing

Run the backend tests to ensure no regressions in the modified routes:
`npm run test:server`
