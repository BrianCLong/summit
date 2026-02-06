# Prompt: Data Consistency Digest Gate (v1)

## Objective
Implement a deterministic CI gate that compares Postgres and Neo4j digest projections for a
canonical entity slice. Emit deterministic evidence artifacts and fail on unexpected deltas.

## Required Outputs
- Postgres digest SQL in `db/consistency/`.
- Neo4j digest Cypher in `graph/consistency/`.
- Comparison script in `scripts/ci/` producing deterministic evidence.
- Evidence, security handling, and runbook documentation.
- CI workflow wiring with artifact upload.
- `docs/roadmap/STATUS.json` update and `repo_assumptions.md` append.

## Determinism Rules
- Stable ordering for digest aggregation.
- Canonical projection with explicit formatting.
- No timestamps in deterministic artifacts.

## Evidence Contract
Emit `artifacts/evidence/data_consistency/evidence_delta.json` with schema v1.0 and optional delta.

## Validation
- Add a unit test for evidence construction.
- Run determinism verifier when adding Cypher.
