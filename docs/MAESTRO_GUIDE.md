# Maestro & Conductor Developer Guide

## Local Pipeline Execution

To run pipelines locally and verify evidence linkage:

1.  **Trigger a Run**:
    Use the API to create a run. You can include an `idempotency_key` to prevent duplicate execution.

    ```bash
    curl -X POST http://localhost:4000/runs \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "pipeline_id": "your-pipeline-uuid",
        "pipeline_name": "test-pipeline",
        "idempotency_key": "unique-request-id-123"
      }'
    ```

2.  **Verify Evidence Linkage**:
    Maestro now automatically pushes evidence to IntelGraph (Neo4j). You can verify the linkage using Cypher:

    ```cypher
    // Find the run and its evidence
    MATCH (r:Run {id: 'your-run-id'})-[:GENERATED]->(e:Evidence)
    RETURN r, e
    ```

    Or check for claims (decisions):

    ```cypher
    // Find claims made by the run
    MATCH (r:Run {id: 'your-run-id'})-[:MADE_CLAIM]->(c:Claim)-[:SUPPORTED_BY]->(e:Evidence)
    RETURN r, c, e
    ```

## Run Types & Metadata

- **P0 Runs (Critical)**: Use `idempotency_key` to ensure exactly-once processing logic (at least for initiation).
- **Standard Runs**: Regular pipeline executions.

**Metadata Guarantees:**

- All runs are persisted in PostgreSQL (`runs` table).
- Provenance evidence is stored in `evidence_ledger` and hashed into a Merkle Tree.
- Graph nodes (`Run`, `Evidence`, `Claim`) are synced to IntelGraph (Neo4j) for traversal and analysis.

## Verification Steps

1.  **API**: Check `GET /runs/:id` for status and cost.
2.  **Postgres**: Verify `evidence_ledger` contains rows for the run.
3.  **Neo4j**: Verify `(Run)-[:GENERATED]->(Evidence)` relationships exist.
