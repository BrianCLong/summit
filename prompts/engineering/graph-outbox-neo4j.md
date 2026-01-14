# Graph Outbox to Neo4j Implementation Prompt

Implement the Postgres outbox pattern, Debezium routing, Neo4j sink configs, and
an automated bijection harness that verifies the relational-to-graph mapping.

Deliverables:
- SQL migration for outbox table and stable business IDs/versioning.
- Trigger definitions for users, organizations, projects, and project members.
- Debezium outbox connector config.
- Neo4j sink configs for nodes and membership edges with delete handling.
- Graph bijection harness with fixtures and CI workflow.
- Update docs/roadmap/STATUS.json with execution note.

Constraints:
- Avoid PII in outbox payloads.
- Provide deterministic fixtures and emit artifacts.
- Use the same Cypher as Kafka Connect in the harness.
