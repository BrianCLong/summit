# Synthetics & Dashboards Runbook

**Purpose**: Operational guide for k6 synthetics monitoring and Grafana SLO dashboards

**Owner**: SRE + Observability Team
**Status**: Production (October 2025 delivery)

---

## Overview

This runbook covers:
- k6 synthetics test suite for golden flow validation
- Grafana SLO dashboards with panel UIDs
- Alert configuration and response procedures
- Trace exemplars for debugging

---

## k6 Synthetics Suite

### Golden Flow Test

**Location**: `tests/k6/golden-flow.k6.js`

**Workflow**: `.github/workflows/k6-golden-flow.yml`

**User Journeys Tested**:
1. **Login** - User authentication (SLO: <2s)
2. **Query** - NL→Cypher graph query (SLO: <1.5s)
3. **Render** - Graph visualization (SLO: <3s)
4. **Export** - Data export with provenance (SLO: <5s)

### Test Configuration

```javascript
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp-up
    { duration: '1m', target: 10 },   // Steady state
    { duration: '30s', target: 0 },   // Ramp-down
  ],
  thresholds: {
    'http_req_duration{type:api}': ['p(95)<1500'],
    'login_duration': ['p(95)<2000'],
    'query_duration': ['p(95)<1500'],
    'graph_render_duration': ['p(95)<3000'],
    'export_duration': ['p(95)<5000'],
    'golden_flow_success': ['rate>0.99'],
    'http_req_failed': ['rate<0.01'],
  },
};
```

### Custom Metrics

| Metric | Type | Description | SLO |
|--------|------|-------------|-----|
| `login_duration` | Trend | Login latency | p95 <2s |
| `query_duration` | Trend | Query execution latency | p95 <1.5s |
| `graph_render_duration` | Trend | Visualization rendering | p95 <3s |
| `export_duration` | Trend | Export with provenance | p95 <5s |
| `golden_flow_success` | Rate | End-to-end success rate | >99% |

### Execution Schedule

**PR Trigger**: On every pull request (blocking)
- Runs synthetics test
- Comments results on PR
- Fails PR if thresholds breached

**Nightly Run**: 2 AM UTC
- Full test suite with extended duration
- Baseline metrics storage (90 days)
- Slack alerts on threshold breach
- Trend analysis for degradation detection

**Manual Dispatch**: On-demand via GitHub Actions UI

### Running Locally

```bash
# Install k6
brew install k6

# Set environment variables
export API_URL="http://localhost:3000"
export TEST_USER_EMAIL="test@example.com"
export TEST_USER_PASSWORD="$TEST_PASSWORD"  # Set via environment or secrets

# Run test
k6 run tests/k6/golden-flow.k6.js

# Run with custom VUs and duration
k6 run --vus 20 --duration 2m tests/k6/golden-flow.k6.js

# Generate HTML report
k6 run --out json=results.json tests/k6/golden-flow.k6.js
k6 report results.json --output report.html
```

### Interpreting Results

**Successful Run**:
```
     ✓ login successful
     ✓ login latency acceptable
     ✓ query returned results
     ✓ query latency acceptable
     ✓ graph rendered
     ✓ render latency acceptable
     ✓ export succeeded
     ✓ export latency acceptable
     ✓ provenance attached

     checks.........................: 100.00% ✓ 900  ✗ 0
     golden_flow_success............: 100.00% ✓ 100  ✗ 0
     http_req_duration (p95)........: 1.2s
     login_duration (p95)...........: 1.5s
     query_duration (p95)...........: 1.1s
     graph_render_duration (p95)....: 2.5s
     export_duration (p95)..........: 4.2s
```

**Failed Run (Threshold Breach)**:
```
     ✗ query latency acceptable
      ↳  95% — ✓ 85 / ✗ 15

     checks.........................: 94.44% ✓ 850  ✗ 50
     golden_flow_success............: 95.00% ✓ 95   ✗ 5
     query_duration (p95)...........: 2.3s    ← BREACH (SLO: <1.5s)
```

**Action**: Investigate query performance, check database indexes, review recent schema changes

---

## Grafana SLO Dashboards

### Core Dashboard

**Location**: `observability/grafana/slo-core-dashboards.json`

**Dashboard URL**: `https://grafana.example.com/d/slo-core/slo-core-dashboards`

