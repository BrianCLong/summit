# Cost/Performance Guardrails

## Purpose

Prevent regressions on cost, latency, and reliability by enforcing budgets during CI and documenting reversible switches.

## Budgets (Aligned to Baseline)

Budgets are materialized in `docs/optimization/guardrail-budgets.json` and used by `scripts/verify_cost_perf_guardrails.sh`.

| Metric                       | Budget    | Fail Condition                   |
| ---------------------------- | --------- | -------------------------------- |
| cost_per_1k_tokens           | <= 0.0035 | Exceeds budget by >3%            |
| avg_tool_invocations_per_run | <= 2.5    | Exceeds budget by >5%            |
| latency_p95_ms               | <= 1500   | Exceeds budget by >5%            |
| latency_p99_ms               | <= 1900   | Exceeds budget by >5%            |
| error_rate                   | <= 0.01   | Exceeds budget by >0.2% absolute |
| sla_budget_remaining         | >= 0.90   | Drops below threshold            |

## CI Job

- Workflow: `.github/workflows/verify-cost-perf-guardrails.yml`
- Action: runs `scripts/verify_cost_perf_guardrails.sh` with default metrics file `artifacts/cost_perf/latest.json`.
- Behavior:
  - Warns (exit 0) if metrics file is stale (>14 days) but provides reminder to refresh.
  - Fails (exit 1) if any metric breaches budget.

## Kill Switches

- Disable guardrail enforcement: `GUARDRAILS_DISABLED=true` (CI and local). Use only for emergency with approval.
- Optimization-level switches documented in `docs/optimization/ROI_OPTIMIZATIONS.md`.

## Regression Handling

1. CI fails → triage owner notified.
2. Roll back offending change or toggle kill switch if needed to restore service.
3. Capture incident note with metric deltas and remediation.
4. Update baseline/budgets only after governance approval and evidence of sustained improvement.

## Data Freshness

- Metrics older than 14 days trigger warnings and must be refreshed before release.
- `--record` flag on the script can update the `timestamp` when new data is captured.
- Metrics payloads must include `sample_size`, `collection_window`, and `collector` metadata for auditability.
