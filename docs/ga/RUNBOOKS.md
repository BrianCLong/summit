# GA Operator Runbooks (Top 10 Incidents)

Each runbook is structured as **Symptoms → Quick checks → Fix → Verify → Rollback/Safety Net**.

## 1) API down / 502/503 from gateway

- **Symptoms**: Health probes fail; UI shows "service unavailable"; Grafana 5xx panel spikes.
- **Quick checks**: `kubectl get pods -n <ns>` for CrashLoop; `curl -f http://gateway:8080/health` (or port-forward); check ingress/controller logs.
- **Fix**: Roll restart the gateway deployment; ensure secrets mounted; redeploy Helm release if config drifted.
- **Verify**: `/health/ready` returns ready; synthetic smoke (`make smoke` or curl UI) succeeds.
- **Rollback**: `helm rollback summit <previous-release>` or `kubectl rollout undo deploy/gateway`.

## 2) GraphQL latency / p95>threshold

- **Symptoms**: Slow responses, elevated `graphql_operation_duration_seconds` in Prometheus.
- **Quick checks**: Inspect Redis/DB CPU; check query complexity logs; review recent deployments.
- **Fix**: Enable/strengthen caching; tighten GraphQL complexity/rate limits; scale gateway replicas; offload heavy queries to read replicas.
- **Verify**: p95 latency returns to baseline; Prometheus latency SLO green; `/health/detailed` still `ok`.
- **Rollback**: Revert config changes (Helm values/ConfigMap) or rollback deployment.

## 3) Neo4j unavailable

- **Symptoms**: `/health/detailed` reports `neo4j: unhealthy`; graph queries fail with connectivity errors.
- **Quick checks**: `kubectl logs statefulset/neo4j` (or docker compose logs); `cypher-shell -a <uri> -u <user> -p <pass>`.
- **Fix**: Restart Neo4j pod; if data corruption suspected, restore from latest dump using `scripts/restore/neo4j_restore.sh <path.dump>`.
- **Verify**: `/health/detailed` shows `neo4j: healthy`; sample Cypher query returns data.
- **Rollback**: Restore previous snapshot; scale app to zero during restore to avoid writes.

## 4) Postgres locked / migrations stuck

- **Symptoms**: Deployments hang on migrations; `/health/detailed` shows `postgres: unhealthy` or API errors `deadlock detected`.
- **Quick checks**: `psql -c "SELECT pid, query FROM pg_stat_activity WHERE wait_event IS NOT NULL;"`; check migration job logs.
- **Fix**: Cancel blocking sessions; rerun migrations; ensure `PG_*` pool sizes not exceeding DB max connections.
- **Verify**: Migrations finish; `/health/detailed` flips to `postgres: healthy`; application queries succeed.
- **Rollback**: Restore pre-migration backup via `scripts/db/restore.sh --datastores=postgres --backup-path=<dir>`; rollback Helm release.

## 5) Redis eviction / cache thrash

- **Symptoms**: Elevated latency; log warnings about Redis connection or key evictions; `/health/detailed` shows `redis: unhealthy`.
- **Quick checks**: `redis-cli INFO memory` for used memory/evictions; check pod logs for OOMKilled.
- **Fix**: Increase Redis memory/requests; set safer eviction policy; scale Redis or use managed HA Redis; clear toxic keys if needed.
- **Verify**: `/health/detailed` shows `redis: healthy`; latency drops; eviction metrics stabilize.
- **Rollback**: Revert Redis config/limits; restore from `redis.rdb` using `scripts/restore/redis_restore.sh`.

## 6) Queue backlog / delayed jobs

- **Symptoms**: Jobs stuck; dashboard shows growing queue length; user-facing async tasks lag.
- **Quick checks**: Inspect queue metrics in Grafana; check worker pod logs; ensure Redis/DB healthy.
- **Fix**: Scale worker deployments horizontally; increase worker concurrency if DB headroom exists; clear poisoned messages after triage.
- **Verify**: Queue depth trending down; job latency within SLO; no new errors in worker logs.
- **Rollback**: Scale workers back down; reapply previous ConfigMap; replay messages from DLQ if applicable.

## 7) Auth failures / login loops

- **Symptoms**: Users cannot log in; repeated redirects; 401/403 responses across the stack.
- **Quick checks**: Validate `OIDC_*` secrets and clock skew; confirm `ALLOWED_ORIGINS` includes the ingress host; check JWT signature errors in logs.
- **Fix**: Rotate/reload OIDC credentials; align redirect URIs; restart gateway to pick up secret updates.
- **Verify**: Successful login flow; `/health` remains `ok`; no auth errors in logs.
- **Rollback**: Revert to previous OIDC client/secret or Helm values; invalidate broken sessions.

## 8) Webhook failures / outbound integration errors

- **Symptoms**: Partner callbacks failing; webhook retry queues growing; 4xx/5xx from external systems.
- **Quick checks**: Inspect webhook delivery logs; confirm DNS/egress; check rate limits on partners.
- **Fix**: Retry with backoff; adjust timeout/retry settings; rotate credentials if 401; pause noisy tenants.
- **Verify**: Delivery success rate returns to baseline; queue drains; partner acknowledges recovery.
- **Rollback**: Disable problematic webhook subscription; revert config changes; restore previous credentials.

## 9) AI provider timeouts/cost spikes

- **Symptoms**: AI features error or timeout; provider dashboards show throttling/cost spikes.
- **Quick checks**: Check feature flag `AI_ENABLED`; monitor provider status page; inspect rate-limit headers.
- **Fix**: Reduce concurrency; enable caching of AI responses; fall back to smaller models; cap requests via `AI_RATE_LIMIT_MAX_REQUESTS`.
- **Verify**: Success rate improves; spend back within budget; `/health/detailed` remains `ok`.
- **Rollback**: Disable AI features (`AI_ENABLED=false`); revert to previous model routing.

## 10) Elevated 5xx across services

- **Symptoms**: Alert on aggregate 5xx; dashboards red; customers report errors across features.
- **Quick checks**: Check `/health/ready`; inspect recent deploys; sample logs for stack traces; ensure databases/Redis healthy.
- **Fix**: Roll back last deployment; scale up replicas temporarily; purge bad cache entries; confirm rate limits not overly strict.
- **Verify**: 5xx rate returns to baseline; smoke tests green; health probes stable.
- **Rollback**: Helm rollback or `kubectl rollout undo`; restore previous config and reduce traffic (via WAF/ingress) if needed.