**Refresh Rate**: 30 seconds (auto-refresh)

### Panel Reference

| Panel UID | Title | Metric | SLO | Threshold |
|-----------|-------|--------|-----|-----------|
| `api-p95-latency-001` | API p95 Latency | `http_request_duration_seconds` | <1.5s | Yellow: 1.2s, Red: 1.5s |
| `opa-p95-latency-002` | OPA Decision p95 Latency | `opa_decision_duration_seconds` | <500ms | Yellow: 400ms, Red: 500ms |
| `queue-lag-003` | Queue Lag | `kafka_consumer_lag_total` | <10k | Yellow: 8k, Red: 10k |
| `ingest-failure-rate-004` | Ingest Failure Rate | `ingest_failures_total / ingest_attempts_total` | <1% | Yellow: 0.8%, Red: 1% |
| `golden-flow-pass-005` | Golden Flow Pass % | `golden_flow_success_total / golden_flow_total` | >99% | Red: <99%, Green: ≥99% |

### Accessing Panels

**Direct Panel Link**:
```
https://grafana.example.com/d/slo-core/slo-core-dashboards?viewPanel=<panel-uid>
```

**Example**:
```bash
# Open OPA latency panel
open "https://grafana.example.com/d/slo-core/slo-core-dashboards?viewPanel=opa-p95-latency-002"
```

### Dashboard Import

**Via UI**:
1. Navigate to Grafana → Dashboards → Import
2. Upload `observability/grafana/slo-core-dashboards.json`
3. Select Prometheus data source
4. Click Import

**Via API**:
```bash
export GRAFANA_API_KEY="your-api-key"
export GRAFANA_URL="https://grafana.example.com"

curl -X POST "$GRAFANA_URL/api/dashboards/db" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GRAFANA_API_KEY" \
  -d @observability/grafana/slo-core-dashboards.json
```

**Via Provisioning**:
```yaml
# /etc/grafana/provisioning/dashboards/slo-dashboards.yml
apiVersion: 1
providers:
  - name: 'SLO Dashboards'
    folder: 'Observability'
    type: file
    options:
      path: /var/lib/grafana/dashboards/slo
```

---

## Trace Exemplars

### What are Trace Exemplars?

Trace exemplars link metrics to individual traces, enabling:
- Click on any data point in a graph
- View the exact trace that contributed to that metric
- Debug slow requests with full distributed trace context

### Enabled Panels

**OPA Decision p95 Latency** (`opa-p95-latency-002`)
- Exemplars: ✅ Enabled
- Trace backend: Tempo
- Query: `histogram_quantile(0.95, rate(opa_decision_duration_seconds_bucket[5m]))`

### Using Exemplars

1. **View Dashboard**: Open SLO Core Dashboards (with Trace Exemplars)
2. **Identify Spike**: Look for latency spikes on OPA panel
3. **Click Data Point**: Click the dot on the graph line
4. **View Trace**: Trace opens in Tempo with full span details
5. **Analyze**: Review span durations, tags, logs for root cause

**Example Trace Analysis**:
```
Trace ID: a1b2c3d4e5f6g7h8
Total Duration: 750ms (above 500ms SLO)

Spans:
  ├─ http.request (10ms)
  ├─ opa.policy_evaluation (720ms) ← SLOW
  │   ├─ opa.compile_query (50ms)
  │   ├─ opa.execute_query (650ms) ← ROOT CAUSE
  │   └─ opa.format_result (20ms)
  └─ http.response (20ms)

Root Cause: opa.execute_query taking 650ms
Action: Optimize policy loops, add caching
```

### Configuring Exemplars

**Prometheus Data Source**:
```yaml
datasources:
  - name: Prometheus
    type: prometheus
    url: http://prometheus:9090
    jsonData:
      exemplarTraceIdDestinations:
        - name: trace_id
          datasourceUid: tempo-uid
```

**Tempo Data Source**:
```yaml
datasources:
  - name: Tempo
    type: tempo
    url: http://tempo:3200
    uid: tempo-uid
```

**Metric with Exemplar**:
```promql
# Metric must have trace_id label
opa_decision_duration_seconds_bucket{trace_id="a1b2c3d4e5f6g7h8"}
```

---

## Alert Configuration

### Alert Rules

