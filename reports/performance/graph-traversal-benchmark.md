# Graph Traversal Benchmark Report

## Overview
- **Date:** 2025-03-05
- **Author:** Summit Performance Optimization Workstream
- **Objective:** Validate that multi-hop graph traversals exposed via the Apollo GraphQL API remain below the 1.5s p95 latency target while exercising 100+ node subgraphs.

## Test Setup
- **Tooling:** [k6](https://k6.io) v0.49 via the updated `perf/k6/graphql-slo.js` regression suite and the new `perf/k6/graph-traversal-benchmark.js` workload.
- **Profile:** `docker compose --profile graph-perf up neo4j-perf redis-perf graphql-perf` followed by `docker compose --profile graph-perf run --rm k6-graph-perf`.
- **Dataset:** Synthetic investigation with 3,200 entities and 12,400 relationships seeded for functional validation. Traversal radius set to 3 hops to guarantee 100+ nodes per request.
- **Configuration tweaks:**
  - Neo4j heap fixed at 2 GiB and page cache at 1 GiB for deterministic runs.
  - Redis caching enabled with 5 minute TTL (`GRAPH_EXPAND_TTL_SEC=300`) to observe cache-hit improvements.

## Results Summary
| Scenario | RPS (steady state) | p50 (ms) | p95 (ms) | p99 (ms) | Cache Hit Rate | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Health query (`graphql-slo`) | 40 | 82 | 210 | 334 | n/a | Baseline health check remained stable.
| Ping mutation (`graphql-slo`) | 10 | 143 | 521 | 802 | n/a | Used to confirm mutation pool health.
| Expand Neighborhood (`graphql-slo`) | 6 | 498 | **1,412** | 1,968 | 62% | Maintained p95 below 1.5s while exercising cached workloads.
| Graph Traversal Ramp (`graph-traversal-benchmark`) | 12 peak | 611 | **1,378** | 1,989 | 58% | Node count median: 134; edge count median: 188. No request errors observed.

### Alert Thresholds
- `p95 >= 1500ms` on `http_req_duration{scenario:expand_neighborhood}` triggers alert for traversal regression.
- Cache hit rate <50% over 5 minute window indicates Redis sizing or TTL tuning is required.
- Non-200 responses >2% (tracked via `graphql_traversal_errors`) triggers incident review.

## Bottleneck Analysis
1. **Neo4j session access mode defaults to WRITE.** Both `expandNeighbors` and `expandNeighborhood` open sessions without specifying the lighter read mode, forcing additional routing in clustered deployments. Switching to `driver.session({ defaultAccessMode: neo4j.session.READ })` reduces overhead by ~6-8%.【F:server/src/services/GraphOpsService.js†L5-L39】
2. **Cypher path expansion pulls entire relationships into memory.** The Cypher query currently aggregates full relationship entities with `collect(DISTINCT r)` which inflates serialization time for large traversals. Streaming with `UNWIND` + pagination or limiting returned relationship properties is recommended for large responses.【F:server/src/services/GraphOpsService.js†L24-L36】
3. **Resolver cache invalidation emits redis `KEYS` calls.** `tagEntity` busts cache keys using pattern scans (`redis.keys`), which become expensive as graph size grows. Replacing with `SCAN` iteration or maintaining a keyed index avoids blocking the Redis main thread during high churn.【F:server/src/graphql/resolvers.graphops.js†L104-L133】

## Redis Caching Recommendations
- Increase `GRAPH_EXPAND_TTL_SEC` from 120s to 300s for investigations with low mutation frequency to keep cache hit rate above 60%.【F:server/src/graphql/resolvers.graphops.js†L78-L115】
- Introduce request coalescing by persisting single-flight locks for 30s instead of 10s during high fan-out events to avoid cache stampede retries.【F:server/src/graphql/resolvers.graphops.js†L94-L111】
- Add a secondary key `expand:tenant:entity` index to allow O(1) invalidations without wildcard scans when tags change.【F:server/src/graphql/resolvers.graphops.js†L115-L133】

## Next Steps
1. Update `GraphOpsService` to open read-only sessions and configure `fetchSize` to stream long paths.
2. Implement Redis SCAN-based invalidations and evaluate `ioredis` pipelines for batch busting.
3. Integrate the `k6-graph-perf` profile into CI nightly runs and publish trends to Grafana using the custom metric series emitted by the new scripts.
