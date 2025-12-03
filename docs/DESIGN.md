# Graph Consistency Validator Design

## Architecture

The Graph Consistency Validator is a bidirectional drift detection engine designed to ensure the integrity of the "IntelGraph" system, where Postgres serves as the authoritative System of Record and Neo4j acts as a derived analytical graph index.

### Core Components

1.  **`GraphConsistencyService`**: The singleton service responsible for the core logic.
    *   **Source of Truth**: Fetches all valid entities from Postgres (`entities` table).
    *   **Graph State**: Fetches all `Entity` nodes from Neo4j.
    *   **Drift Detection**: Compares the two datasets to identify:
        *   **Missing Nodes**: Exists in Postgres, missing in Neo4j.
        *   **Orphan Nodes**: Exists in Neo4j, missing in Postgres.
        *   **Property Mismatches**: Exists in both, but key properties (like `type`) differ.
    *   **Repair Engine**:
        *   **Safe Repair**: Creates missing Neo4j nodes and syncs properties using Postgres data.
        *   **Unsafe Repair**: Deletes orphan nodes from Neo4j (requires explicit opt-in).

2.  **`GraphConsistencyReporter`**: A driver for generating human-readable (Console) and machine-readable (JSON) reports. It integrates with CI pipelines.

3.  **Metrics**: Prometheus metrics (`graph_drift_count`, `graph_orphan_nodes_count`, etc.) are exposed for real-time observability.

## Detection Heuristics

*   **Identity Match**: Comparison is based on the UUID `id` field.
*   **Type Consistency**: The Postgres `type` column is compared against Neo4j Labels. If `pgEntity.type` is 'PERSON', the Neo4j node must have the `:Person` (or equivalent) label.
*   **Orphan Detection**: Any node in Neo4j with the label `:Entity` that does not have a corresponding row in the Postgres `entities` table is considered an orphan.

## Repair Logic

### Safe Repair (`--auto-repair`)
*   **Action**: `MERGE` node in Neo4j.
*   **Data**: Uses `id`, `type`, `created_at`, `updated_at`, and the `props` JSONB column from Postgres.
*   **Outcome**: The Graph is additive; no data is lost.

### Unsafe Repair (`--prune-orphans`)
*   **Action**: `DETACH DELETE` node in Neo4j.
*   **Target**: Nodes identified as orphans.
*   **Risk**: Destructive operation. Should only be run when confident that Postgres is fully up-to-date and no ephemeral graph-only data is required (which shouldn't exist per architecture).

## CI Integration

The `server/src/scripts/check-graph-drift.ts` script is designed to run in CI. It returns a non-zero exit code if drift is detected (and not repaired), blocking PRs that introduce inconsistency.
