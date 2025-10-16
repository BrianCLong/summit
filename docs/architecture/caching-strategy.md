# GraphQL Caching Strategy

This document outlines the Redis-based caching strategy for the GraphQL gateway.

## 1. Objective

Reduce p95 latency for frequent, read-only queries and mitigate N+1 problems in resolvers.

## 2. Implementation

We will use the `response-cache` plugin for Apollo Server, backed by a Redis instance.

- **Cache Scope**: Caching will be enabled on a per-resolver basis using schema hints (`@cacheControl`). By default, caching is disabled.
- **Cache Key**: The cache key will be a hash of the GraphQL query and its variables.
- **TTL**: A default TTL of 60 seconds will be applied, which can be overridden with `@cacheControl(maxAge: ...)`.
- **Invalidation**: For simplicity in v1, we will rely on TTL-based expiration. Future versions may implement more sophisticated cache invalidation strategies based on mutations.

## 3. N+1 Mitigation

For resolvers prone to N+1 database calls, we will use `DataLoader`. The Redis cache will be used to cache the results of individual `DataLoader` lookups, further reducing database load.
