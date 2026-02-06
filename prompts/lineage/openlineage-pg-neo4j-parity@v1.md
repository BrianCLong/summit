# Prompt: openlineage-pg-neo4j-parity@v1

Implement a deterministic OpenLineage RunEvent emitter for Postgres change batches with byte-stable
run manifests, schema validation, fixture-driven determinism tests, and normative Postgres → Neo4j
parity documentation/runbook. Ensure manifest/stamp separation, optional row digest inclusion, and
OpenLineage emission gated by environment flags.
