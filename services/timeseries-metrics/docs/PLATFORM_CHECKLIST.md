# Time-Series Metrics Platform Checklist

> Use this checklist to verify that a metric family is platform-ready and follows best practices.

## Metric Family Readiness Checklist

A metric family is **platform-ready** if all the following criteria are met:

### 1. Naming & Structure

- [ ] **Metric name follows conventions**: `<namespace>_<subsystem>_<name>_<unit>`
  - Uses snake_case
  - Includes unit suffix (_seconds, _bytes, _total, _ratio)
  - No special characters except underscore
  - Length <= 128 characters

- [ ] **Metric type is appropriate**:
  - Counter: For monotonically increasing values (totals, errors)
  - Gauge: For values that go up/down (connections, memory)
  - Histogram: For latency distributions with buckets
  - Summary: For streaming percentiles (client-side calculated)

- [ ] **Help text is provided**: Clear description of what the metric measures

### 2. Labels & Cardinality

- [ ] **Standard labels are used** (where applicable):
  - `service`: Service name
  - `tenant`: Tenant identifier
  - `region`: Deployment region
  - `environment`: dev/staging/prod
  - `instance`: Instance identifier

- [ ] **Label cardinality is bounded**:
  - No unbounded label values (user IDs, request IDs, timestamps)
  - Each label has documented cardinality limit
  - Total series count estimated and within limits

- [ ] **Label names follow conventions**:
  - snake_case format
  - Descriptive but concise
  - No reserved prefixes (__*)

### 3. Retention & Storage

- [ ] **Retention policy assigned**:
  - Default policy is appropriate, OR
  - Custom policy configured for specific needs

- [ ] **Storage tier requirements documented**:
  - Hot tier: Real-time alerting needs
  - Warm tier: Weekly/monthly analysis
  - Cold tier: Historical compliance

- [ ] **Downsampling aggregations specified**:
  - Which aggregations are meaningful (avg, sum, max, p95, etc.)
  - Resolution requirements at each tier

### 4. Query Patterns

- [ ] **Common query patterns documented**:
  - Rate queries for counters
  - Aggregation queries (sum by, avg by)
  - Histogram quantile queries

- [ ] **Query performance validated**:
  - Queries complete within timeout
  - Cardinality doesn't cause memory issues
  - Appropriate time ranges for each tier

### 5. SLO Integration

- [ ] **SLI definition exists** (if applicable):
  - Good events query defined
  - Total events query defined
  - Target percentage documented

- [ ] **Burn rate alerts configured**:
  - Critical: Fast burn (5m/1h windows)
  - Warning: Slow burn (2h/1d windows)

### 6. Multi-Tenant Considerations

- [ ] **Tenant isolation verified**:
  - Tenant label present on all metrics
  - Queries scoped to tenant
  - No cross-tenant data leakage

- [ ] **Quota impact assessed**:
  - Ingestion rate within limits
  - Active series count within limits
  - Storage usage estimated

### 7. Documentation

- [ ] **Metric catalog entry exists**:
  - Name, type, description
  - Labels and their meanings
  - Example queries

- [ ] **Runbook references** (for alerting metrics):
  - What does this metric mean?
  - What to do when it's out of bounds?
  - Who to escalate to?

---

## Example: HTTP Request Metrics

```yaml
metric_family: http_requests
status: platform_ready

metrics:
  - name: http_requests_total
    type: counter
    help: Total number of HTTP requests
    labels:
      - service: bounded (500)
      - method: bounded (10)
      - path: bounded (500, sanitized)
      - status_code: bounded (100)

  - name: http_request_duration_seconds
    type: histogram
    help: HTTP request latency in seconds
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
    labels:
      - service: bounded (500)
      - method: bounded (10)
      - path: bounded (500, sanitized)

retention_policy: default
slo_integration: yes

common_queries:
  - rate(http_requests_total{service="api"}[5m])
  - histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))
  - sum by (status_code) (rate(http_requests_total[5m]))

slo_definition:
  name: API Availability
  target: 99.9%
  good_query: sum(rate(http_requests_total{status_code!~"5.."}[5m]))
  total_query: sum(rate(http_requests_total[5m]))
```

---

## Quick Reference: Metric Types

| Metric Type | When to Use | Example |
|-------------|-------------|---------|
| Counter | Counting events that only increase | `http_requests_total`, `errors_total` |
| Gauge | Values that go up and down | `active_connections`, `queue_size` |
| Histogram | Measuring distributions | `request_duration_seconds`, `response_size_bytes` |
| Summary | Pre-calculated quantiles | `gc_duration_seconds` |

## Quick Reference: Standard Histogram Buckets

| Use Case | Buckets |
|----------|---------|
| HTTP latency (ms) | 1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000 |
| DB query latency (ms) | 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000 |
| Cache latency (μs) | 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000 |
| Request size (bytes) | 100, 1K, 10K, 100K, 1M, 10M, 100M |

## Quick Reference: Label Best Practices

| Do | Don't |
|----|-------|
| `status_code="200"` | `status_code="200 OK"` |
| `method="GET"` | `method="get"` (be consistent) |
| `path="/api/users"` | `path="/api/users/12345"` (unbounded!) |
| `error_type="timeout"` | `error_message="Connection timed out after 30s"` |

---

## Approval Workflow

1. **Developer** fills out this checklist for new metric family
2. **Tech Lead** reviews cardinality and query patterns
3. **SRE/Platform** reviews retention and SLO integration
4. **Merge** metric definition to metrics catalog

## Contact

- **Platform Team**: #observability-platform
- **Documentation**: [Internal Wiki - Metrics Guide]
- **Issues**: [GitHub Issues - timeseries-metrics]
