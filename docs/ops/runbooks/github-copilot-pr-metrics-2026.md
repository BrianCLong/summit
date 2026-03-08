# Runbook — GitHub Copilot PR Metrics

## Failure Modes

1. API outage
2. Schema drift
3. Null-value anomalies

## Response Steps

1. Disable lane with `COPILOT_PR_METRICS_ENABLED=false`.
2. Preserve latest generated artifacts for audit.
3. Validate contract with `python scripts/ci/copilot_pr_metrics_checks.py`.
4. Re-enable after endpoint and schema validation passes.

## Alert Conditions

- Throughput regression > 20% week-over-week.
- Merge time > 2x rolling baseline.