**Location**: `observability/prometheus/alerts/slo-alerts.yml`

**Alerts Configured**:

1. **APILatencySLOViolation**
   - Condition: API p95 >1.5s for 5m
   - Severity: warning
   - Receiver: #slo-warnings

2. **OPADecisionLatencySLOViolation**
   - Condition: OPA p95 >500ms for 5m
   - Severity: warning
   - Receiver: #opa-performance (includes exemplar query)

3. **QueueLagSLOViolation**
   - Condition: Queue lag >10k for 10m
   - Severity: critical
   - Receiver: PagerDuty + #critical-alerts

4. **IngestFailureRateSLOViolation**
   - Condition: Ingest failure >1% for 5m
   - Severity: critical
   - Receiver: PagerDuty + #critical-alerts

5. **GoldenFlowPassRateSLOViolation**
   - Condition: Golden flow pass <99% for 5m
   - Severity: critical
   - Receiver: PagerDuty + #critical-alerts

6. **MultipleSLOViolations**
   - Condition: ≥2 SLO alerts firing for 10m
   - Severity: critical
   - Receiver: PagerDuty + #critical-alerts

### Alert Routing

**Alertmanager Config**: `observability/prometheus/alertmanager.yml`

```yaml
route:
  group_by: ['alertname', 'severity', 'slo']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'critical-alerts'
    - match:
        severity: warning
      receiver: 'warning-alerts'
    - match:
        slo: opa_latency
      receiver: 'opa-slo-alerts'

receivers:
  - name: 'default'
    slack_configs:
      - channel: '#alerts'
        send_resolved: true

  - name: 'critical-alerts'
    pagerduty_configs:
      - service_key: '<pagerduty-key>'
    slack_configs:
      - channel: '#critical-alerts'
        color: 'danger'

  - name: 'warning-alerts'
    slack_configs:
      - channel: '#slo-warnings'
        color: 'warning'

  - name: 'opa-slo-alerts'
    slack_configs:
      - channel: '#opa-performance'
        text: |
          Alert: {{ .GroupLabels.alertname }}
          Description: {{ .CommonAnnotations.description }}
          Exemplar Query: {{ .CommonAnnotations.exemplar_query }}
          Dashboard: {{ .CommonAnnotations.dashboard_url }}
```

### Alert Response Procedures

#### Critical Alert: QueueLagSLOViolation

**Received**: PagerDuty page + Slack #critical-alerts

**Triage** (within 5 minutes):
```bash
# 1. Check current lag
curl "http://prometheus:9090/api/v1/query?query=kafka_consumer_lag_total" | jq '.data.result[0].value[1]'

# 2. Check consumer status
kubectl get pods -l app=kafka-consumer -o wide

# 3. Check producer rate
curl "http://prometheus:9090/api/v1/query?query=rate(kafka_producer_messages_total[5m])"
```

**Common Causes & Fixes**:
- **Consumer crash**: Restart consumer pods
- **High producer rate**: Scale consumers horizontally
- **Slow processing**: Identify slow handlers, optimize or scale
- **Network partition**: Check connectivity between consumer and Kafka

**Escalation**: If lag >50k or growing >10k/min, escalate to Platform Team

#### Warning Alert: OPADecisionLatencySLOViolation

**Received**: Slack #opa-performance

**Triage** (within 15 minutes):
```bash
# 1. Open dashboard with exemplars
open "https://grafana.example.com/d/slo-core/slo-core-dashboards?viewPanel=opa-p95-latency-002"

# 2. Click on slow data points to view traces

# 3. Check OPA CPU/memory
kubectl top pods -l app=opa

# 4. Check recent policy changes
git log policies/ --oneline -5
```

**Common Causes & Fixes**:
- **New policy**: Review recent policy commits, optimize loops
- **High load**: Scale OPA horizontally (increase replicas)
- **Large input**: Reduce input size, add pagination
- **Cache miss**: Verify OPA cache is enabled and warm

**Escalation**: If p95 >1s, escalate to Policy Engineering

---

## Common Scenarios

### Scenario 1: k6 Test Fails on PR

**Symptom**: PR check fails with "k6 thresholds breached"

**Diagnosis**:
```bash
# View k6 run logs
gh run list --workflow=k6-golden-flow.yml --limit 1
gh run view <run-id> --log | grep "threshold"

# Download HTML report
gh run download <run-id> --name k6-report
open k6-report/report.html
```

