# GitHub Copilot PR Metrics Standard (2026-02-19)

## Scope

This standard defines deterministic ingestion requirements for Copilot Usage Metrics API fields:

- `pr_throughput`
- `time_to_merge_hours`

## Deterministic Contract

- Emit exactly three artifacts:
  - `evidence/copilot_pr_metrics/report.json`
  - `evidence/copilot_pr_metrics/metrics.json`
  - `evidence/copilot_pr_metrics/stamp.json`
- Prohibit runtime timestamps in `report.json` and `metrics.json`.
- Preserve stable metric key ordering.

## Policy Gate Names

- `metrics-schema-validate`
- `deterministic-output-check`
- `no-unstable-fields`

## Non-Goals

- Individual developer ranking
- HR scoring
- Predictive performance modeling
