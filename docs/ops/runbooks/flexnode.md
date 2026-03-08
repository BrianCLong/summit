# Flex Node Selector Runbook

## SLO
- Selector availability: 99.9%.

## Alerts
- Trigger alert when `cost_median_shift_pct` exceeds 10%.
- Trigger alert when `pool_shrink_pct` exceeds 20%.

## Operations
1. Generate current selection artifacts.
2. Run `scripts/monitoring/flexnode-drift.py`.
3. Inspect `artifacts/flexnode/drift_report.json` and `artifacts/flexnode/trend_metrics.json`.

## Rollback
- Set `summit/policies/flex_node_policy.yaml` -> `enabled: false`.
- Re-run workloads with fixed node policy.
