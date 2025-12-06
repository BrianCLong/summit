# GraphQL API Optimization Guide

## Overview

This guide details the optimizations implemented to improve the performance, reliability, and security of the IntelGraph GraphQL API.

## 1. N+1 Query Resolution via DataLoader

We have implemented `DataLoader` to batch and cache database requests, eliminating the "N+1 query problem" where fetching a list of items results in N additional queries for child fields.

### Pattern
Instead of resolving fields directly against the database:

```typescript
// BAD: Causes N+1 queries
comments: async (parent) => {
  return db.query('SELECT * FROM comments WHERE ticket_id = ?', [parent.id]);
}
```

Use the registered DataLoader:

```typescript
// GOOD: Batches queries into one call
comments: async (parent, args, context) => {
  return context.loaders.supportTicketLoader.load(parent.id);
}
```

### Implementations
- **SupportTicket Comments**: Uses `supportTicketLoader.ts` to batch fetch comments by Ticket ID.
- **Entities**: Uses `entityLoader.ts` (existing) to batch fetch Neo4j nodes.

## 2. Caching Strategy

We use a multi-layer caching strategy:

1.  **Request-Level Cache (DataLoader)**: Dedupes repeated requests for the same item within a single GraphQL request.
2.  **Persistent Cache (Redis)**: We have added a "Read-Through" caching layer to `supportTicketLoader`.
    -   **Read**: Checks Redis first. If hit, returns cached JSON.
    -   **Miss**: Calls underlying batch function (Postgres), then writes result to Redis (TTL 60s).

### Configuration
Redis client is sourced from `src/config/database.ts`. Ensure Redis is running and `REDIS_URL` is set.

## 3. Query Complexity Analysis

We use `graphql-query-complexity` to protect the server from expensive queries (DoS protection).

-   **Plugin**: `server/src/graphql/plugins/queryComplexityPlugin.ts`
-   **Limits**:
    -   Default: 1000 points
    -   Authenticated users may have higher limits (based on role).
-   **Rate Limiting**: Integrated with `RateLimiter` service to enforce cost-based rate limits over time (e.g., max 50,000 complexity points per minute).

### Estimators
We provide `FIELD_COMPLEXITY_ESTIMATORS` for use with the `@complexity` directive in schemas:
-   `list`: Cost = limit
-   `search`: Cost = limit * 2
-   `graph`: Cost = limit ^ depth

## 4. Monitoring & Metrics

We have added a `resolverMetricsPlugin` to track:
-   `graphql_resolver_calls_total`: Count of calls per resolver.
-   `graphql_resolver_duration_seconds`: Execution time histogram.
-   `graphql_resolver_errors_total`: Error counts.

These metrics are exposed via Prometheus at `/metrics`.

## 5. Best Practices for Developers

1.  **Always use DataLoaders** for relation fields (child objects).
2.  **Add @complexity directives** to expensive schema fields.
3.  **Check Context**: Always access `context.user` and `context.tenant` for security.
4.  **Error Handling**: Use `GraphQLError` with proper error codes.
