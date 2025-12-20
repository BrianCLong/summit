# Read Models v1: Case Dashboard Projection

## Goal
Reduce join fanout for case dashboards by serving pre-aggregated metrics from a read-optimized table that is refreshed by database triggers.

## Feature flag
- `READ_MODELS_V1=1` routes case list/detail workflows to the read model for summary metrics.
- Default off to preserve current behavior.

## Schema
- Table: `maestro.case_dashboard_read_models`
- Fields: `participant_count`, `open_task_count`, `breached_sla_count`, `at_risk_sla_count`, `pending_approval_count`, `last_task_due_at`, `refreshed_at`.
- Projection function: `maestro.refresh_case_dashboard_read_model(case_id uuid)`.
- Backfill helper: `maestro.backfill_case_dashboard_read_models()`.

## Freshness & consistency
- **Strong on write:** Triggers on `cases`, `case_participants`, `case_tasks`, `case_slas`, and `case_approvals` invoke the projection function after each insert/update/delete.
- **Read isolation:** Reads remain in the primary database; no replication lag considerations.
- **Recovery:** `backfill_case_dashboard_read_models` can be run if triggers were disabled or after bulk imports.

## Backfill
Run from the server root:

```bash
pnpm --filter intelgraph-server ts-node scripts/backfill-case-read-models.ts
```

This calls `maestro.backfill_case_dashboard_read_models()` and logs the number of rows processed.

## Endpoints benefiting
- Case list (`CaseWorkflowService.listCases`) now attaches `dashboardMetrics` without re-running join-heavy aggregates when `READ_MODELS_V1=1`.
- Case detail (`CaseWorkflowService.getCase`) includes the same metrics under the flag.
