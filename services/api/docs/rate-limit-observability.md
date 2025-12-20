# Summit API Rate Limiting Observability

This guide explains how to monitor the distributed sliding-window rate limiter and wire dashboards + alerts.

## Prometheus metrics
The `/metrics` endpoint now exposes Prometheus-compatible metrics. Key series:

- `rate_limit_allowed_total{bucket,source,endpoint}` – successful requests by bucket type (apiKey/user/ip) and decision source (redis/memory).
- `rate_limit_blocked_total{bucket,source,reason,endpoint}` – blocks by reason (`limit` or `backoff`).
- `rate_limit_backoff_ms{bucket,endpoint}` – histogram of exponential backoff durations applied to callers.
- `rate_limit_circuit_open` – gauge set to `1` when the circuit breaker has failed open to in-memory mode.
- `rate_limit_decision_latency_ms{source}` – decision latency histogram for Redis-backed vs. in-memory enforcement.

## Dashboard starter panels
Use these PromQL snippets as Grafana panels:

1. **Block rate (per bucket)**
   ```promql
   sum(rate(rate_limit_blocked_total[5m])) by (bucket, reason)
   ```
2. **Allowed vs blocked (per endpoint)**
   ```promql
   sum(rate(rate_limit_allowed_total[5m])) by (endpoint)
   /
   (sum(rate(rate_limit_allowed_total[5m])) by (endpoint)
    + sum(rate(rate_limit_blocked_total[5m])) by (endpoint))
   ```
3. **Backoff heatmap**
   ```promql
   histogram_quantile(0.95, sum(rate(rate_limit_backoff_ms_bucket[5m])) by (le, bucket))
   ```
4. **Circuit breaker uptime**
   ```promql
   avg_over_time(rate_limit_circuit_open[1h])
   ```
5. **Decision latency p95**
   ```promql
   histogram_quantile(0.95, sum(rate(rate_limit_decision_latency_ms_bucket[5m])) by (le, source))
   ```

## Alerting rules
- **Saturation alert** – fire when `rate_limit_blocked_total` spikes and utilization >=80% for 5 minutes:
  ```promql
  sum(rate(rate_limit_blocked_total[5m])) by (bucket) > 10
  and
  sum(rate(rate_limit_allowed_total[5m])) by (bucket)
    /
    sum(rate(rate_limit_allowed_total[5m]) + rate_limit_blocked_total[5m]) by (bucket) > 0.8
  ```
- **Circuit open alert** – fire immediately when `rate_limit_circuit_open == 1` for >1 minute.
- **High backoff alert** – p95 of `rate_limit_backoff_ms` above 5s for 10 minutes.

Alerts can be routed from Prometheus Alertmanager to Slack, PagerDuty, or email. The middleware also emits an `EventEmitter` (`rateLimitAlerter`) that can be subscribed to in-process for additional sinks.

## Logging
The middleware logs structured JSON entries on Redis failures, circuit-breaker events, and alert emissions. Attach log processors (e.g., Loki) to aggregate `service="summit-api"` logs and join them with PromQL dashboards for incident timelines.
