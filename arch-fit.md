# Architecture Fit: Narrative Intelligence v1

## Integration Points

### 1. Ingestion
- **Existing**: `ingest/` (Python) handles raw data ingestion.
- **Integration**: Narrative Intelligence will subscribe to enriched content streams or consume directly from the Data Pool.
- **Insertion Point**: Post-enrichment.

### 2. Enrichment
- **Existing**: `services/enrichment-service` (Node).
- **Integration**: Narrative Intelligence acts as a specialized enrichment layer.
- **Flow**: `Enrichment Service` -> `Narrative Intel Service` -> `Graph DB`.

### 3. Storage Primitives
- **Document Store**: Postgres (via `services/postgres-pitr` or `cases/` schema).
- **Vector Index**: `summit/retrieval` (likely utilizing a vector store).
- **Property Graph**: Neo4j (via `services/graph-db-service`).
- **Narrative Intel Requirements**:
    - **Narrative Skeletons**: Stored in Postgres (JSONB) or Document Store.
    - **Graph Edges**: Stored in Neo4j (`:NARRATIVE_INSTANCE`, `:FRAME_ELEMENT` relationships).
    - **Embeddings**: Stored in Vector Index for structure similarity.

## Service Architecture
`services/narrative-intel` will be a Python service leveraging `summit` shared libraries (`summit.io`, `summit.graph`).

## Latency & Throughput
- **Mode**: Async / Background processing.
- **SLA**: P95 < 500ms for skeleton extraction (CPU intensive).
