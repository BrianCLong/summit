# SLO Alerts + Trace Exemplars

**Purpose**: Configure alerts for SLO violations and enable trace exemplars for OPA decision latency monitoring.

**Status**: Implemented for October 2025 delivery

---

## Overview

This implementation provides:

1. **SLO Alert Rules** - Prometheus alerts for all 5 core SLO panels
2. **Alertmanager Configuration** - Routing to Slack, Teams, and PagerDuty
3. **Trace Exemplars** - Grafana panel integration for linking metrics to traces
4. **Test Script** - Automated test to verify alert firing and notifications

---

## Alert Rules

### Location

`observability/prometheus/alerts/slo-alerts.yml`

### Configured Alerts

| Alert                              | Metric                 | Threshold | For | Severity | Panel UID               |
| ---------------------------------- | ---------------------- | --------- | --- | -------- | ----------------------- |
| APILatencySLOViolation             | API p95 latency        | >1.5s     | 5m  | warning  | api-p95-latency-001     |
| **OPADecisionLatencySLOViolation** | OPA p95 latency        | >500ms    | 5m  | warning  | opa-p95-latency-002     |
| QueueLagSLOViolation               | Queue lag              | >10k msgs | 10m | critical | queue-lag-003           |
| IngestFailureRateSLOViolation      | Ingest failure rate    | >1%       | 5m  | critical | ingest-failure-rate-004 |
| GoldenFlowPassRateSLOViolation     | Golden flow pass rate  | <99%      | 5m  | critical | golden-flow-pass-005    |
| MultipleSLOViolations              | Multiple alerts firing | >=2       | 10m | critical | -                       |

### Alert Annotations

Each alert includes:

- **summary**: Brief description of the violation
- **description**: Detailed message with current value and SLO
- **dashboard_url**: Direct link to Grafana panel
- **runbook_url**: Link to troubleshooting documentation
- **panel_uid**: Panel UID for cross-referencing
- **exemplar_query** (OPA only): Query for trace exemplars

---

## Alertmanager Configuration

### Location

`observability/prometheus/alertmanager.yml`

### Notification Channels

#### 1. Default (Slack)

- **Channel**: `#alerts`
- **For**: All alerts
- **Format**: Slack blocks with links to dashboard and runbook

#### 2. Critical Alerts (PagerDuty + Slack)

- **Channels**: PagerDuty + `#critical-alerts`
- **For**: Alerts with `severity: critical`
- **Format**: PagerDuty incident + Slack notification with danger color

#### 3. Warning Alerts (Slack)

- **Channel**: `#slo-warnings`
- **For**: Alerts with `severity: warning`
- **Format**: Slack blocks with warning color

#### 4. OPA-Specific Alerts (Slack)

- **Channel**: `#opa-performance`
- **For**: `slo: opa_latency`
- **Format**: Includes exemplar query and trace linking instructions

### Routing Logic

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
```

### Inhibit Rules

- **Warning inhibited by Critical**: If critical alert fires for same SLO, suppress warning alert
- **Individual inhibited by Multiple**: If `MultipleSLOViolations` fires, suppress individual SLO alerts

---

## Trace Exemplars

### What are Trace Exemplars?

Trace exemplars link high-level metrics to individual traces, allowing you to:

- Click on a data point in a graph
- View the actual trace that caused that metric value
- Debug slow requests with full context

### OPA Panel Configuration

**Panel**: OPA Decision p95 Latency (UID: `opa-p95-latency-002`)

**Exemplar Configuration**:

```json
{
  "targets": [
    {
      "expr": "histogram_quantile(0.95, rate(opa_decision_duration_seconds_bucket[5m]))",
      "exemplar": true
    }
  ]
}
```

**Features**:

- ✅ Exemplars enabled on OPA latency metric
- ✅ Data points show as dots on the graph
- ✅ Clicking a dot opens trace in Tempo (or configured tracing backend)
- ✅ Trace ID embedded in metric labels

### Viewing Exemplars

1. Open Grafana dashboard: SLO Core Dashboards (with Trace Exemplars)
2. Navigate to "OPA Decision p95 Latency" panel
3. Look for dots on the graph line
4. Click a dot to view the associated trace
5. Trace opens in Tempo with full span details

---

## Testing

### Automated Test Script

**Location**: `scripts/test-alert-fire.sh`

**What it does**:

1. Checks Prometheus and Alertmanager health
2. Loads alert rules
3. Injects test metric to violate OPA latency SLO
4. Waits for alert to fire (5-6 minutes)
5. Verifies alert in Alertmanager
6. Sends test Slack notification (if configured)
7. Cleans up test metric

**Usage**:

```bash
# Basic test (no Slack)
./scripts/test-alert-fire.sh

# With Slack webhook
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
./scripts/test-alert-fire.sh
```

**Expected Output**:

```
========================================
SLO Alert Test
========================================
Prometheus: http://localhost:9090
Alertmanager: http://localhost:9093

[INFO] Step 1: Checking Prometheus connection...
[INFO] ✅ Prometheus is healthy

