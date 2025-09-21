# IntelGraph — Alert Pack (PromQL & LogQL)

**Date:** September 17, 2025  
**Scope:** Production  
**Notes:** Replace placeholders like `{{tenant}}`, `{{service}}`, and label keys to match your metrics schema. All alerts include multi‑tenant selectors and global rollups.

---

## 0) Conventions
- **Labels:** `tenant`, `service`, `route`, `op`, `status_class`, `env`  
- **Histogram buckets:** `_bucket`, `_sum`, `_count`  
- **Windows:** fast = `5m`, steady = `15m`, confirm = `30m`  
- **SLOs:** Read p95 ≤ 350ms; Write p95 ≤ 700ms; Availability 99.9%; Policy p95 ≤ 25ms (max 60ms)

---

## 1) SLO Burn & Availability

### 1.1 Request Success Ratio (per tenant & global)
```promql
# Success = 2xx + 3xx + expected 4xx (policy_denied)
(sum by (tenant) (
  rate(http_requests_total{env="prod",status_class=~"2..|3.."}[5m])
+ rate(http_requests_total{env="prod",status="403",reason="policy_denied"}[5m])
))
/
(sum by (tenant) (
  rate(http_requests_total{env="prod"}[5m])
))
```

### 1.2 Error Budget Burn (multi‑window, multi‑burn)
```promql
# Target availability 99.9% => error budget 0.1%
let:sr_short = 1 - (
  sum(rate(http_requests_total{env="prod",status_class=~"5.."}[5m]))
/
  sum(rate(http_requests_total{env="prod"}[5m]))
);
let:sr_long = 1 - (
  sum(rate(http_requests_total{env="prod",status_class=~"5.."}[1h]))
/
  sum(rate(http_requests_total{env="prod"}[1h]))
);
(sr_short < 0.999 and sr_long < 0.999)
```
> Use Alerting: **Warn** when burn predicts >2%/day, **Crit** >10%/day.

### 1.3 Burn Prediction (Google SRE style)
```promql
# EB = 0.001. Convert to 30d windows.
max by () (
  (1 - sr_short) / 0.001 * (30*24*60/5)
)
```

---

## 2) Latency SLOs (GraphQL API)

### 2.1 p95 Read Latency ≤ 350ms
```promql
histogram_quantile(0.95,
  sum by (le, tenant, op) (
    rate(graphql_read_latency_ms_bucket{env="prod"}[5m])
  )
) > 350
```

### 2.2 p95 Write Latency ≤ 700ms
```promql
histogram_quantile(0.95,
  sum by (le, tenant, op) (
    rate(graphql_write_latency_ms_bucket{env="prod"}[5m])
  )
) > 700
```

### 2.3 Error Rate > 0.5% (total) / 5xx > 0.2%
```promql
100 * (
  sum(rate(http_requests_total{env="prod",status_class=~"4..|5.."}[5m]))
/
  sum(rate(http_requests_total{env="prod"}[5m]))
) > 0.5
```
```promql
100 * (
  sum(rate(http_requests_total{env="prod",status_class="5.."}[5m]))
/
  sum(rate(http_requests_total{env="prod"}[5m]))
) > 0.2
```

---

## 3) GraphQL Caching & Persisted Queries (PQ)

### 3.1 Persisted Query Cache Hit < 85%
```promql
100 * (
  sum(rate(pq_cache_hits_total{env="prod"}[5m]))
/
  sum(rate(pq_cache_requests_total{env="prod"}[5m]))
) < 85
```

### 3.2 Response Cache Hit < target
```promql
100 * (
  sum(rate(resp_cache_hits_total{env="prod"}[5m]))
/
  sum(rate(resp_cache_requests_total{env="prod"}[5m]))
) < 80
```

### 3.3 LRU Evictions Spike
```promql
rate(pq_lru_evictions_total{env="prod"}[5m]) > 200
```

---

## 4) Redis (Caching Layer)

