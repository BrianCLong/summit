# Backlog Telemetry & Oversight

Backlog automation remains explainable and auditable through explicit telemetry emitted by the
scoring and assignment tooling.

## Artifacts

- `artifacts/backlog/backlog-snapshot.json`: Scored backlog with bands and rationales.
- `artifacts/backlog/backlog-metrics.json`: Aggregated metrics (counts, average score, effort/risk)
  for CI and dashboards.
- `artifacts/backlog-decisions/*-assignment.json`: Assignment checks with pass/fail reasons.
- `artifacts/backlog-decisions/{item_id}.json`: Locked Agent Task Specs derived from the snapshot.

## Metrics Tracked

- Counts per priority band (P0-P3) and per category.
- Aggregate estimated risk reduction and effort.
- Agent throughput: number of assignment decisions per agent (calculated from the decisions folder).
- Drift: change in average priority score between snapshots (computed in CI).

## Oversight Loop

1. **Snapshot generation**: CI runs `scripts/backlog/score-items.ts` and publishes snapshot + metrics
   as build artifacts.
2. **Review**: Governance reviewers validate metrics versus budgets and risk posture before enabling
   auto-pull for a window.
3. **Assignment evidence**: Each pull writes a decision file for audit and feeds risk/debt ledgers.
4. **Feedback**: Updated metrics inform weight tuning in `backlog/weights.yaml` and budget updates in
   `backlog/agents.yaml`.

## Transparency Requirements

- Every metric and assignment file must include timestamps and input file references.
- No opaque ML models are used; scoring is weight-based and deterministic.
- Humans may veto items or adjust weights; resulting artifacts must be regenerated to reflect the
  decision history.
