# Neo4j 2025.x Upgrade & Migration Path

This document outlines the critical shifts in the Neo4j platform (2025.01 and later) that affect the Summit/IntelGraph infrastructure and application code.

## 1. Native Vector Data Type (Cypher 25)

Neo4j now includes a first-class `VECTOR` type, moving away from ad-hoc list properties for embeddings.

### Key Changes:
- **Storage**: Vectors are stored with explicit dtype (e.g., `FLOAT32`, `INT32`) and fixed length.
- **Constraints**: You can now enforce vector type and dimension at the database level.
  ```cypher
  CREATE CONSTRAINT vector_integrity IF NOT EXISTS
  FOR (n:Chunk)
  REQUIRE n.embedding IS :: VECTOR<FLOAT32>(1536);
  ```
- **Cypher 25 Functions**: New similarity functions are available under the `vector` namespace.
  - `vector.similarity.cosine(v1, v2)`
  - `vector.similarity.euclidean(v1, v2)`

### Migration Recommendation:
- Move from `db.index.vector.queryNodes` (deprecated in Cypher 25) to native Cypher vector search for exact pre-filtering.
- Convert existing list properties to `VECTOR` type:
  ```cypher
  MATCH (n) WHERE n.embedding IS NOT NULL
  SET n.embedding = vector(n.embedding, 1536, FLOAT32);
  ```

## 2. Infrastructure & Clustering Shifts

### Discovery Service v2
- **Discovery v1 is completely removed** in 2025.01.
- You must migrate to Discovery v2 before upgrading.
- **Port Change**: Port `5000` (default for discovery v1) is no longer used. Port `6000` is now used for internal cluster traffic.

### Configuration Renames:
- `dbms.cluster.discovery.v2.endpoints` -> `dbms.cluster.endpoints`
- `dbms.kubernetes.discovery.v2.service_port_name` -> `dbms.kubernetes.discovery.service_port_name`

### Java 21 Requirement
- Neo4j 2025.01 and later **require Java 21**. Java 17 is no longer supported for self-managed deployments.

## 3. Drivers
- **Neo4j Driver v6.0+** is required for native vector support.
- Ensure all services (Node.js, Python, etc.) are updated to the 6.x series.

## 4. Logging
- The default `debug.log` format has changed from Text to **JSON**.

---

## Summit Action Plan

1. [ ] Update all `docker-compose` and K8s manifests to Neo4j 2025.01.
2. [ ] Update Helm charts to use port 6000 for discovery.
3. [ ] Apply `VECTOR` type constraints to all embedding properties.
4. [ ] Refactor RAG retrieval logic to use Cypher 25 `vector.similarity` functions.