### 4.1 P99 > 5ms / Evictions > 2%/min
```promql
# Latency
histogram_quantile(0.99,
  sum by (le, cmd) (rate(redis_cmd_duration_seconds_bucket{env="prod"}[5m]))
) > 0.005
```
```promql
# Eviction rate percent
100 * (
  rate(redis_evicted_keys_total{env="prod"}[1m])
/
  rate(redis_expired_keys_total{env="prod"}[1m])
) > 2
```

### 4.2 CPU > 70% for 15m
```promql
avg_over_time(redis_cpu_utilization_ratio{env="prod"}[15m]) * 100 > 70
```

---

## 5) Neo4j (Graph)

### 5.1 Replica Lag > 150ms (Warn) / > 250ms (Crit)
```promql
neo4j_replication_lag_milliseconds{env="prod"} > 150
```

### 5.2 Query p95 > 300ms / Page Cache Hit < 95%
```promql
histogram_quantile(0.95,
  sum by (le, query_type) (rate(neo4j_query_duration_ms_bucket{env="prod"}[5m]))
) > 300
```
```promql
100 * avg(neo4j_page_cache_hit_ratio{env="prod"}) < 95
```

---

## 6) Event Reasoner (ER) & Messaging

### 6.1 Lag > 120s (Warn) / > 180s (Crit)
```promql
er_consumer_lag_seconds{env="prod"} > 120
```

### 6.2 DLQ Rate ≥ 0.3% (Warn) / ≥ 0.5% (Crit)
```promql
100 * (
  sum(rate(er_dlq_messages_total{env="prod"}[5m]))
/
  sum(rate(er_processed_messages_total{env="prod"}[5m]))
) > 0.3
```

### 6.3 Circuit Breaker Open > 3% of time
```promql
100 * avg_over_time(er_circuit_open_ratio{env="prod"}[15m]) > 3
```

---

## 7) OPA / Policy & Privacy

### 7.1 Policy Decision p95 > 40ms (Warn) / > 60ms (Crit)
```promql
histogram_quantile(0.95,
  sum by (le, policy) (rate(opa_decision_duration_ms_bucket{env="prod"}[5m]))
) > 40
```

### 7.2 Cache Hit < 85%
```promql
100 * (
  sum(rate(opa_cache_hits_total{env="prod"}[5m]))
/
  sum(rate(opa_cache_requests_total{env="prod"}[5m]))
) < 85
```

### 7.3 Privacy Detections Spike > 3× Baseline
```promql
(
  sum(rate(privacy_detections_total{env="prod"}[5m]))
) / clamp_min(
  sum(rate(privacy_detections_total{env="prod"}[1h])), 1
) > 3
```

---

## 8) WebAuthn & Risk

### 8.1 Authentication Failure Rate > 1% (Warn) / > 2% (Crit)
```promql
100 * (
  sum(rate(webauthn_failures_total{env="prod"}[5m]))
/
  sum(rate(webauthn_attempts_total{env="prod"}[5m]))
) > 1
```

### 8.2 Step‑Up Prompt Rate > 2× Baseline
```promql
(
  sum(rate(stepup_prompts_total{env="prod"}[5m]))
) / clamp_min(
  sum(rate(stepup_prompts_total{env="prod"}[1h])), 1
) > 2
```

---

## 9) FinOps / Cost Guardrails

### 9.1 Spend Rate > 1.3× Forecast
```promql
(cost_spend_rate{env="prod"} / cost_forecast_rate{env="prod"}) > 1.3
```

### 9.2 Sampling Floor Hit > 15m
```promql
avg_over_time(observability_sampling_rate{env="prod"}[15m]) <= sampling_floor{env="prod"}
```

---

## 10) Provenance / Supply Chain

### 10.1 Verification Failures > 0
```promql
sum(rate(provenance_verify_failures_total{env="prod"}[5m])) > 0
```

### 10.2 Emergency Bypass Used
```promql
sum(increase(provenance_emergency_bypass_total{env="prod"}[1h])) > 0
```

---

## 11) Alerting Rules (Prometheus YAML excerpts)

