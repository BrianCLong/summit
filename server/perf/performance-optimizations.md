# Summit Performance Optimization Suite

This playbook documents the backend performance controls added in this iteration and how to verify them locally.

## Highlights
- **Redis response cache** for evidence search results with cache-warming via BullMQ.
- **API compression** enabled globally with an opt-out header for binary payloads.
- **Database index bootstrapping** for PostgreSQL and Neo4j search-heavy fields.
- **Background cache warmers** that hydrate popular evidence queries asynchronously.
- **Repeatable benchmarks** using `npm run benchmark:queries` and k6 scripts in `server/perf/`.

## Backend optimizations
- **Response caching:** `GET /search/evidence` uses Redis with tenant-aware cache keys and TTLs. Results are stamped with `X-Cache-Status` to make hit/miss ratios observable.
- **Compression:** Responses larger than `API_COMPRESSION_MIN_BYTES` (default 1 KB) are compressed. Clients can disable with `X-No-Compress: true` for streaming/binary flows.
- **Index strategy:**
  - PostgreSQL: `entities` GIN index on labels and a compound `(tenant_id, kind, created_at DESC)` index to accelerate timeline and filtered lookups; `relationships` triple-key index for traversal joins.
  - Neo4j: idempotent creation of `evidenceContentSearch` full-text index and a `tenantId` b-tree index to keep search filters selective.
- **Cache warmup jobs:** BullMQ queue `performance-cache-warmup` preloads larger result sets for frequent evidence queries without slowing down the request path.

## Benchmarking
1. Ensure databases and Redis are running and `.env` is configured.
2. Build the API and run the query benchmark harness:
   ```bash
   cd server
   npm install
   npm run build
   npm run benchmark:queries
   ```
   The harness records p50/p95/p99 latency for hot and cold paths; use it before/after changes to quantify impact.
3. Load testing: the existing k6 scripts in `server/perf` (`k6-load-test.js`, `k6-graph-analytics.js`) can be pointed at your environment to validate throughput once caching and indexes are in place.
4. Observability: Prometheus metrics `query_optimizer_cache_hits_total`, `query_optimization_duration_seconds`, and `index_operations_total` expose hit rates and index actions; Grafana dashboards should show reduced latency after warm caches are populated.

## Operations notes
- Override cache TTL with `EVIDENCE_SEARCH_CACHE_TTL`, globally toggle caching with `CACHE_ENABLED=false`, and disable warmers with `ENABLE_CACHE_WARMER=false` if Redis is unavailable.
- When Redis is in mock/fallback mode the warmup queue intentionally does not start, preventing BullMQ from hanging on missing connections while still allowing the in-memory L1 cache to function.
- Cache warmers use a conservative concurrency (`CACHE_WARMER_CONCURRENCY`) and exponential backoff to avoid overload during incidents.
- Background workers and index creation are idempotent; they log warnings instead of failing the boot sequence when dependencies are unavailable.
