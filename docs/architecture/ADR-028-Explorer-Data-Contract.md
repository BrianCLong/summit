# ADR-028: Graph Explorer Data Contracts

**Status:** Proposed

## Context

The Graph Explorer requires efficient data fetching for large, complex graphs. We must define contracts that support pagination, level-of-detail, and performance SLOs.

## Decision

1.  **Thin DTOs**: API responses will use thin Data Transfer Objects, containing only the data needed for rendering (ID, type, label, status), deferring heavy properties.
2.  **Server-Side Pagination**: All neighbor and path queries will be cursor-paginated to prevent overwhelming the client.
3.  **Hard Caps**: The backend will enforce hard limits on all graph queries (e.g., max 3 hops, max 200 nodes/edges per response) to protect the database.
4.  **Deterministic IDs**: All entities and relationships will have stable, deterministic IDs to aid client-side caching and state management.

## Consequences

- **Pros**: Predictable client-side performance, protection against abusive queries, stable UI state.
- **Cons**: Requires more complex state management on the client to stitch together paginated responses.
