# IntelGraph — Alert Pack (PromQL & LogQL)

Date: 2025-09-17
Scope: Production
Notes: Replace placeholders like {{tenant}} and label keys to match your metrics schema. All alerts support multi‑tenant selectors and global rollups.

---

## Conventions

- Labels: tenant, service, route, op, status_class, env
- Windows: fast=5m, steady=15m, confirm=30m
- SLOs: Read p95 ≤ 350ms; Write p95 ≤ 700ms; Availability 99.9%; Policy p95 ≤ 25ms

---

## SLO Burn & Availability

### Request Success Ratio (per tenant)

```promql
(sum by (tenant) (
  rate(http_requests_total{env="prod",status_class=~"2..|3.."}[5m])
  + rate(http_requests_total{env="prod",status="403",reason="policy_denied"}[5m])
)) / (sum by (tenant) (rate(http_requests_total{env="prod"}[5m])))
```

### Error Budget Burn (multi‑window)

```promql
# 99.9% target => 0.1% budget
(1 - (sum(rate(http_requests_total{env="prod",status_class=~"5.."}[5m]))
   / sum(rate(http_requests_total{env="prod"}[5m])))) < 0.999
and
(1 - (sum(rate(http_requests_total{env="prod",status_class=~"5.."}[30m]))
   / sum(rate(http_requests_total{env="prod"}[30m])))) < 0.999
```

---

## Latency SLOs (GraphQL)

### Read p95 ≤ 350ms

```promql
histogram_quantile(0.95,
  sum by (le, tenant, op) (rate(graphql_read_latency_ms_bucket{env="prod"}[5m]))
) > 350
```

### Write p95 ≤ 700ms

```promql
histogram_quantile(0.95,
  sum by (le, tenant, op) (rate(graphql_write_latency_ms_bucket{env="prod"}[5m]))
) > 700
```

### Error Rate > 0.5% (total) / 5xx > 0.2%

```promql
100 * (sum(rate(http_requests_total{env="prod",status_class=~"4..|5.."}[5m]))
 / sum(rate(http_requests_total{env="prod"}[5m]))) > 0.5
```

```promql
100 * (sum(rate(http_requests_total{env="prod",status_class="5.."}[5m]))
 / sum(rate(http_requests_total{env="prod"}[5m]))) > 0.2
```

---

## Caching & PQ

### Persisted Query Cache Hit < 85%

```promql
100 * (
  sum(rate(pq_cache_hits_total{env="prod"}[5m]))
  / sum(rate(pq_cache_requests_total{env="prod"}[5m]))
) < 85
```

### Response Cache Hit < 80%

```promql
100 * (
  sum(rate(resp_cache_hits_total{env="prod"}[5m]))
  / sum(rate(resp_cache_requests_total{env="prod"}[5m]))
) < 80
```

---

## Redis

### P99 > 5ms

```promql
histogram_quantile(0.99,
  sum by (le, cmd) (rate(redis_cmd_duration_seconds_bucket{env="prod"}[5m]))
) > 0.005
```

### Evictions > 2%/min

```promql
100 * (
  rate(redis_evicted_keys_total{env="prod"}[1m])
  / clamp_min(rate(redis_expired_keys_total{env="prod"}[1m]), 1)
) > 2
```

---

## Neo4j

### Replica Lag

```promql
neo4j_replication_lag_milliseconds{env="prod"} > 150
```

### Query p95 > 300ms

```promql
histogram_quantile(0.95,
  sum by (le, query_type) (rate(neo4j_query_duration_ms_bucket{env="prod"}[5m]))
) > 300
```

---

## Event Reasoner (ER)

### Lag > 120s / DLQ ≥ 0.5%

```promql
er_consumer_lag_seconds{env="prod"} > 120
```

```promql
100 * (sum(rate(er_dlq_messages_total{env="prod"}[5m]))
 / sum(rate(er_processed_messages_total{env="prod"}[5m]))) >= 0.5
```

---

## OPA / Policy & Privacy

### Decision p95 > 60ms / Cache Hit < 85%

```promql
histogram_quantile(0.95,
  sum by (le, policy) (rate(opa_decision_duration_ms_bucket{env="prod"}[5m]))
) > 60
```

```promql
100 * (sum(rate(opa_cache_hits_total{env="prod"}[5m]))
 / sum(rate(opa_cache_requests_total{env="prod"}[5m]))) < 85
```

---

## WebAuthn

### Fail Rate > 2% / Step‑Up Prompt > 2× baseline

```promql
100 * (sum(rate(webauthn_failures_total{env="prod"}[5m]))
 / sum(rate(webauthn_attempts_total{env="prod"}[5m]))) > 2
```

```promql
(sum(rate(stepup_prompts_total{env="prod"}[5m]))
 / clamp_min(sum(rate(stepup_prompts_total{env="prod"}[1h])), 1)) > 2
```

---

## Provenance / Supply Chain

### Verification Failures > 0

```promql
sum(rate(provenance_verify_failures_total{env="prod"}[5m])) > 0
```

### Emergency Bypass Used

```promql
sum(increase(provenance_emergency_bypass_total{env="prod"}[1h])) > 0
```

---

## LogQL (Loki) — Symptom & Context

### 5xx Burst with Top Ops

```logql
{app="graphql", env="prod"} |= "status=5" | json | unwrap duration_ms
|= "tenant="
| stats count() by op, tenant
| sort by count() desc
| limit 10
```

### Policy Denials Diff

```logql
{app="policy", env="prod"} |= "decision=deny" | json
| stats count() by reason, policy, tenant
```

---

## Labels & Routing Hints

Add consistent labels to every rule for PagerDuty routing:

```yaml
labels:
  service: graphql|redis|neo4j|er|opa|auth|finops|supplychain
  severity: warn|crit
  tenant: {{tenant|global}}
  team: api|platform|data|security|finops
  runbook: runbooks/<service>#<topic>
```

