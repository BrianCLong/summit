# Neo4j Performance Playbook

## Profile top user journeys

- Run `PROFILE` and `EXPLAIN` for the three hottest user journeys to capture plan stability and execution costs:
  - **Entity expansion**: `PROFILE MATCH (seed:Entity {id: $seedId, tenantId: $tenantId})-[:RELATIONSHIP*1..3]->(neighbor) RETURN DISTINCT neighbor LIMIT 200`.
  - **Shortest path**: `PROFILE MATCH (a:Entity {id: $fromId, tenantId: $tenantId}), (b:Entity {id: $toId, tenantId: $tenantId}) CALL apoc.algo.dijkstra(a, b, 'RELATIONSHIP>', 'cost') YIELD path RETURN path LIMIT 1`.
  - **Community search**: `PROFILE CALL gds.louvain.stream('communityGraph', { seedProperty: 'tenantId', concurrency: 4 }) YIELD nodeId, communityId RETURN gds.util.asNode(nodeId) AS node, communityId LIMIT 200`.
- Capture execution stats (db hits, rows, rows per operator) and store snapshots after every release candidate; diff against the previous release to detect regressions.
- An automated harness (`server/src/db/optimization/analysis.ts`) now captures PROFILE and EXPLAIN plans for the above journeys and writes `analysis-report.json`, including label-cardinality tips for reducing overloaded `:Entity` labels.
- Keep `EXPLAIN` plans for pull requests to validate that planner heuristics (index usage, join ordering) remain stable when new labels or properties are introduced.

## Indexing strategy

- Create composite indexes for high-cardinality filters to constrain cardinality early in the plan:
  - `CREATE INDEX entity_tenant_type_status_idx IF NOT EXISTS FOR (e:Entity) ON (e.tenantId, e.type, e.status);`
  - `CREATE INDEX rel_tenant_type_since_idx IF NOT EXISTS FOR ()-[r:RELATIONSHIP]->() ON (r.tenantId, r.type, r.since);`
  - `CREATE INDEX investigation_tenant_created_idx IF NOT EXISTS FOR (i:Investigation) ON (i.tenantId, i.createdAt);`
- Add relationship property indexes to speed up traversal pruning on direction-specific queries:
  - `CREATE INDEX rel_directional_weight_idx IF NOT EXISTS FOR ()-[r:RELATIONSHIP]->() ON (r.weight);`
  - `CREATE INDEX rel_confidence_idx IF NOT EXISTS FOR ()-[r:RELATIONSHIP]->() ON (r.confidence);`
- Review label design for cardinality reduction: split overloaded `:Entity` nodes into narrower labels (e.g., `:Person`, `:Org`, `:Document`) when selectivity or property availability diverges.
- Validate index usage by running the profiled user journeys and confirming `Using Index` steps appear at the leaf operators; add to the regression harness.

## Traversal refactors and depth caps

- Replace ad-hoc variable-length traversals with APOC path procedures when they provide better pruning:
  - Prefer `apoc.path.expandConfig` with `terminatorNodes`, `whitelist`/`blacklist` relationship filters, and `bfs:true` to bound search space.
  - Use `apoc.neighbor.tohop` for bounded 1..N hops on entity expansion pages where pagination is required.
- Apply depth and cost caps to avoid runaway traversals:
  - Default to `maxLevel: 4` for discovery views; drop to `maxLevel: 2` on interactive dashboards unless user overrides.
  - Shortest-path calls should cap weight at 2x the median `cost` edge weight and abort after 1,000 explored paths.
  - Add a circuit-breaker flag `cypher.runtimeTimeoutMs` per session (e.g., 1_500 ms) for UI-sourced queries.

## Cache warmers for dashboards

- Pre-warm the query cache for top dashboards every deployment:
  - Entity expansion widgets: warm `seedId` by the top 20 recently active entities per tenant.
  - Influence/shortest-path panel: warm `fromId`/`toId` pairs using last 24h investigation pairs.
  - Community overview: warm `gds.louvain.stream` on the pre-projected `communityGraph` and cache the top 50 communities.
- Run warmers via a scheduled job (cron or deployment hook) with `maxConnectionPoolSize` reserved to avoid contention with live traffic.
- Record warmer latency and hit/miss ratios; alerts fire if cache hit rate falls below 85% or p95 latency exceeds thresholds below.

## Observability and SLOs

- Track per-query p95/p99 latency and cardinality using dashboards tagged by user journey (`entity-expansion`, `shortest-path`, `community-search`).
- Graphika targets (dashboards): p95 ≤ 400 ms, p99 ≤ 750 ms for interactive reads; background analytics can tolerate up to p95 1.5 s.
- Emit counters for `dbHits`, `rows`, and timeout aborts; attach trace attributes for `indexUsed` and `apocProcedure` name.
- Compare current p95/p99 versus Graphika targets weekly; open action items when two consecutive samples exceed the target or when cache hit rate < 85%.
- Add profiling artifacts (plans + stats) to the optimization log and link to Grafana panels so regressions are triaged with evidence.
