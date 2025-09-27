# GraphQL Performance Hardening

This release adds guard rails and caching layers to improve resolver performance and reduce load on the graph store.

## Limits
- **Max depth**: `GRAPHQL_MAX_DEPTH` (default `8`)
- **Max cost**: `GRAPHQL_MAX_COMPLEXITY` (default `1000`)
- Requests exceeding limits return `400` and are logged safely.

## DataLoader
Resolvers use per-request DataLoader instances to batch entity lookups and avoid N+1 patterns during multi-hop queries.

## Caching
Read-only queries are cached in Redis using keys derived from request arguments and the requesting user. TTL is configured with `ENTITY_CACHE_TTL_SEC` (default `60`).

## Persisted Queries
Unknown queries are rejected in production unless `ALLOW_NON_PERSISTED_QUERIES=true`.

## Metrics
Resolvers log `duration_ms`, `items_returned`, `hops`, and `cache_hit` for structured analysis.