[INFO] Step 2: Checking Alertmanager connection...
[INFO] ✅ Alertmanager is healthy

[INFO] Step 3: Loading SLO alert rules...
[INFO] ✅ Prometheus config reloaded

[INFO] Step 4: Injecting test metric...
[INFO] ✅ Test metric injected (OPA p95 latency ~750ms, above 500ms SLO)

[INFO] Step 5: Waiting for alert to fire...
[INFO] ✅ Alert is FIRING!

[INFO] Step 6: Verifying alert in Alertmanager...
[INFO] ✅ Alert found in Alertmanager

[INFO] Step 7: Checking Slack notification...
[INFO] ✅ Test Slack notification sent

[INFO] Step 8: Cleaning up test metric...
[INFO] ✅ Test metric cleaned up

Acceptance criteria met:
  ✅ Firing test alert visible in Alertmanager
  ✅ Alert notification sent to Slack
```

---

## Configuration

### Environment Variables

```bash
# Prometheus
PROMETHEUS_URL=http://localhost:9090

# Alertmanager
ALERTMANAGER_URL=http://localhost:9093

# Slack webhooks
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# PagerDuty
PAGERDUTY_SERVICE_KEY=your-pagerduty-service-key

# Pushgateway (for testing)
PUSHGATEWAY_URL=http://localhost:9091
```

### Grafana Data Source

To enable trace exemplars, configure Grafana data sources:

1. **Prometheus** (for metrics)
   - URL: `http://prometheus:9090`
   - Enable: ✅ Exemplars

2. **Tempo** (for traces)
   - URL: `http://tempo:3200`
   - Link from: Prometheus

---

## Deployment

### 1. Deploy Alert Rules

```bash
# Copy alert rules to Prometheus
cp observability/prometheus/alerts/slo-alerts.yml /etc/prometheus/alerts/

# Update prometheus.yml to include rules
cat >> /etc/prometheus/prometheus.yml <<EOF
rule_files:
  - /etc/prometheus/alerts/slo-alerts.yml
EOF

# Reload Prometheus
curl -X POST http://localhost:9090/-/reload
```

### 2. Deploy Alertmanager Config

```bash
# Copy alertmanager config
cp observability/prometheus/alertmanager.yml /etc/alertmanager/

# Set environment variables
export SLACK_WEBHOOK_URL="your-webhook-url"
export PAGERDUTY_SERVICE_KEY="your-service-key"

# Reload Alertmanager
curl -X POST http://localhost:9093/-/reload
```

### 3. Import Grafana Dashboard

```bash
# Import dashboard with trace exemplars
curl -X POST http://localhost:3000/api/dashboards/db \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GRAFANA_API_KEY" \
  -d @observability/grafana/slo-core-dashboards-with-exemplars.json
```

---

## Acceptance Criteria

### ✅ Firing Test Alert Visible

- Alert appears in Alertmanager within 5-6 minutes of SLO violation
- Alert includes all required annotations (summary, description, URLs)
- Alert routed to correct receiver based on severity

### ✅ Slack/Teams Notification

- Notification received in configured channel
- Includes:
  - Alert name and severity
  - Summary and description
  - Link to Grafana dashboard (deep-linked to panel)
  - Link to runbook
  - Panel UID for reference

### ✅ Panel Shows Exemplars

- OPA p95 latency panel displays data points as dots
- Clicking dots opens trace in Tempo
- Trace ID linkable from metric to full span

---

## Troubleshooting

### Alert Not Firing

**Check Prometheus**:

```bash
# Check if metric exists
curl "http://localhost:9090/api/v1/query?query=opa_decision_duration_seconds_bucket"

# Check alert rule status
curl "http://localhost:9090/api/v1/rules" | jq '.data.groups[].rules[] | select(.name == "OPADecisionLatencySLOViolation")'
```

**Check Alertmanager**:

```bash
# Check alerts in Alertmanager
curl "http://localhost:9093/api/v2/alerts" | jq '.'
```

### Slack Notification Not Received

**Verify webhook**:

```bash
# Test webhook directly
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{"text": "Test message"}'
```

**Check Alertmanager logs**:

```bash
docker logs alertmanager
# or
journalctl -u alertmanager -f
```

### Trace Exemplars Not Showing

**Check Grafana data source**:

- Prometheus data source has "Exemplars" enabled
- Tempo data source configured and linked

**Check metric labels**:

```bash
# Verify trace_id label exists on metric
curl "http://localhost:9090/api/v1/query?query=opa_decision_duration_seconds_bucket" | jq '.data.result[].metric'
```

---

## Related Documentation

- [SLO Dashboards README](./SLO_DASHBOARDS_README.md)
- [Prometheus Alert Rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [Alertmanager Configuration](https://prometheus.io/docs/alerting/latest/configuration/)
- [Grafana Trace Exemplars](https://grafana.com/docs/grafana/latest/fundamentals/exemplars/)

---

**Contact**: sre@example.com
**Issue Tracking**: #10066
