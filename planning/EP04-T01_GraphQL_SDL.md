# EP04-T01 GraphQL SDL & Gateway Strategy

## Strategy
We are using a **Federated GraphQL** approach (Apollo Federation).
*   **Gateway**: `services/api-gateway` aggregates subgraphs.
*   **Subgraphs**:
    *   `server` (Monolith/Core): Entities, Provenance, ER.
    *   `ingest`: Data ingestion status, connectors.
    *   `ai`: Inference, RAG, Embeddings.

## Core Schema Types (from `server/src/graphql/schema/canonical.graphql`)

### Entities
*   `CanonicalEntityType` enum defines the domain (PERSON, ORGANIZATION, etc.).
*   Entities support `PolicyLabels` for ABAC/RBAC.

### Provenance
*   `ProvenanceAssertion`: Implements the "Who, What, When, Why" of data lineage.
*   `ProvenanceChain`: Links assertions to source data.

### Entity Resolution (ER)
*   `ERMatchScore`, `ERDecision`, `ResolutionCluster` manage the deduplication lifecycle.

## SDL Location
*   Core definitions: `server/src/graphql/schema/canonical.graphql`
*   Domain extensions: `server/src/graphql/schemas/*.graphql`

## Directives
*   `@auth(requires: Role)`: Function-level authorization.
*   `@policy(check: String)`: OPA policy enforcement.
*   `@stream`: For streaming subscriptions (e.g., ingestion progress).
