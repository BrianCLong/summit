# RLS Pattern Pack (Tenant Isolation)

This pack introduces guarded Row-Level Security (RLS) for case data so we can measure overhead in **staging** before widening the rollout.

## Feature flag & scope

- Enable with `RLS_V1=1` (staging-only by default).
- The `rlsSessionMiddleware` binds `app.current_tenant_id` (and optional `app.current_case_id`) for tracked routes such as `/api/cases` and `/api/case-tasks`.
- Policies are permissive when the flag or session variables are missing (`app.rls_enabled()` falls back to `false`), keeping existing app-level authorization intact.

## Session configuration contract

The Postgres session uses lightweight GUCs instead of query rewriting:

```sql
SELECT set_config('app.rls_v1', '1', true);
SELECT set_config('app.current_tenant_id', '<tenant-id>', true);
SELECT set_config('app.current_case_id', '<case-id>', true); -- optional
```

The DB helpers set these automatically when `RLS_V1=1`, `NODE_ENV=staging`, and a tenant-bound request is inside the RLS async context.

## Policies and index patterns

- Migration `202503050001_rls_pattern_pack` adds:
  - RLS policies for `maestro.cases`, `maestro.audit_access_logs`, and all case-scoped tables (participants, tasks, SLAs, approvals, approval_votes, graph references) using the tenant-aware helper `app.allow_case_row(case_id)`.
  - Composite indexes for the hot paths:
    - `maestro.cases(tenant_id, id)` (`idx_cases_tenant_case`)
    - `maestro.audit_access_logs(tenant_id, case_id)` (`idx_audit_access_logs_tenant_case`)
- Queries must include tenant and/or case predicates to stay on these indexes:
  - `WHERE tenant_id = current_setting('app.current_tenant_id', true)`
  - `AND case_id = current_setting('app.current_case_id', true)` (when applicable)

## EXPLAIN checks

Use JSON plans to verify index usage and avoid seq scans:

```sql
EXPLAIN (FORMAT JSON)
SELECT * FROM maestro.cases
WHERE tenant_id = current_setting('app.current_tenant_id', true)
  AND id = current_setting('app.current_case_id', true)::uuid;
```

Automated plan guards live in `server/src/db/plan-inspector.ts` with tests in `server/src/db/__tests__/plan-inspector.test.ts` to flag sequential scans or missing indexes.

## Safety & fallback

- Policies short-circuit when `app.rls_v1` is unset, so pre-existing authorization flows continue to function if the flag is off or the session is missing tenant context.
- When the flag is on, per-request middleware + DB helpers ensure the GUCs are set before queries execute; failures to set them log a warning and proceed with app-level filtering.
