# Runbook: Structured RAG (DB-Not-Docs)

**Authority:** [SUMMIT Readiness Assertion](../../SUMMIT_READINESS_ASSERTION.md)

## Enablement

1. Set `SUMMIT_STRUCTURED_RAG=1`.
2. Provide allowlist + tenant guard configuration.
3. Ensure DB credentials are read-only.
4. Validate evidence artifacts appear under `artifacts/structured-rag-db-not-docs/<run_id>/`.

## Required Configuration

- Allowlisted tables/columns.
- Tenant guard (if multi-tenant).
- Budgets for `max_rows` and `max_bytes`.

## Evidence Inspection

- `evidence.json`: results and policy outcome.
- `query_plan.json`: deterministic plan details.
- `metrics.json`: planner/execution timings, rows, bytes.
- `stamp.json`: timestamp only.

## Failure Modes

- **PolicyViolation**: missing tenant filter, unbounded limits, or size budget exceeded.
- **DisambiguationRequired**: ambiguous entity results when a unique match is required.
- **Schema drift**: allowlist table/column no longer exists.

## Rollback

- Set `SUMMIT_STRUCTURED_RAG=0`.
- Revert commit if necessary.

## Drift Response

- Re-run with updated allowlist.
- Update evidence schema if new fields are introduced.
