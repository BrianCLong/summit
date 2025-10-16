# ADR-020: Persisted Queries & Service Worker Caching

**Status:** Proposed

## Context

To improve performance and enable offline capabilities, we need a robust caching strategy for our GraphQL API calls.

## Decision

We will implement a multi-layered caching strategy:

1.  **Apollo Persisted Queries**: We will use `@apollo/client/link/persisted-queries` to reduce network payload size by sending query hashes instead of the full query text.

2.  **HTTP `ETag` Caching**: The server will generate `ETag` headers for cacheable responses. The client will use a custom Apollo Link to include `If-None-Match` headers, allowing the server to respond with a `304 Not Modified` for unchanged data.

3.  **Service Worker (SW) Caching**: We will use Workbox to implement a `StaleWhileRevalidate` strategy for key GraphQL queries (summaries, runs, SLOs, incidents). This will provide instant-on experiences for repeat visits and basic offline support.

## Consequences

- **Pros**: Significant performance improvement, reduced network traffic, resilience to spotty network conditions.
- **Cons**: Increased complexity in the client-side caching logic; requires careful cache invalidation considerations for mutated data.