```yaml
groups:
- name: intelgraph-slos
  rules:
  - alert: ErrorBudgetBurnHigh
    expr: |
      (1 - (sum(rate(http_requests_total{env="prod",status_class=~"2..|3..|4.."}[5m])) /
             sum(rate(http_requests_total{env="prod"}[5m])))) > 0.001
    for: 15m
    labels:
      severity: crit
      service: intelgraph-api
    annotations:
      summary: "High error budget burn"
      runbook: "ga-playbook#slo-burn"

- name: intelgraph-api
  rules:
  - alert: GraphQLReadLatencyP95High
    expr: |
      histogram_quantile(0.95, sum by (le) (rate(graphql_read_latency_ms_bucket{env="prod"}[5m]))) > 350
    for: 10m
    labels: {severity: warn, service: graphql}
    annotations: {summary: "p95 read latency > 350ms", runbook: "runbooks/graphql#latency"}

  - alert: GraphQLCacheHitLow
    expr: |
      100 * (sum(rate(pq_cache_hits_total{env="prod"}[5m])) / sum(rate(pq_cache_requests_total{env="prod"}[5m]))) < 85
    for: 10m
    labels: {severity: warn, service: graphql}
    annotations: {summary: "Persisted query cache hit < 85%", runbook: "runbooks/graphql#cache"}
```

---

## 12) LogQL (Loki) — Symptom & Context

### 12.1 5xx Burst with Top Ops
```logql
{app="graphql", env="prod"} |= "status=5" | json | unwrap duration_ms
|= "tenant="
| stats count() by op, tenant
| sort by count() desc
| limit 10
```

### 12.2 Policy Denials Diff (Unexpected)
```logql
{app="policy", env="prod"} |= "decision=deny" | json
| label_format reason=reason, tenant=tenant, policy=policy
| stats sum(count) by reason, policy, tenant
```

### 12.3 WebAuthn Error Taxonomy
```logql
{app="auth", env="prod"} |~ "(WebAuthnError|AttestationError|AssertionError)" | json
| stats count() by error_code, device_type, tenant
```

### 12.4 ER DLQ Top Error Classes (last 30m)
```logql
{app="er", env="prod"} |= "DLQ" | json
| stats count() by error_class, source_topic, tenant
| sort by count() desc
```

---

## 13) Recording Rules (for dashboards)

```yaml
- name: intelgraph-recording
  rules:
  - record: service:request_rate_per_tenant:5m
    expr: sum by (tenant, service) (rate(http_requests_total{env="prod"}[5m]))

  - record: graphql:p95_read_latency_ms:5m
    expr: |
      1000 * histogram_quantile(0.95, sum by (le, tenant) (rate(graphql_read_latency_seconds_bucket{env="prod"}[5m])))

  - record: opa:p95_decision_ms:5m
    expr: |
      histogram_quantile(0.95, sum by (le, policy) (rate(opa_decision_duration_ms_bucket{env="prod"}[5m])))

  - record: redis:p99_cmd_seconds:5m
    expr: histogram_quantile(0.99, sum by (le, cmd) (rate(redis_cmd_duration_seconds_bucket{env="prod"}[5m])))
```

---

## 14) Alert Labels & Routing Hints

Add consistent labels to every rule to drive PagerDuty routing (see routing matrix):
```yaml
labels:
  service: graphql|redis|neo4j|er|opa|auth|finops|supplychain
  severity: warn|crit
  tenant: {{tenant|global}}
  team: api|platform|data|security|finops
  runbook: runbooks/<service>#<topic>
```

---

## 15) Smoke Test Queries (Grafana)

- **Latency heatmap:** `histogram_quantile(0.95, sum by (le, op) (rate(graphql_read_latency_ms_bucket{env="prod"}[5m])))`
- **Cache health:** `100 * sum(rate(pq_cache_hits_total{env="prod"}[5m])) / sum(rate(pq_cache_requests_total{env="prod"}[5m]))`
- **Replica lag:** `neo4j_replication_lag_milliseconds{env="prod"}`
- **DLQ trend:** `sum(increase(er_dlq_messages_total{env="prod"}[1h])) by (tenant)`
- **Policy p95:** `histogram_quantile(0.95, sum by (le) (rate(opa_decision_duration_ms_bucket{env="prod"}[5m])))`

---

**Import these into Prometheus/Loki and wire to PagerDuty using the labels in §14.**

