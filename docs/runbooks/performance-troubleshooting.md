### Goal

Diagnose and resolve **graph query latency** and **ingest backlog** within **30 minutes**.

### Signals

- p95 GraphQL latency > 1.5s (5m)
- Neo4j page cache misses rising
- Postgres CPU > 80% sustained
- Redis hit ratio < 0.9

### Steps

1. **Scope**: Identify tenant/case; confirm **dataset size** and **query shape**.
2. **Golden Signals**: Check latency, traffic, errors, saturation in Grafana.
3. **Query Costing**: Enable GraphQL **cost hints** & log deepest resolvers.
4. **Neo4j**: Inspect `db.stats` & profile Cypher; add indexes on frequently filtered properties; consider `LOWER()` precomputed fields for case-insensitive search.
5. **Postgres**: `EXPLAIN (ANALYZE, BUFFERS)` on slow queries; ensure parameterized SQL; add partial indexes; bump `work_mem` for heavy sorts.
6. **Caching**: Add Redis layer for hot subgraphs & RAG snippets; set TTL 5–15m; invalidate on writes.
7. **Backpressure**: Throttle expansions on link‑analysis canvas; cap path length; stream partials.
8. **Scale**: HPA to 3→6; raise DB IOPS; evaluate read replicas.
9. **Verify**: Re‑run queries; p95 < 1.5s; error rate < 0.5%.
