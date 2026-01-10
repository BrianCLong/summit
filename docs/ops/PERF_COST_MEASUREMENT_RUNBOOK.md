# Performance & Cost Measurement Runbook

**Audience:** FinOps, DevOps, Performance Stewards
**Last Updated:** 2025-05-27

This runbook details how to execute performance and cost measurements for Summit using the unified measurement tool.

---

## 1. Quick Start

To generate a current performance and cost report:

```bash
node scripts/ops/measure_perf_cost.mjs
```

**Output:**
1.  **Stdout:** Human-readable summary of budgets, artifact sizes, and cost models.
2.  **Artifact:** `perf-cost-report.json` (machine-readable).

---

## 2. Measurement Procedures

### 2.1 Latency Budgets
**Source:** `performance-budgets.json`
**Mechanism:** Static check.
The script validates that the budgets defined in JSON are structurally valid. It does *not* run load tests.
*To run load tests:* Refer to `k6/` directory and `docs/ops/SLI_SLO_ALERTS.md`.

### 2.2 Bundle Size
**Source:** `metrics.json` (Baseline) vs `server/dist/` (Actual)
**Mechanism:**
1.  Reads `bundle_size_bytes` from `metrics.json`.
2.  Checks for build artifacts in `server/dist/server.js`.
3.  Calculates drift percentage.

**If "Measured" is "Not found":**
You need to build the project first:
```bash
npm run build:server
node scripts/ops/measure_perf_cost.mjs
```

### 2.3 Cost Modeling
**Source:** `cost-baseline.json`
**Mechanism:** Static check against the modeled hourly run rate.
This is a "Model-Based" check. It confirms that our *architecture design* fits within the budget, assuming standard usage patterns.

---

## 3. Updating Baselines

If the script reports significant drift (e.g., bundle size increase > 5%), you must either:

1.  **Fix the Regression:** Optimize imports, remove unused code.
2.  **Update the Baseline:** If the increase is justified (new features):
    *   Update `metrics.json` with the new byte count.
    *   Update `cost-baseline.json` if resource requirements changed.
    *   Commit the changes.

---

## 4. Governance Integration

This script should be run:
*   **Pre-Commit:** Optionally by developers to check impact.
*   **CI/CD:** As a non-blocking informational step (or blocking if strict drift is enabled).
*   **Weekly:** By the Performance Steward to generate the `perf-cost-report.json` for the Ops Review.
