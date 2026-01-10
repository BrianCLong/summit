# Case Ops Performance Harness (Start/Cancel/Approve/Export)

## Purpose

This harness exercises the case lifecycle endpoints for start, approval, export, and cancel flows
and captures p95/p99 latency baselines for regression tracking.

## Prerequisites

- API service running (default: `http://localhost:4000`).
- Valid tenant/user context headers or an auth token.

## Run the Harness

```bash
BASE_URL=http://localhost:4000 \
TENANT_ID=perf-tenant \
USER_ID=perf-user \
LEGAL_BASIS=investigation \
AUTH_TOKEN=<optional> \
VUS=5 ITERATIONS=5 \
k6 run tests/k6/case-ops-flow.k6.js
```

### Approval flow requirements

The approval steps hit `/api/cases/:id/approvals` and `/api/approvals/:id/vote`.
These endpoints accept either:

- `Authorization: Bearer <token>` (preferred), or
- `x-user-id` + `x-tenant-id` headers (used by the k6 harness defaults).

### Optional tuning

- `VUS` / `ITERATIONS`: Increase for heavier load.
- `MAX_DURATION`: Upper bound on scenario runtime (default `5m`).
- `LEGAL_BASIS`: Set to an allowed legal basis value (see `server/src/repos/AuditAccessLogRepo.ts`).

## Baseline Output

The run writes a baseline report to:

```
perf/baselines/case-ops-flow-baseline.json
```

This report includes p95 and p99 latencies for each step:

- `case_start_duration_ms`
- `case_approval_request_duration_ms`
- `case_approval_vote_duration_ms`
- `case_export_duration_ms`
- `case_cancel_duration_ms`

## Interpreting Results

- Compare current p95/p99 values against the persisted baseline.
- If p95/p99 increases >10% for any step, treat it as a regression and investigate:
  - API latency (service logs)
  - DB contention (Postgres/Neo4j)
  - approval/export workflow changes

## Updating the Baseline

1. Run the harness under representative load.
2. Commit the updated `perf/baselines/case-ops-flow-baseline.json` file.

Baseline values are **Deferred pending perf run** until the harness is executed on target hardware.
