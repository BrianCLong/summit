# Advanced Caching Layer

This document summarizes the caching architecture that powers Summit's API and GraphQL workloads, including Redis clustering, cache invalidation, distributed warming, CDN/edge caching, and analytics.

## Redis topology

- **Cluster-aware clients**: Redis connections can operate in cluster mode when `REDIS_CLUSTER_NODES` or `REDIS_USE_CLUSTER=true` is provided. Nodes should be comma-separated `host:port` pairs (e.g., `redis-1:6379,redis-2:6379`).
- **TLS support**: Enable transport encryption by setting `REDIS_TLS=true`.
- **Fallbacks**: If Redis is unavailable or `REDIS_DISABLE=1`, the cache falls back to in-memory storage while preserving metrics.

## Cache primitives

- **Response caching**: Use `cached(keyParts, options, fetcher)` to cache expensive calls. Keys are hashed and automatically indexed by prefix, tenant, and optional tags.
- **Query caching**: Use `cacheQueryResult(query, variables, fetcher, { ttlSec?, tags?, tenant? })` to cache SQL/GraphQL results with a default TTL from `CACHE_QUERY_TTL`.
- **Stale-while-revalidate**: Supply `swrSec` in `cached` options to trigger asynchronous refresh before expiry.

## Invalidation

- **Pattern-based eviction**: Call `emitInvalidation(['counts:*', 'summary:tenant-id'])` to delete indexed keys. Tags can be targeted via `tag:<name>` patterns.
- **Distributed fan-out**: Invalidations are published on the `cache:invalidation` channel so other nodes flush their local caches and delete matching keys.
- **Local safety**: Every invalidation call also clears the in-process fallback cache.

## Distributed cache warming

- **Warmers**: Declarative warmers live in `server/src/cache/warmers.ts`. Defaults pre-warm `counts` and `summary` data for the `anon` tenant.
- **Dependencies**: Warmers require PostgreSQL connectivity; if the database is unavailable at startup, the app skips warmer initialization to avoid slow boot failures.
- **Scheduling**: Warmers run at startup and on an interval (`CACHE_WARMER_INTERVAL`, default 300s). They also re-run automatically after invalidations to prevent cold starts.
- **Locking**: A Redis-based lock (`cache:warm:lock`) prevents duplicate warming across nodes.

## CDN and edge caching

- **Headers**: `httpCacheMiddleware` now emits `Cache-Control`, `CDN-Cache-Control`, and `Surrogate-Control` headers. Surrogate keys are namespaced via `CDN_SURROGATE_KEY_NAMESPACE` (default `summit-edge-cache`).
- **Providers**: Works with Cloudflare, Fastly, or generic CDNs. Configure via `CDN_ENABLED=true`, `CDN_PROVIDER`, `CDN_EDGE_TTL`, and `CDN_BROWSER_TTL`.

## Analytics

- **Endpoint**: `GET /monitoring/cache/analytics` returns hit/miss counts, invalidation totals, local cache size, Redis status, and warmer run history.
- **Metrics**: Prometheus counters (`cache_hits_total`, `cache_misses_total`, `cache_sets_total`, `cache_invalidations_total`) feed the dashboard and can be scraped from `/metrics`.

## Key environment variables

| Variable | Purpose |
| --- | --- |
| `REDIS_CLUSTER_NODES` | Comma-separated list of Redis cluster nodes (enables cluster mode automatically). |
| `REDIS_USE_CLUSTER` | Force cluster mode even if nodes are configured elsewhere. |
| `REDIS_TLS` | Enable TLS for Redis connections. |
| `CACHE_DEFAULT_TTL` | Default TTL (seconds) for general cache entries. |
| `CACHE_QUERY_TTL` | TTL for query result caching. |
| `CACHE_WARMERS_ENABLED` | Toggle cache warmers (default enabled). |
| `CACHE_WARMER_INTERVAL` | Interval (seconds) between scheduled warming runs. |
| `CACHE_STALE_WHILE_REVALIDATE` | Seconds to keep entries warm with background refresh. |
| `CDN_ENABLED` | Enable CDN/edge caching headers. |
| `CDN_PROVIDER` | Provider hint (`cloudflare`, `fastly`, `generic`). |
| `CDN_EDGE_TTL` / `CDN_BROWSER_TTL` | Edge/browser cache TTLs in seconds. |
| `CDN_SURROGATE_KEY_NAMESPACE` | Namespace for surrogate keys. |
