# Data Consistency Digests Standard

## Purpose
Establish a deterministic, CI-enforced parity check between relational (Postgres) and graph (Neo4j)
projections for the same canonical entity slice. The gate asserts projection equivalence, not
strong consistency or migration correctness.

## Import
- Postgres query projection (`db/consistency/entities-digest.sql`)
- Neo4j query projection (`graph/consistency/entities-digest.cypher`)

## Export
- Deterministic evidence: `artifacts/evidence/data_consistency/evidence_delta.json`
- Optional runtime metadata: `stamp.json` (runtime-only, if adopted in governance)

## Determinism Requirements
- Canonical projection across both systems.
- Stable ordering (`string_agg ... ORDER BY` in Postgres, `apoc.coll.sort` in Neo4j).
- Explicit formatting for temporal fields (UTC ISO 8601 or exclusion).
- No timestamps or randomness in deterministic artifacts.

## Evidence Schema (v1.0)
- `schema_version`
- `comparison`
- `projection`
- `postgres.run_digest`
- `neo4j.run_digest`
- `passed`
- Optional: `delta[]`

## Non-goals
- Not a migration system.
- Not a full diff engine.
- Not a claim of strong, bi-directional correctness.
