# Data Plane Runbook

## Topology
- Postgres via pgBouncer (`pgbouncer.svc`) transaction pooling.
- Neo4j routed via `neo4j+s://` with bookmarks enabled.
- Redis with TLS and auto-pipelining.
- Typesense HTTP with 5s timeout and retries.

## Hot paths
- `pg:hot_path` (case reads), `neo4j:pattern_match`, `redis:get/set`, `typesense:search`.

## Circuit breaker states
- Metric: `db_cb_state{service,store}` (0 closed, 1 open, 2 half-open).
- Auto-recovers after configured recovery window; manual reset by restarting service process if stuck.

## Concurrency & bulkheads
- Semaphores sized per `configs/data-plane/defaults.yaml` (hot path, pattern match, cache, search).

## Timeouts & retries
- Postgres statement 15s, lock 5s; retries only on serialization/deadlock/read-only.
- Neo4j transaction retry window 10s.
- Redis command timeout 2s; max retries per request 2.
- Typesense HTTP timeout 5s; 2 retries with jittered backoff.

## Operational checks
- Pool saturation: monitor `db_pool_wait_seconds` and `db_conns_in_use`.
- Latency SLOs: Postgres p95 <150ms, Neo4j <300ms, Redis <20ms.
- Evictions: `redis_evictions_total` should not increase steadily.

## Remediation
- If circuits open, reduce traffic via gateway rate limits and validate upstream latency.
- For Postgres bloat, schedule `VACUUM (ANALYZE)` and verify autovacuum logs.
- For Neo4j page faults, increase page cache or reduce batch sizes; trigger checkpoint.
- Redis storm: enforce key TTLs and verify `maxmemory` policy.

## Backups/DR
- Ensure backup orchestrator captures indexes and RLS; run smoke queries after restore.
- Maintain pre-prod restore task for destructive testing.

## On-call quick steps
1. Check Grafana dashboards under `observability/grafana/dashboards/*`.
2. Inspect slow query lints from CI for offending queries.
3. Trigger k6 smoke (`k6 run k6/data-plane-smoke.js`) against stage.
4. Capture reason-for-access before direct DB access; use TLS endpoints only.
