# Runbook: Coordination Evaluation Gate

## Alert Conditions

- Immediate alert when `coordination_score` drops more than 10% on a protected branch.
- Weekly drift alert when trend regression exceeds 5%.

## SLO / SLA

- SLO: 99% of evaluated workflows pass the coordination gate.
- SLA: Weekly regression review with remediation owner assignment.

## Triage Steps

1. Inspect `artifacts/coordination_report.json` and `artifacts/coordination_metrics.json`.
2. Validate all events carry `evidence_id` and monotonic logical timestamps.
3. Check context hash divergence in the context ledger.
4. Rerun `python summit/ci/check_coordination.py --metrics artifacts/coordination_metrics.json`.
