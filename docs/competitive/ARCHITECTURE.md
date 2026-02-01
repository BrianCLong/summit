# Architecture Layout

## Repository Structure

### Services

*   `services/competitive_kg/`: Competitive Intelligence Knowledge Graph service.
    *   `ingest/`: Offline ingestion of snapshots.
    *   `extract/`: Claim extraction logic.
    *   `schema/`: Domain schemas.
    *   `render/`: Markdown/Battlecard rendering.
    *   `sources/`: Allowlist and configuration.
*   `services/federation_router/`: Router for federated graph queries.
    *   `policy/`: Policy enforcement logic.

### Packages

*   `packages/evidence/`: Evidence framework.
    *   `schemas/`: JSON schemas for report, metrics, stamp.
*   `packages/hybrid_planner/`: Query planner for hybrid retrieval.
    *   `operators/`: Logical operators for query planning.
    *   `planner.py`: Main planner entry point.

## Data Flow

1.  **Ingestion**: Snapshots -> `ingest` -> `extract` -> Evidence.
2.  **Retrieval**: Query -> `hybrid_planner` -> `federation_router` -> Data Sources.

## Determinism

*   All evidence generation must be deterministic.
*   Snapshots are hashed and allowlisted.
*   Timestamps in evidence stamps use fixed logical clocks or commit times for reproducibility where applicable, or recorded strictly.
