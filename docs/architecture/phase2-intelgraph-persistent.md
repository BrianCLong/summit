
## Phase 2: Persistent IntelGraph

### Storage
-   **Postgres Backend**: Primary persistent store using `jsonb` for flexible properties.
-   **Tables**: `intelgraph_nodes`, `intelgraph_edges`.
-   **Isolation**: Strict `tenant_id` enforcement on all queries.

### API
-   Restricted access to raw graph operations.
-   Task-centric views (subgraphs).
-   Governance checks integrated into data access layer.
