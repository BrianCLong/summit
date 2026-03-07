# Grafana Dashboard Definitions

**Document ID:** GA-E6-DASH-001
**Version:** 1.0
**Date:** 2025-12-27
**Status:** Active

## Overview

This directory contains Grafana dashboard definitions for Summit platform operations and self-service incident diagnosis.

## Dashboards

### 1. Summit Operations - Self-Service Diagnostics (`operator-dashboard.json`)

**Purpose**: Primary operator dashboard for incident diagnosis and system monitoring

**Panels**:

1. **Request Rate by Endpoint**
   - Metric: `http_requests_total` rate by method and path
   - Visualization: Time series
   - Purpose: Track traffic patterns and identify hot endpoints

2. **Error Rate by Endpoint (5xx)**
   - Metric: 5xx error ratio by endpoint
   - Visualization: Time series with thresholds (yellow >1%, red >5%)
   - Purpose: Identify failing endpoints quickly

3. **Request Latency by Endpoint (p50, p95, p99)**
   - Metric: Request duration percentiles
   - Visualization: Time series
   - Purpose: Performance monitoring and SLA tracking

4. **Request Flow by Correlation ID**
   - Data source: Loki logs
   - Filter: By correlation ID (template variable)
   - Purpose: End-to-end request tracing for incident diagnosis

5. **AI Copilot Request Rate by Operation**
   - Metric: `ai_copilot_requests_total` by operation
   - Visualization: Stacked time series
   - Purpose: Monitor AI/Copilot usage patterns

6. **AI Copilot Latency (SLO)**
   - Metric: AI Copilot latency p95 and p99
   - Thresholds: p95 < 5s (yellow), p99 < 8s (red)
   - Purpose: SLO monitoring for AI operations

7. **Governance Verdict Distribution**
   - Metric: `governance_verdict_total` by verdict type
   - Visualization: Donut chart
   - Purpose: Track governance decision patterns

8. **API Availability (SLO)**
   - Metric: Non-5xx request ratio
   - Threshold: 99% SLO
   - Purpose: Availability monitoring

9. **AI Copilot Success Rate (SLO)**
   - Metric: Non-error AI request ratio
   - Threshold: 99% SLO
   - Purpose: AI reliability monitoring

10. **Recent Errors and Warnings**
    - Data source: Loki logs (level >= 50)
    - Visualization: Log panel
    - Purpose: Real-time error monitoring

## Template Variables

- **`correlation_id`**: Text box for entering correlation ID to trace specific requests
- **`DS_PROMETHEUS`**: Prometheus datasource selector
- **`DS_LOKI`**: Loki datasource selector

## Installation

### Using Helm

Add to `helm/monitoring/values.yaml`:

```yaml
grafana:
  dashboards:
    intelgraph:
      summit-ops-diagnostics.json: |
        <paste content of operator-dashboard.json>
```

### Manual Import

1. Log in to Grafana
2. Navigate to Dashboards > Import
3. Upload `operator-dashboard.json`
4. Select Prometheus and Loki datasources
5. Click Import

### Via API

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GRAFANA_API_KEY" \
  -d @operator-dashboard.json \
  http://grafana:3000/api/dashboards/db
```

## Usage

### Self-Service Incident Diagnosis

1. **Identify Issue**: Check error rate and latency panels
2. **Find Correlation ID**:
   - From error logs panel
   - From user-reported error response header
   - From support ticket
3. **Trace Request**: Enter correlation ID in template variable
4. **Analyze Flow**: Review "Request Flow by Correlation ID" panel
5. **Root Cause**: Examine error details and service interactions

### Performance Analysis

1. Monitor latency percentiles across endpoints
2. Identify slow operations (p95, p99)
3. Correlate with request rates for load analysis
4. Check AI Copilot latency against SLOs

### Capacity Planning

1. Review request rate trends
2. Identify growing endpoints
3. Analyze governance verdict distribution
4. Track AI Copilot usage patterns

## Metrics Reference

### Required Prometheus Metrics

```promql
# Core API metrics
http_requests_total{service="summit-api", method, path, status}
http_request_duration_seconds_bucket{service="summit-api", path, le}

