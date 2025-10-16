# ADR 0001: Choose Neo4j for Primary Graph Storage

- **Context:** Need mature, high‑performance OLTP graph with Cypher and ecosystem.
- **Decision:** Use Neo4j 5.x; evaluate Fabric/read replicas for scale.
- **Consequences:** Tight coupling to Cypher; GraphQL gateway abstracts downstream clients.
