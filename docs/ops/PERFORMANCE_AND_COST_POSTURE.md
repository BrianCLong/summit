# Performance & Cost Posture

**Owner:** FinOps / Performance Steward
**Status:** Active
**Last Updated:** 2025-05-27

This document defines the authoritative performance and cost posture for Summit. It serves as the single source of truth for budgets, thresholds, and governance, derived from `performance-budgets.json`, `cost-baseline.json`, and `metrics.json`.

---

## 1. Performance Posture

Performance is measured against strict latency and error rate budgets. These budgets are "fail-closed" for critical paths.

### 1.1 Latency Budgets (p95 / p99)

Source: `performance-budgets.json`

| Endpoint | Criticality | p95 Budget | p99 Budget | Description |
|---|---|---|---|---|
| `/health` | **CRITICAL** | 50ms | 100ms | Health check |
| `/health/ready` | **CRITICAL** | 100ms | 200ms | Readiness check (DB/Cache) |
| `/graphql` | **CRITICAL** | 300ms | 800ms | Main API Gateway |
| `/api/v1/auth/login` | **CRITICAL** | 300ms | 800ms | Authentication |
| `/api/v1/search` | Standard | 500ms | 1200ms | Full-text search |
| `/api/v1/analytics` | Standard | 800ms | 2000ms | Heavy reporting |

**Escalation Trigger:**
*   Any **CRITICAL** endpoint exceeding p95 budget by >10% in a 15-minute window triggers a P1 Incident.
*   Standard endpoints exceeding budget triggers a warning ticket.

### 1.2 Bundle Size & Artifacts

Source: `metrics.json`

*   **Max Bundle Size:** ~5.2MB (derived from 5,114,509 bytes)
*   **Threshold:** Any increase > 5% requires justification.

---

## 2. Cost Posture (FinOps)

Cost is modeled based on total system footprint and resource consumption.

### 2.1 Unit Economics

Source: `cost-baseline.json`

*   **Total Hourly Cost Target:** $60.50
*   **Allowed Drift:** 5%

### 2.2 Cost Drivers

1.  **Compute:** API Server, Worker Nodes (Batch/Ingestion).
2.  **Storage:** PostgreSQL, Neo4j, Redis.
3.  **AI/ML:** Model inference costs (token based).

**Governance:**
*   Cost measurements are run nightly.
*   Drift > 5% triggers a budget review.

---

## 3. Governance & Measurement

### 3.1 Measurement Tooling

Measurements are performed using the repo-local script:
`scripts/ops/measure_perf_cost.mjs`

This script aggregates data from:
1.  Static baselines (`performance-budgets.json`)
2.  Live artifact checks (Bundle sizes)
3.  Cost models (`cost-baseline.json`)

### 3.2 Update Procedure

To update a budget:
1.  Open a PR changing `performance-budgets.json` or `cost-baseline.json`.
2.  Provide evidence (load test results) justifying the change.
3.  Receive approval from the Performance Steward.

### 3.3 Integrity

All metrics must be reproducible from the repository. No "magic numbers" from external SaaS dashboards are accepted as the primary source of truth for this posture doc.
