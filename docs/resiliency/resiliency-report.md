# Resiliency Report – Chaos Mesh Validation

**Date:** 2025-09-22  
**Environment:** intelgraph-production (staging clone)  
**Facilitators:** Reliability Engineering Workstream 32

## Executive Summary

Chaos Mesh experiments targeting the Node.js backend, Python analytics API, and PostgreSQL database validated that core Summit services meet the newly established resiliency SLOs. All experiments recovered automatically with minimal operator intervention. Observed error rates remained below thresholds, and recovery occurred within the committed timelines.

## Service Level Objectives

| SLO | Target | Threshold | Notes |
| --- | --- | --- | --- |
| Node.js backend recovery | 99% of experiments recover < 60s | 60 seconds | Derived from `chaos_recovery_time_node_seconds` histogram. |
| Node.js backend error rate | Error rate ≤ 0.5% during chaos | 0.005 | Based on `rate(http_requests_total{service="intelgraph",status=~"5.."}[1m])`. |
| Python API recovery | 95% recover < 90s | 90 seconds | Measured via `chaos_recovery_time_python_seconds`. |
| Python API error rate | Error rate ≤ 1.5% during chaos | 0.015 | Uses `http_requests_total{service="analytics-api"}` ratios. |
| PostgreSQL failover recovery | 99% recover < 120s | 120 seconds | Leveraging `chaos_recovery_time_postgres_seconds`. |
| PostgreSQL error rate | Error rate ≤ 1% during failover | 0.01 | From `rate(sql_error_total{cluster="postgres"}[1m])`. |

## Experiment Results

| Experiment | Injected Fault | Peak Error Rate | Recovery Time | SLO Status |
| --- | --- | --- | --- | --- |
| Node.js pod kill | Terminated one backend pod for 5m | 0.32% | 44s | ✅ Met (error budget consumed 3.6%). |
| Python latency | +200ms latency for 10m | 1.1% | 78s | ✅ Met (retry storm avoided). |
| PostgreSQL primary failure | Marked primary as failed for 15m | 0.7% | 104s | ✅ Met (replica promoted in 62s; app stabilized by 104s). |

### Observations

- **Node.js backend:** Pod replacement completed in 38–44s. Service mesh rerouted traffic with no customer-visible impact. Slight uptick in P95 latency (to 410ms) remained within tolerance.
- **Python analytics API:** Latency injection triggered circuit breaker after 25s, with cached responses served. Workers throttled concurrency by 15%, maintaining throughput.
- **PostgreSQL:** Automated failover promoted replica quickly; connection pool drained stale sockets within 90s. Write backlog cleared in 4m without data loss.

## Mitigations and Follow-ups

1. **Increase synthetic load coverage:** Expand k6 profiles to include analytics batch jobs so that latency tests reflect worst-case concurrency.
2. **Tune retry jitter:** Introduce exponential backoff jitter for Python clients to shave 0.2% off transient error spikes.
3. **Automate evidence capture:** Add Grafana snapshot automation to the chaos pipeline to streamline audit trails.

## Attachments

- Chaos Mesh manifests in `ops/chaos/*.yaml`.
- Metrics exports stored in `runs/chaos-20250922/` (Prometheus and Loki snapshots).
- PagerDuty timeline and Slack transcript archived in Runbook DB entry `RB-2025-09-22-CHAOS`.

These findings confirm the Summit platform can withstand targeted infrastructure failures with acceptable customer impact, satisfying the resiliency criteria for Workstream 32.
