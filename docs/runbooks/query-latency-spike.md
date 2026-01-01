# Query Latency Spike - Runbook

Handles spikes in API/GraphQL latency affecting user queries.

## Detection

- [ ] Alert: `p95` or `p99` latency above SLO for 10 minutes.
- [ ] Alert: Saturated thread pool or event loop lag > 200 ms.
- [ ] Synthetic checks failing due to timeouts.

## Immediate Actions (10 minutes)

- [ ] Page on-call; declare incident channel.
- [ ] Enable request sampling to 100% in observability (temporarily).
- [ ] Tag incident traces with `latency-spike`.

## Diagnostics

1. **Service health**
   - Command: `kubectl -n api get pods -l app=graphql -o wide`
   - Expected: Pods Running; restarts stable. Any pod `NotReady` → cordon and capture logs.
2. **Hot endpoints**
   - Command: `promtool query range http_request_duration_seconds_bucket{service="graphql"}`
   - Expected: Identify endpoints contributing to p95/p99. Look for new query shapes.
3. **DB pressure**
   - Command: `psql "$PG_DSN" -c "select state, wait_event_type, count(*) from pg_stat_activity group by 1,2;"`
   - Expected: No sustained `wait_event_type = Lock` spikes; CPU/IO within budget.
4. **Cache hit rate**
   - Command: `curl -s $GRAFANA_LB/cache/hit-rate`
   - Expected: Hit rate >90%. If <70%, check upstream invalidations.

## Mitigations

- [ ] Throttle expensive queries:
  - Command: `opa exec set policy graphql.rate_limit true --reason "latency spike"`
  - Expected: Requests matching policy return `429` with `Retry-After`.
- [ ] Add burst capacity:
  - Command: `kubectl -n api scale deploy/graphql --replicas=+2`
  - Expected: New pods Ready within 3–4 minutes; latency trending down.
- [ ] Enable persisted queries only mode (if abuse suspected):
  - Command: `featurectl enable graphql.persisted_only`
  - Expected: Non-whitelisted queries rejected; error rate drops.

## Recovery Verification

- [ ] p95/p99 back under SLO for 15 minutes.
- [ ] Error rate <1% and no sustained throttling.
- [ ] DB wait events normal; connection pool <80% utilization.

## Communication

- [ ] Post updates every 15 minutes with current latency percentile and mitigations.
- [ ] Document impacted tenants/regions and any throttling policies applied.
