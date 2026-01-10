# GraphQL Throughput Benchmarks (Neo4j + Postgres)

This harness exercises the GraphQL API paths that hit both data stores:

- **Neo4j-backed graph analytics** via `graphPageRank` and `graphCommunities`.
- **Postgres-backed aggregates** via `summaryStats` and `caseCounts`.

It uses k6 arrival-rate executors to stress concurrency, record p95 latency, and verify the gateway scales without dropping requests.

## Prerequisites

- API running locally at `http://localhost:4000/graphql` (override with `GRAPHQL_URL`).
- Neo4j, Postgres, and Redis online with seed data for tenants (set `TENANT_ID` if not `demo`).
- Optional auth token passed with `GRAPHQL_TOKEN`.

## Running the benchmark

```bash
cd server
k6 run perf/k6-graphql-throughput.js \
  -e GRAPHQL_URL="http://localhost:4000/graphql" \
  -e GRAPHQL_TOKEN="$TOKEN" \
  -e TENANT_ID="demo" \
  -e NEO4J_PEAK_RATE=40 -e PG_RATE=25
```

Key tunables:

- `NEO4J_START_RATE`, `NEO4J_PEAK_RATE`, `NEO4J_END_RATE`, `NEO4J_VUS`, `NEO4J_CONCURRENCY`, `NEO4J_FORCE_REFRESH` to shape the Neo4j workload.
- `NEO4J_QUERY` to force `pagerank`, `communities`, or `mixed` (default) mode.
- `PG_RATE`, `PG_DURATION`, `PG_VUS`, `PG_MAX_VUS` to drive Postgres-side GraphQL calls.
- `GRAPHQL_TOKEN` for authenticated endpoints and `TENANT_ID` to scope the Postgres queries.

## Expected outputs

- Custom metrics: `graphql_neo4j_latency_ms`, `graphql_postgres_latency_ms`, `graphql_neo4j_calls`, `graphql_postgres_calls`.
- Thresholds fail when p95 exceeds 2s for Neo4j or 750ms for Postgres-backed queries, or when error rate crosses 2%.
- The k6 summary shows per-scenario durations so you can compare how Postgres vs Neo4j throughput scales as arrival rates ramp.
