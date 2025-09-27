# Graph Subgraph Service

This Apollo Federation subgraph exposes canonical graph entities backed by Neo4j. It adds
low-latency 1-hop neighborhood queries with Redis caching and filtered 2–3 hop path search
that obeys the gateway service level objectives (SLOs).

## Features

- **Federated schema** for `Node`, `Relationship`, and `Path` types.
- **Neo4j-backed resolvers** with parameterized Cypher generated from validated inputs.
- **Cost hints** sourced from Neo4j `ResultSummary` objects and published on
  `extensions.cost`.
- **Redis caching** for hot 1-hop neighborhoods with configurable TTLs.
- **Exponential backoff retry** for Neo4j sessions to handle failover scenarios.
- **k6 performance test scripts** and a golden dataset for reproducible load tests.

## Getting Started

1. Install dependencies from the GraphAI workspace root:

   ```bash
   cd ga-graphai
   npm install
   ```

2. Provide environment variables (copy `.env.example`):

   ```bash
   cp apps/subgraph-graph/.env.example apps/subgraph-graph/.env
   ```

3. Run the service locally:

   ```bash
   cd apps/subgraph-graph
   npm run build && npm start
   ```

   The server listens on `http://localhost:4003/graphql` by default.

4. Start in watch mode for development:

   ```bash
   npm run dev
   ```

## Testing & Quality Gates

```bash
npm test                    # unit tests via Vitest
npm run build               # compile TypeScript output
```

Performance smoke:

```bash
k6 run perf/k6-neighborhood.js
k6 run perf/k6-paths.js
```

## Federation Notes

- The schema links to the Apollo Federation v2.5 spec and exports an entity key on `Node`.
- The gateway composes this subgraph by proxying requests through the `/graphql` endpoint
  and propagating cost extensions.
- `extensions.cost` carries per-operation timings, Neo4j statistics, and cache metadata
  for downstream aggregation.

## Observability & Cost Extensions

Each resolver pushes a cost record into the request context. An Apollo plugin attaches the
collection to the outgoing GraphQL response under `extensions.cost`. Consumers can derive
p95 latency and cache hit ratios from these records.

## Redis Caching

- Cache keys are deterministic (node id + direction + pagination window).
- TTL defaults to 45 seconds and is configurable through `NEIGHBORHOOD_CACHE_TTL_SECONDS`.
- Fail-open behaviour ensures graph reads do not error when Redis is unavailable.

## k6 Scenarios

`perf/k6-neighborhood.js` and `perf/k6-paths.js` exercise randomized 1-hop and filtered path
queries. Both scripts emit latency trends, percentile objectives, and cache hit ratios using
response extensions. See `perf/README.md` for usage and report collation.

## Golden Dataset

`datasets/golden/triad.cypher` can be ingested into Neo4j for local development or CI. It
contains a 12-node triad graph with relationships designed to trigger 2–3 hop traversal
patterns used by the k6 checks.

## Chaos & Failover Guidance

- The Neo4j driver wrapper retries idempotent read transactions with exponential backoff.
- Retries are limited to three attempts and tagged in cost extensions with `retryCount`.
- See `perf/CHAOS.md` for a targeted failover drill using `tc` fault injection or Neo4j
  replica demotion.
