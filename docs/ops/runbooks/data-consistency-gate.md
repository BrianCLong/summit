# Data Consistency Gate Runbook

## Purpose
CI-enforced parity check between relational and graph projections for critical entities. This
verifies deterministic digests and blocks merges on unexpected deltas.

## Prerequisites
- Postgres accessible to CI (service container or hosted).
- Neo4j accessible to CI (service container or hosted).
- `pgcrypto` extension enabled on Postgres.
- APOC enabled in Neo4j.

## Configuration
- `PG_DIGEST_SQL_FILE` (optional): path to Postgres digest SQL.
- `NEO4J_DIGEST_CYPHER_FILE` (optional): path to Neo4j digest Cypher.
- `NEO4J_URI`: connection URI (default `bolt://localhost:7687`).
- `NEO4J_USER`: Neo4j username.
- `NEO4J_PASS`: Neo4j password.

## Evidence Outputs
- `artifacts/evidence/data_consistency/evidence_delta.json` (deterministic).

## Debugging a Mismatch
1. Verify projection parity (fields, separators, null handling).
2. Validate time formatting (UTC ISO 8601 or excluded).
3. Confirm both systems used the same entity slice.
4. Re-run digest scripts locally with non-sensitive data.

## Credential Rotation
- Rotate CI secrets in the organization/environment secret store.
- Validate service connectivity before re-running the gate.

## Performance Notes
- For large datasets, consider future chunked hashing strategies.
- Track digest compute time in CI to keep within budget.