**Resolution**:
1. Identify which threshold failed (login, query, render, export)
2. Review PR changes for performance impact
3. Run test locally to reproduce:
   ```bash
   k6 run --vus 10 --duration 1m tests/k6/golden-flow.k6.js
   ```
4. Fix performance issue or update threshold if justified
5. Re-run PR checks

### Scenario 2: Nightly Synthetics Alert

**Symptom**: Slack #alerts shows "Golden flow success rate <99%"

**Diagnosis**:
```bash
# Check recent nightly runs
gh run list --workflow=k6-golden-flow.yml --event=schedule --limit 5

# View detailed results
gh run view <run-id> --log

# Download baseline metrics
gh run download <run-id> --name baseline-metrics
cat baseline-metrics/baseline.json | jq '.metrics.golden_flow_success'
```

**Resolution**:
1. Identify failure pattern (specific step, time window, intermittent)
2. Check for infrastructure issues (DB slow, network partition)
3. Review recent deployments (correlate with failure start time)
4. If transient: Monitor next run
5. If persistent: Create incident, page on-call SRE

### Scenario 3: Dashboard Panel Shows No Data

**Symptom**: Grafana panel displays "No data"

**Diagnosis**:
```bash
# Check Prometheus scrape targets
curl "http://prometheus:9090/api/v1/targets" | jq '.data.activeTargets[] | select(.labels.job == "intelgraph-api")'

# Check metric exists
curl "http://prometheus:9090/api/v1/query?query=http_request_duration_seconds_bucket" | jq '.data.result | length'

# Check Grafana data source
curl -H "Authorization: Bearer $GRAFANA_API_KEY" \
  "https://grafana.example.com/api/datasources" | jq '.[] | select(.type == "prometheus")'
```

**Resolution**:
1. **No scrape target**: Check Prometheus config, ensure service discovery
2. **Metric not found**: Verify app is exporting metrics, check `/metrics` endpoint
3. **Data source down**: Verify Prometheus is reachable from Grafana
4. **Query error**: Test query in Prometheus UI first, then fix in Grafana

### Scenario 4: Trace Exemplars Not Showing

**Symptom**: No dots on OPA latency panel

**Diagnosis**:
```bash
# Check if metric has trace_id label
curl "http://prometheus:9090/api/v1/query?query=opa_decision_duration_seconds_bucket" | \
  jq '.data.result[0].metric | has("trace_id")'

# Check Tempo is reachable
curl "http://tempo:3200/api/search?tags=service.name=opa" | jq '.'

# Check Grafana data source linking
curl -H "Authorization: Bearer $GRAFANA_API_KEY" \
  "https://grafana.example.com/api/datasources" | \
  jq '.[] | select(.type == "prometheus") | .jsonData.exemplarTraceIdDestinations'
```

**Resolution**:
1. **No trace_id**: Add tracing instrumentation to OPA service
2. **Tempo unreachable**: Check Tempo service status, network connectivity
3. **Data source not linked**: Configure exemplar trace ID destinations in Grafana
4. **Exemplar disabled**: Enable in panel settings: `targets[].exemplar: true`

---

## Testing Alerts

### Test Alert Fire

**Script**: `scripts/test-alert-fire.sh`

**Usage**:
```bash
# Set environment variables
export PROMETHEUS_URL="http://localhost:9090"
export ALERTMANAGER_URL="http://localhost:9093"
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# Run test
./scripts/test-alert-fire.sh
```

**What it does**:
1. Checks Prometheus and Alertmanager health
2. Loads alert rules
3. Injects test metric (OPA p95 ~750ms, above 500ms SLO)
4. Waits for alert to fire (5-6 minutes)
5. Verifies alert in Alertmanager
6. Sends test Slack notification
7. Cleans up test metric

**Expected Output**:
```
✅ Prometheus is healthy
✅ Alertmanager is healthy
✅ Prometheus config reloaded
✅ Test metric injected (OPA p95 latency ~750ms, above 500ms SLO)
✅ Alert is FIRING!
✅ Alert found in Alertmanager
✅ Test Slack notification sent
✅ Test metric cleaned up

Acceptance criteria met:
  ✅ Firing test alert visible in Alertmanager
  ✅ Alert notification sent to Slack
```

