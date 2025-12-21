# Gateway performance and resiliency playbook

## Profiling API and simulation hot paths
- Trigger CPU flamegraphs in safe environments via `POST /internal/profile` with optional `{"durationMs":15000,"label":"load-test"}`.
- Captures are written to `tmp/gateway-profiles` (configurable via `profileOutputDir`) and returned with a top-offenders summary for immediate triage.
- Import the `.cpuprofile` artifact into Chrome DevTools or Speedscope to drill into slow GraphQL resolvers, orchestration loops, and simulation tasks.

## Caching: knowledge graph and AI outputs
- Knowledge-graph loaders now use an instrumented cache (defaults to in-memory TTL, pluggable with Redis/CDN by passing a `cacheClient` implementing `get`/`setEx`).
- AI memoization hits/misses are metered under the `ai-memo` cache scope to surface savings from zero-spend reuse.
- Prometheus metrics:
  - `gateway_cache_operations_total{cache="knowledge-graph"|"ai-memo",operation="get|set",result="hit|miss|error|ok"}`
  - `gateway_cache_latency_ms{cache="..."}`
- Recommended Redis sizing: 2–4 GB memory, 10k ops/sec baseline, eviction policy `allkeys-lru`, TTL 5–10 minutes for AI completions; enable CDN edge caching for persisted GraphQL hashes and static knowledge-graph nodes where allowed.

## Database query optimization
- Add covering indexes for OSINT/event tables to keep scans bounded:
  - `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_osint_events_seen_at ON osint_events (observed_at DESC);`
  - `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_osint_events_source_type ON osint_events (source_id, indicator_type, observed_at DESC);`
  - `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entities_kind_updated ON entities (kind, updated_at DESC);`
- Favor keyset pagination (`WHERE observed_at < $cursor ORDER BY observed_at DESC LIMIT 200`) to avoid large offset scans during bulk enrichments.

## Load testing and scale-out
- `packages/gateway/load/k6-plan.js` now targets multimodal extraction with ramping arrival-rate (to 120 rps) and p95 < 900 ms guardrails.
- Run `k6 run packages/gateway/load/k6-plan.js` against staging; export results to Prometheus/Influx for regression tracking.
- Scale-out starter settings for the Gateway/API tier:
  - Requests: 500m CPU / 1.5Gi mem; Limits: 2 CPU / 4Gi mem.
  - HPA: min 3 pods, max 12; scale on `cpu > 65%` OR `gateway_graphql_latency{route="graphql"} p95 > 750ms` for 5m.

## GraphQL batching and persisted queries
- Knowledge-graph resolvers are batched via the SimpleDataLoader; cache metrics make batching benefits observable.
- Persisted query candidates: hash GraphQL documents at build time, store hash→query in Redis/CDN, and serve clients with `extensions.persistedQuery.sha256Hash`; reuse the `knowledge-graph` cache metrics to validate hit rates.
- Measure improvements by comparing `gateway_graphql_latency` and cache hit/miss series before/after enabling persisted query lookup.