# AI Copilot metrics
ai_copilot_requests_total{operation, status}
ai_copilot_latency_seconds_bucket{le}

# Governance metrics
governance_verdict_total{verdict}
```

### Required Loki Labels

```logql
{service="summit-api"}
  | json
  | correlationId, level, message, error
```

## Alerting Integration

This dashboard integrates with existing Prometheus alerting rules:

- `HighErrorRate`: Error ratio > 5% for 10 minutes
- `HighLatency`: p95 latency > threshold for 10 minutes
- `AICopilotSLOViolation`: AI p95 > 5s or p99 > 8s for 5 minutes
- `GovernanceAnomalies`: Unusual verdict distribution

## SLO Tracking

The dashboard tracks these Service Level Objectives:

| Service                  | Metric           | SLO  | Panel   |
| ------------------------ | ---------------- | ---- | ------- |
| API Availability         | Non-5xx ratio    | 99%  | Panel 8 |
| AI Copilot Success       | Non-error ratio  | 99%  | Panel 9 |
| AI Copilot Latency (p95) | Request duration | < 5s | Panel 6 |
| AI Copilot Latency (p99) | Request duration | < 8s | Panel 6 |

## Customization

### Adding Custom Panels

1. Edit the dashboard JSON
2. Add new panel object to `panels` array
3. Increment panel `id` values
4. Adjust `gridPos` for layout

### Adding Variables

1. Add to `templating.list` array
2. Define query or datasource type
3. Reference in panel queries as `$variable_name`

### Changing Thresholds

Edit `fieldConfig.defaults.thresholds.steps` in panel definition:

```json
"thresholds": {
  "mode": "absolute",
  "steps": [
    {"color": "green", "value": null},
    {"color": "yellow", "value": 0.01},
    {"color": "red", "value": 0.05}
  ]
}
```

## Troubleshooting

### No Data Displayed

**Issue**: Panels show "No data"
**Cause**: Missing metrics or incorrect datasource
**Solution**:

- Verify Prometheus/Loki datasources configured
- Check metric names match instrumentation
- Verify time range contains data

### Correlation ID Search Returns Nothing

**Issue**: Logs panel empty when filtering by correlation ID
**Cause**: Logs not indexed or correlation ID not in logs
**Solution**:

- Verify structured logging enabled
- Check correlation middleware is active
- Confirm correlation ID is valid UUID

### Performance Issues

**Issue**: Dashboard slow to load
**Cause**: Too many high-cardinality queries
**Solution**:

- Increase refresh interval
- Reduce time range
- Add additional label filters
- Increase Prometheus/Loki resources

## Compliance Mapping

This dashboard supports:

- **SOC 2 CC7.2**: Real-time system monitoring
- **SOC 2 CC7.3**: Automated incident identification via metrics
- **SOC 2 CC7.4**: Incident response via correlation ID tracing
- **SOC 2 A1.2**: Recovery monitoring via availability metrics

## Maintenance

### Update Schedule

- Review monthly for metric changes
- Update quarterly for new features
- Validate after major platform releases
- Refresh SLO thresholds as needed

### Version Control

Dashboard JSON is stored in:

- **Evidence**: `/audit/ga-evidence/ops/dashboards/`
- **Helm**: `/helm/monitoring/values.yaml`
- **Git**: Track changes in version control

## Support

- **Grafana Docs**: https://grafana.com/docs/
- **PromQL Guide**: https://prometheus.io/docs/prometheus/latest/querying/basics/
- **LogQL Guide**: https://grafana.com/docs/loki/latest/logql/
- **Slack**: #platform-observability
- **On-call**: PagerDuty - Platform Ops rotation

---

**Document History:**

- 2025-12-27: Initial version (v1.0) - GA hardening initiative
