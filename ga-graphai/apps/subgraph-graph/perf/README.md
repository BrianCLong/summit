# Performance & Chaos Playbooks

This directory contains repeatable scripts for validating the subgraph SLOs, cache behavior,
and Neo4j failover resilience.

## Prerequisites

- [k6](https://k6.io/) v0.47 or later
- Running instances of the subgraph (`SUBGRAPH_URL`) and Neo4j dataset seeded from
  `../datasets/golden/triad.cypher`
- Optional Redis instance when validating cache hit ratios

## Latency Benchmarks

```bash
SUBGRAPH_URL=http://localhost:4003/graphql \
TEST_NODE_ID=incident-100 \
k6 run k6-neighborhood.js
```

The script surfaces:

- `http_req_duration` p95 (target ≤ 300 ms)
- `neighborhood_latency_ms` custom trend aggregated from `extensions.cost`
- `neighborhood_cache_hit_ratio` rate metric derived from cost metadata

Two-to-three hop path queries:

```bash
SUBGRAPH_URL=http://localhost:4003/graphql \
START_NODE_ID=incident-100 \
k6 run k6-paths.js
```

This scenario validates the p95 ≤ 1,200 ms SLO and emits
`path_latency_ms` / `path_cache_hit_ratio` (the latter expected ≈0 as these queries bypass the
cache).

## Report Generation

Both scripts output JSON summaries when executed with `k6 run --summary-export`. Feed the
result into `node ../scripts/analyze-cost-extension.mjs` to compute cache hit ratios and
latency percentiles directly from the captured `extensions.cost` payloads.

```bash
SUBGRAPH_URL=... k6 run --summary-export perf-neighborhood.json k6-neighborhood.js
node ../scripts/analyze-cost-extension.mjs perf-neighborhood.json
```

The analyzer prints p50/p95, retry counts, and cache hit rates for audit evidence.

## Chaos Test

See `CHAOS.md` for a focused failover exercise that introduces packet loss or forcibly
restarts the Neo4j leader. The retry/backoff behaviour is verified by the same analyzer,
which should report bounded retry counts and preserved error budgets.
