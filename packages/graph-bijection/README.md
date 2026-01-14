# Graph Bijection Harness

This package verifies Postgres outbox events map bijectively to Neo4j nodes and
relationships.

## Usage

```
BIJECT_APPLY_EVENTS=true \
DATABASE_URL=postgres://... \
NEO4J_URI=neo4j://localhost:7687 \
NEO4J_USER=neo4j \
NEO4J_PASSWORD=neo4j \
pnpm graph:test:biject
```

Reports are written to `artifacts/graph-bijection/<sha>/report.json`.
