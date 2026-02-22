# Structured RAG (DB-Not-Docs) Standard

**Authority:** [SUMMIT Readiness Assertion](../SUMMIT_READINESS_ASSERTION.md)

## Scope
Defines the SQL-first structured retrieval mode, including configuration, plan schema, and deterministic evidence outputs.

## Configuration Keys

- `SUMMIT_STRUCTURED_RAG` (env, default: `0`): feature flag.
- `allowlist.tables`: map of table → allowed columns.
- `tenant`: optional tenant guard with `column` + `value`.
- `budgets.max_rows`: enforced limit for query results.
- `budgets.max_bytes`: enforced byte budget for result payload.
- `evidence_root`: artifact output root.
- `item_slug`: evidence slug (`structured-rag-db-not-docs`).

## Query Plan Schema

```
QueryPlan
- table: string
- select: string[]
- filters: { [column]: value | [operator, value] }
- aggregations: { [alias]: [function, column] }
- group_by: string[]
- limit: number
- order_by: string[]
- sql: string (SELECT-only)
- params: array
```

## Deterministic Serialization

- `evidence.json`, `query_plan.json`, and `metrics.json` are serialized with sorted keys and stable formatting.
- Timestamps only appear in `stamp.json`.
- Every artifact is written under `artifacts/structured-rag-db-not-docs/<run_id>/`.

## Evidence Contract

Required artifacts per run:

- `evidence.json`
- `query_plan.json`
- `metrics.json`
- `stamp.json`

`evidence.json` includes:

- `run_id`
- `item_slug`
- `evidence.rows`
- `evidence.row_count`
- `evidence.bytes`
- `evidence.policy.allowed`
- `evidence.policy.reasons`

## Policy Gates

- SELECT-only.
- `LIMIT` required and enforced.
- Tenant filter required when configured.
- Result size must not exceed `max_bytes`.
