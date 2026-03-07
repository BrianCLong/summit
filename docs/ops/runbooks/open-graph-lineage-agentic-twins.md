# Runbook: Open Graph + Lineage + Agentic Twins

## Objective

Operationalize TwinGraph + LineageBus with deterministic evidence output and clean CI merge
readiness.

## Preflight

1. Install dependencies: `pnpm install`
2. Verify core gates:
   - `pnpm lint`
   - `pnpm typecheck`
   - `pnpm test`
3. If golden path surfaces are touched: `make smoke`

## Local Validation Sequence

1. Unit contract validation: `pnpm test`
2. Lineage e2e validation: `pnpm test:e2e`
3. Optional compose-based observability validation:
   - `docker compose up -d`
   - run sample workflow
   - query Marquez endpoint for job/run existence

## SLO & Budget Targets

- Lineage emission overhead: p95 < 25ms/action.
- Incremental lineage memory: < 50MB/run.
- Event volume: bounded per run with repetitive sub-action collapse.

## Deterministic Artifacts

- `artifacts/lineage/report.json`
- `artifacts/lineage/metrics.json`
- `artifacts/lineage/stamp.json`

Artifacts must not contain wall-clock timestamps.

## Rollback Triggers

Rollback is immediate when any of the following occurs:

- policy denials regress for known-allowed actions,
- lineage redaction test fails,
- e2e Marquez job/run checks fail,
- p95 lineage emission overhead exceeds budget for two consecutive runs.

## Rollback Steps

1. Disable feature flags for new lineage/twin paths.
2. Revert offending commit(s).
3. Re-run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and affected e2e checks.
4. Publish governed exception record if temporary bypass is required.

## Post-Deploy Accountability Window

- Window: 7 days after enablement in non-prod, then 7 days in production.
- Monitor: lineage event failure rate, redaction violations, policy deny anomalies, p95 emission
  latency.
