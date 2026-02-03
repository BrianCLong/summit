# GraphRAG Query Governance

Summit GraphRAG uses a phase-aware query governance model to ensure reliability, auditability, and determinism.

## Phases

### Discovery Phase
- **Goal**: High recall, exploratory traversal.
- **Constraints**: Bounded by execution budget (hops, candidates, timeout).
- **Output**: Candidate explanation IDs.

### Justification Phase
- **Goal**: Precise, minimal evidence retrieval.
- **Constraints**:
    - No `RETURN *`.
    - Mandatory `ORDER BY` when `LIMIT` is used.
    - Explicit `max_rows` budget.
    - Explicit `projection_allowlist`.
- **Output**: Proof-grade subgraphs.

## Query Registry

All Justification queries must be registered in the Query Registry. The registry enforces metadata requirements and is linted during CI.

### Lint Rules for Justification Queries
1. **Explicit Projections**: `RETURN *` is forbidden to prevent data over-fetching and ensure schema stability.
2. **Determinism**: Any query using `LIMIT` must include `ORDER BY` to ensure stable results across executions.
3. **Bounded Results**: `max_rows` must be defined to prevent resource exhaustion.
4. **Governed Projections**: `projection_allowlist` must define allowed fields for audit and security (PII) tracking.
