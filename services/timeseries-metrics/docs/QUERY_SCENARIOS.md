# Query Scenarios & Examples

> Common query patterns for the Time-Series Metrics Platform

## Table of Contents

1. [SLO Burn Rate Queries](#slo-burn-rate-queries)
2. [Per-Tenant Performance](#per-tenant-performance)
3. [Error Rate Analysis](#error-rate-analysis)
4. [Latency Analysis](#latency-analysis)
5. [Capacity Planning](#capacity-planning)
6. [Cost & Usage Queries](#cost--usage-queries)
7. [Anomaly Detection](#anomaly-detection)

---

## SLO Burn Rate Queries

### Current Error Budget Status

```promql
# Error budget remaining (percentage)
100 - (
  (1 - (
    sum(rate(http_requests_total{status!~"5.."}[30d])) /
    sum(rate(http_requests_total[30d]))
  )) / (1 - 0.999) * 100
)
```

### Multi-Window Burn Rate (Fast Burn Alert)

```promql
# Short window (5m) burn rate
(
  1 - (
    sum(rate(http_requests_total{status!~"5.."}[5m])) /
    sum(rate(http_requests_total[5m]))
  )
) / (1 - 0.999) * (30 * 24 * 60 / 5)

# Long window (1h) burn rate
(
  1 - (
    sum(rate(http_requests_total{status!~"5.."}[1h])) /
    sum(rate(http_requests_total[1h]))
  )
) / (1 - 0.999) * (30 * 24)

# Alert condition: Both windows exceed threshold
# short_burn > 14.4 AND long_burn > 14.4
```

### Error Budget Consumption Over Time

```promql
# Daily error budget consumption trend
(
  1 - (
    sum(increase(http_requests_total{status!~"5.."}[1d])) /
    sum(increase(http_requests_total[1d]))
  )
) / (1 - 0.999) * 100
```

---

## Per-Tenant Performance

### Request Rate by Tenant

```promql
# Current request rate per tenant
sum by (tenant) (rate(http_requests_total[5m]))

# Top 10 tenants by request volume
topk(10, sum by (tenant) (rate(http_requests_total[5m])))
```

### Latency Percentiles by Tenant

```promql
# P99 latency by tenant
histogram_quantile(0.99,
  sum by (tenant, le) (
    rate(http_request_duration_seconds_bucket[5m])
  )
)

# P50 vs P99 comparison
histogram_quantile(0.50, sum by (tenant, le) (rate(http_request_duration_seconds_bucket[5m])))
/
histogram_quantile(0.99, sum by (tenant, le) (rate(http_request_duration_seconds_bucket[5m])))
```

### Error Rate by Tenant

```promql
# Error rate per tenant (last hour)
sum by (tenant) (rate(http_requests_total{status=~"5.."}[1h]))
/
sum by (tenant) (rate(http_requests_total[1h]))
* 100

# Tenants with error rate > 1%
sum by (tenant) (rate(http_requests_total{status=~"5.."}[1h]))
/
sum by (tenant) (rate(http_requests_total[1h]))
> 0.01
```

### Resource Utilization by Tenant

```promql
# Active series per tenant
count by (tenant) ({__name__=~".+"})

# Storage usage estimation (samples * 24 bytes)
sum by (tenant) (
  increase(timeseries_samples_accepted_total[1d])
) * 24
```

---

## Error Rate Analysis

### Error Rate by Service

```promql
# Overall error rate
sum(rate(http_requests_total{status=~"5.."}[5m]))
/
sum(rate(http_requests_total[5m]))

# Error rate by service
sum by (service) (rate(http_requests_total{status=~"5.."}[5m]))
/
sum by (service) (rate(http_requests_total[5m]))
```

### Error Breakdown by Type

```promql
# Errors by status code
sum by (status_code) (rate(http_requests_total{status=~"[45].."}[5m]))

# Client vs Server errors
sum(rate(http_requests_total{status=~"4.."}[5m])) # Client errors
sum(rate(http_requests_total{status=~"5.."}[5m])) # Server errors
```

### Error Spike Detection

```promql
# Error rate deviation from baseline (z-score)
(
  sum(rate(http_requests_total{status=~"5.."}[5m]))
  - avg_over_time(sum(rate(http_requests_total{status=~"5.."}[5m]))[1d:5m])
)
/
stddev_over_time(sum(rate(http_requests_total{status=~"5.."}[5m]))[1d:5m])
```

---

## Latency Analysis

### Latency Percentiles

```promql
# P50, P90, P95, P99 latency
histogram_quantile(0.50, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
histogram_quantile(0.90, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
```

### Latency by Endpoint

```promql
# P95 latency by endpoint
histogram_quantile(0.95,
  sum by (path, le) (
    rate(http_request_duration_seconds_bucket[5m])
  )
)

# Slowest endpoints
topk(10,
  histogram_quantile(0.95,
    sum by (path, le) (
      rate(http_request_duration_seconds_bucket[5m])
    )
  )
)
```

### Latency Trends

```promql
# Week-over-week latency comparison
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[1h])) by (le))
/
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[1h] offset 1w)) by (le))
```

### Apdex Score

```promql
# Apdex with T=0.5s (satisfied < 0.5s, tolerating < 2s)
(
  sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m]))
  + sum(rate(http_request_duration_seconds_bucket{le="2"}[5m])) / 2
)
/
sum(rate(http_request_duration_seconds_count[5m]))
```

---

## Capacity Planning

### Traffic Growth Rate

```promql
# Week-over-week growth rate
(
  sum(rate(http_requests_total[1d]))
  - sum(rate(http_requests_total[1d] offset 1w))
)
/
sum(rate(http_requests_total[1d] offset 1w))
* 100
```

### Resource Saturation

```promql
# Database connection pool saturation
db_connection_pool_active / db_connection_pool_size

# Redis memory saturation
redis_memory_used_bytes / redis_memory_max_bytes

# Kafka consumer lag
sum by (consumer_group, topic) (kafka_consumer_lag)
```

### Projected Capacity

```promql
# Predict request rate in 7 days (linear extrapolation)
predict_linear(sum(rate(http_requests_total[1h]))[7d:1h], 7 * 24 * 3600)
```

---

## Cost & Usage Queries

### Ingestion Rate by Tenant

```promql
# Samples ingested per second by tenant
sum by (tenant) (rate(timeseries_samples_accepted_total[5m]))
```

### Storage Usage Estimation

```promql
# Estimated daily storage per tenant (bytes)
# Assuming 24 bytes per sample
sum by (tenant) (increase(timeseries_samples_accepted_total[1d])) * 24
```

### Query Cost Tracking

```promql
# Queries per tenant
sum by (tenant) (rate(timeseries_queries_total[1h]))

# Data points scanned per query
sum by (tenant) (rate(timeseries_query_samples_scanned_total[1h]))
/
sum by (tenant) (rate(timeseries_queries_total[1h]))
```

### Budget Alerts

```promql
# Tenants approaching storage quota (>80%)
sum by (tenant) (timeseries_storage_used_bytes)
/
sum by (tenant) (timeseries_storage_quota_bytes)
> 0.8

# Tenants exceeding ingestion rate limit
sum by (tenant) (rate(timeseries_samples_rejected_total{reason="quota_exceeded"}[5m]))
> 0
```

---

## Anomaly Detection

### Statistical Anomalies

```promql
# Z-score for request rate (values > 3 are anomalous)
(
  sum(rate(http_requests_total[5m]))
  - avg_over_time(sum(rate(http_requests_total[5m]))[1d:5m])
)
/
stddev_over_time(sum(rate(http_requests_total[5m]))[1d:5m])
```

### Sudden Changes

```promql
# Rate of change detection
deriv(sum(rate(http_requests_total[5m]))[1h:5m])

# Large drops in traffic (> 50% decrease)
(
  sum(rate(http_requests_total[5m] offset 1h))
  - sum(rate(http_requests_total[5m]))
)
/
sum(rate(http_requests_total[5m] offset 1h))
> 0.5
```

### Pattern Deviations

```promql
# Day-over-day comparison
sum(rate(http_requests_total[1h]))
/
sum(rate(http_requests_total[1h] offset 1d))

# Hour-over-hour comparison (same hour yesterday)
sum(rate(http_requests_total[1h]))
/
sum(rate(http_requests_total[1h] offset 24h))
```

---

## Dashboard Query Templates

### Service Overview Dashboard

```yaml
panels:
  - title: Request Rate
    query: sum(rate(http_requests_total[5m]))
    type: graph

  - title: Error Rate
    query: |
      sum(rate(http_requests_total{status=~"5.."}[5m]))
      / sum(rate(http_requests_total[5m])) * 100
    type: gauge
    thresholds: [0.1, 0.5, 1]

  - title: P99 Latency
    query: |
      histogram_quantile(0.99,
        sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
      )
    type: graph
    unit: seconds

  - title: Active Series
    query: count({__name__=~".+"})
    type: stat
```

### SLO Dashboard

```yaml
panels:
  - title: Error Budget Remaining
    query: |
      100 - (
        (1 - (
          sum(rate(http_requests_total{status!~"5.."}[30d]))
          / sum(rate(http_requests_total[30d]))
        )) / (1 - 0.999) * 100
      )
    type: gauge
    thresholds: [0, 25, 50]

  - title: Burn Rate (1h)
    query: |
      (1 - (
        sum(rate(http_requests_total{status!~"5.."}[1h]))
        / sum(rate(http_requests_total[1h]))
      )) / (1 - 0.999) * (30 * 24)
    type: stat
    thresholds: [1, 3, 6]

  - title: Time to Budget Exhaustion
    query: |
      # Custom calculation based on current burn rate
    type: stat
    unit: hours
```

---

## Query Optimization Tips

1. **Use appropriate time ranges**: Query hot tier for recent data, don't query year-long ranges at 15s resolution
2. **Limit label selectors**: More specific queries are faster
3. **Use recording rules**: Pre-compute expensive aggregations
4. **Avoid regex where possible**: Exact matches are faster than `=~`
5. **Use `topk`/`bottomk`**: Limit result set for large cardinality metrics
6. **Check cardinality**: `count by (label) (metric)` before complex queries

---

## Recording Rules (Recommended)

```yaml
groups:
  - name: slo_recording_rules
    interval: 1m
    rules:
      - record: slo:http_requests:error_rate_5m
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m]))
          / sum(rate(http_requests_total[5m]))

      - record: slo:http_requests:availability_30d
        expr: |
          sum(rate(http_requests_total{status!~"5.."}[30d]))
          / sum(rate(http_requests_total[30d]))

      - record: slo:http_latency:p99_5m
        expr: |
          histogram_quantile(0.99,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
          )

  - name: tenant_recording_rules
    interval: 1m
    rules:
      - record: tenant:http_requests:rate_5m
        expr: sum by (tenant) (rate(http_requests_total[5m]))

      - record: tenant:http_requests:error_rate_5m
        expr: |
          sum by (tenant) (rate(http_requests_total{status=~"5.."}[5m]))
          / sum by (tenant) (rate(http_requests_total[5m]))
```
