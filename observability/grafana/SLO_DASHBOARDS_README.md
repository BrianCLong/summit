# Core SLO Dashboards - October 2025

**Dashboard UID**: `core-slo-oct2025`
**Dashboard File**: `slo-core-dashboards.json`
**Created**: October 4, 2025

---

## Panel UIDs Reference

| Panel | Metric | SLO Target | Panel UID | Prometheus Query |
|-------|--------|------------|-----------|------------------|
| **API p95 Latency** | API request latency (95th percentile) | < 1.5s | `api-p95-latency-001` | `histogram_quantile(0.95, sum(rate(api_request_duration_seconds_bucket[5m])) by (le))` |
| **OPA Decision p95 Latency** | OPA policy decision latency (95th percentile) | < 500ms | `opa-p95-latency-002` | `histogram_quantile(0.95, sum(rate(opa_decision_duration_seconds_bucket[5m])) by (le))` |
| **Queue Lag** | Message queue consumer lag | < 10k messages | `queue-lag-003` | `sum(kafka_consumer_lag) by (topic)` |
| **Ingest Failure Rate** | Document ingest failure percentage | < 1% | `ingest-failure-rate-004` | `1 - (sum(rate(ingest_failures_total[5m])) / sum(rate(ingest_attempts_total[5m])))` |
| **Golden Flow Pass %** | End-to-end golden path success rate | > 99% | `golden-flow-pass-005` | `sum(rate(golden_flow_success_total[5m])) / sum(rate(golden_flow_total[5m]))` |

---

## Dashboard Details

### Purpose
This dashboard tracks the core SLO metrics for the October 2025 release as specified in the October Master Plan.

### Metrics Definitions

#### 1. API p95 Latency (Panel UID: `api-p95-latency-001`)
- **What it measures**: Time to process API requests at the 95th percentile
- **Why it matters**: Ensures responsive user experience
- **SLO**: < 1.5 seconds
- **Alert threshold**: 1.5s (red)

#### 2. OPA Decision p95 Latency (Panel UID: `opa-p95-latency-002`)
- **What it measures**: Policy decision evaluation time at the 95th percentile
- **Why it matters**: Authorization decisions must be fast to avoid blocking operations
- **SLO**: < 500ms
- **Alert threshold**: 500ms (red)

#### 3. Queue Lag (Panel UID: `queue-lag-003`)
- **What it measures**: Number of pending messages in Kafka queues
- **Why it matters**: Indicates system throughput and potential backlogs
- **SLO**: < 10,000 messages
- **Alert thresholds**:
  - 1,000 (yellow)
  - 10,000 (red)

#### 4. Ingest Failure Rate (Panel UID: `ingest-failure-rate-004`)
- **What it measures**: Percentage of document ingest operations that fail
- **Why it matters**: Data ingestion reliability
- **SLO**: < 1% failure rate (>99% success)
- **Alert thresholds**:
  - < 95% success (red)
  - 95-99% success (yellow)
  - > 99% success (green)

#### 5. Golden Flow Pass % (Panel UID: `golden-flow-pass-005`)
- **What it measures**: End-to-end test success rate for critical user journeys
- **Why it matters**: Overall system health indicator
- **SLO**: > 99% pass rate
- **Alert thresholds**:
  - < 95% (red)
  - 95-99% (yellow)
  - > 99% (green)

---

## Screenshots

Screenshots of this dashboard are exported to `observability/grafana/screenshots/` for documentation purposes.

---

## Importing Dashboard

### Method 1: Grafana UI
1. Open Grafana
2. Navigate to **Dashboards** → **Import**
3. Upload `slo-core-dashboards.json`
4. Select Prometheus datasource when prompted

### Method 2: Provisioning
Copy `slo-core-dashboards.json` to your Grafana provisioning directory:
```bash
cp observability/grafana/slo-core-dashboards.json /etc/grafana/provisioning/dashboards/
```

### Method 3: API
```bash
curl -X POST http://localhost:3000/api/dashboards/db \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d @observability/grafana/slo-core-dashboards.json
```

---

## Required Metrics

Ensure your Prometheus instance is scraping the following metrics:

```yaml
# API metrics
- api_request_duration_seconds_bucket
- api_request_duration_seconds_count
- api_request_duration_seconds_sum

# OPA metrics
- opa_decision_duration_seconds_bucket
- opa_decision_duration_seconds_count
- opa_decision_duration_seconds_sum

# Queue metrics
- kafka_consumer_lag

# Ingest metrics
- ingest_failures_total
- ingest_attempts_total

# Golden flow metrics
- golden_flow_success_total
- golden_flow_total
```

---

## Alert Rules

Corresponding alert rules are defined in `observability/alert-rules.yml` and reference these panel UIDs.

---

## Maintenance

- **Review Frequency**: Weekly during October 2025 sprint
- **Owner**: SRE Team
- **Next Review**: 2025-10-11
- **Version**: 1.0.0

---

## Related Documentation

- October Master Plan: `october2025/october_master_plan.md`
- Alert Configuration: `observability/alert-rules.yml`
- Prometheus Config: `observability/prometheus.yml`

---

**Last Updated**: October 4, 2025
**Dashboard Version**: 1.0.0
**Grafana Version Compatibility**: 9.5+
