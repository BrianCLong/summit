# Test Strategy
- Unit tests for connectors (golden inputs/outputs)
- Contract tests for GraphQL schema (GraphQL‑Tester)
- Cypher query tests with ephemeral Neo4j
- E2E notebook: ingest → query → runbook → UI screenshot
- Non‑func: load tests (k6), chaos (pod kill) in staging