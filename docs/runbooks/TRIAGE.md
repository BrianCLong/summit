# Sprint 24 Triage Runbook

## Alerts

### HighBurnRate (Error Budget)
**Trigger**: Error rate > 10% for 5m.
**Action**:
1. Check `Sprint 24 SLOs` dashboard in Grafana.
2. If `graphql_error_rate` is high:
   - Check logs for "OPA Policy Denied" -> Authorization issue (maybe Policy definitions need update).
   - Check logs for "Backpressure" -> Capacity issue (scale up pods).
3. If Ingest is failing:
   - Check `ingest_s3_bytes_total` (is it zero? Check `ingest-dropzone` mount).
   - Check `ingest_http_requests_total` with `status=unauthorized` (Client Certs missing?).

### LatencyBreach
**Trigger**: p95 > 350ms for 5m.
**Action**:
1. Check DB metrics (Neo4j/PG) for slow queries.
2. Check Redis Latency.
3. If Persisted Queries are missing, clients might be sending full strings causing parse overhead (check `persisted_query_misses` metric).

### IngestLag
**Trigger**: Ingest Queue > 1000 items.
**Action**:
1. Check `active_ingest_workers`.
2. Increase replicas for `ingest-worker`.