---

## Maintenance

### Updating SLO Thresholds

**Grafana Dashboard**:
1. Edit panel → Field → Thresholds
2. Update values (e.g., change red from 1.5s to 2s)
3. Export dashboard JSON
4. Commit to `observability/grafana/slo-core-dashboards.json`

**k6 Tests**:
1. Edit `tests/k6/golden-flow.k6.js`
2. Update `options.thresholds`
3. Test locally: `k6 run tests/k6/golden-flow.k6.js`
4. Commit changes

**Prometheus Alerts**:
1. Edit `observability/prometheus/alerts/slo-alerts.yml`
2. Update `expr` threshold (e.g., `> 0.5` to `> 1.0`)
3. Reload Prometheus: `curl -X POST http://localhost:9090/-/reload`
4. Commit changes

### Adding New Panels

**1. Design Panel**:
```json
{
  "id": 6,
  "title": "Database Query p95 Latency",
  "type": "timeseries",
  "uid": "db-p95-latency-006",
  "gridPos": { "h": 8, "w": 12, "x": 0, "y": 24 },
  "targets": [
    {
      "expr": "histogram_quantile(0.95, rate(db_query_duration_seconds_bucket[5m]))",
      "legendFormat": "p95 latency",
      "refId": "A"
    }
  ],
  "fieldConfig": {
    "defaults": {
      "unit": "s",
      "thresholds": {
        "mode": "absolute",
        "steps": [
          { "value": null, "color": "green" },
          { "value": 0.8, "color": "yellow" },
          { "value": 1.0, "color": "red" }
        ]
      }
    }
  }
}
```

**2. Document Panel UID**:
Update `observability/grafana/SLO_DASHBOARDS_README.md`:
```markdown
| db-p95-latency-006 | Database Query p95 Latency | p95 query execution time | <1s | Critical |
```

**3. Create Alert**:
Add to `observability/prometheus/alerts/slo-alerts.yml`:
```yaml
- alert: DatabaseQueryLatencySLOViolation
  expr: histogram_quantile(0.95, rate(db_query_duration_seconds_bucket[5m])) > 1.0
  for: 5m
  labels:
    severity: warning
    slo: db_latency
    panel_uid: db-p95-latency-006
  annotations:
    summary: "Database p95 query latency exceeds SLO (>1s)"
    dashboard_url: "https://grafana.example.com/d/slo-core/slo-core-dashboards?viewPanel=db-p95-latency-006"
```

**4. Add to k6 Test**:
```javascript
const dbQueryDuration = new Trend('db_query_duration', true);

export const options = {
  thresholds: {
    'db_query_duration': ['p(95)<1000'],
  },
};
```

---

## Metrics

**Track in Grafana dashboard**: "Synthetics & Observability Health"

- **k6 test success rate**: >99%
- **Alert resolution time**: p95 <30m
- **Dashboard availability**: >99.9%
- **Trace exemplar hit rate**: >80%

**Queries**:
```promql
# k6 test success rate
rate(k6_test_success_total[1h]) / rate(k6_test_total[1h])

# Alert resolution time (from firing to resolved)
histogram_quantile(0.95, rate(alert_resolution_duration_seconds_bucket[1h]))

# Trace exemplar hit rate (clicks leading to trace)
rate(trace_exemplar_click_total[1h]) / rate(trace_exemplar_display_total[1h])
```

---

## Contacts

- **SRE Team**: sre@example.com, Slack: #sre
- **Observability Team**: observability@example.com, Slack: #observability
- **On-Call**: PagerDuty: `pd schedule show sre-oncall`
- **k6/Synthetics**: Slack: #synthetics

---

## Related Documentation

- [k6 Golden Flow Test](../../tests/k6/golden-flow.k6.js)
- [SLO Dashboards README](../ALERTS_TRACE_EXEMPLARS_README.md)
- [Alert Configuration](../../observability/prometheus/alerts/slo-alerts.yml)
- [Alertmanager Config](../../observability/prometheus/alertmanager.yml)
- [Trace Exemplars Guide](https://grafana.com/docs/grafana/latest/fundamentals/exemplars/)

---

**Last Updated**: October 4, 2025
**Version**: 1.0
**Issue**: #10074
