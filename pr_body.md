## Assumption Ledger
- Neo4j is available for testing and in production.
- Debezium events will follow the `after` / `payload.after` structure.

## Diff Budget
- Added Python reconciler script.
- Added Cypher script.
- Modified GitHub actions to ensure CI/CD tests pass.

## Success Criteria
- Idempotent updates are supported by neo4j reconciler.
- CI correctly provisions the tests and executes tests.

## Evidence Summary
- Successfully ran Pytest against a 10K Canary file, verifying convergence and fast operations.

<!-- AGENT-METADATA:START -->
{
  "promptId": "neo4j-reconciler",
  "taskId": "PR-1234",
  "tags": ["neo4j", "reconciler", "idempotent", "cdc", "python", "cypher"]
}
<!-- AGENT-METADATA:END -->
