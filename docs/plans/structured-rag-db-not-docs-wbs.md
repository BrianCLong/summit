# Structured RAG (DB-Not-Docs) — WBS

## Scope
Feature-flagged structured retrieval pipeline (SQL-first) with deterministic evidence artifacts.

## Work Breakdown Structure

1. **PR1 — Skeleton + Flag (current)**
   - Add `SUMMIT_STRUCTURED_RAG` flag in `summit/flags.py`.
   - Scaffold structured retrieval modules and types.
   - Add import smoke test.
   - Update roadmap status entry and repo assumptions.

2. **PR2 — Schema Introspection + Allowlist**
   - SQLite introspection; optional Postgres adapter.
   - Allowlist config schema and loader.
   - Tests for seeded DB introspection.

3. **PR3 — Safe Query Planner**
   - Constrained query plan compilation (FK joins, allowlist columns, enforced LIMIT).
   - Aggregation support for eval cases.
   - Planner unit tests with seeded fixtures.

4. **PR4 — Policy Gate**
   - SELECT-only enforcement, tenant predicate requirement, budgets.
   - Injection guardrails and unbounded scan blocks.
   - Policy tests for denial cases.

5. **PR5 — Evidence Contract + Writer**
   - JSON schema for evidence.
   - Canonical serialization writer; determinism tests.
   - Evidence, plan, metrics, and stamp outputs.

6. **PR6 — Eval Pack + Drift Detection**
   - Structured eval cases (disambiguation + aggregation).
   - Drift detection script and runbook updates.

## Acceptance Signals
- Feature flag default OFF; import tests pass.
- Roadmap status updated with structured RAG initiative.
- Plan remains within 6 PRs and retrieval/tooling boundary.
