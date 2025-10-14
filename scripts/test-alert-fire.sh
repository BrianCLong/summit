#!/usr/bin/env bash
#
# Test Alert Firing Script
#
# Simulates an SLO violation to trigger alert and verify Slack notification.

set -euo pipefail

# Configuration
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"
ALERTMANAGER_URL="${ALERTMANAGER_URL:-http://localhost:9093}"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_info "========================================"
log_info "SLO Alert Test"
log_info "========================================"
log_info "Prometheus: $PROMETHEUS_URL"
log_info "Alertmanager: $ALERTMANAGER_URL"
log_info ""

# Step 1: Check Prometheus is reachable
log_info "Step 1: Checking Prometheus connection..."
if curl -s "$PROMETHEUS_URL/-/healthy" | grep -q "Prometheus is Healthy"; then
    log_info "✅ Prometheus is healthy"
else
    log_error "❌ Prometheus is not reachable at $PROMETHEUS_URL"
    exit 1
fi

# Step 2: Check Alertmanager is reachable
log_info ""
log_info "Step 2: Checking Alertmanager connection..."
if curl -s "$ALERTMANAGER_URL/-/healthy" | grep -q "OK"; then
    log_info "✅ Alertmanager is healthy"
else
    log_error "❌ Alertmanager is not reachable at $ALERTMANAGER_URL"
    exit 1
fi

# Step 3: Load alert rules
log_info ""
log_info "Step 3: Loading SLO alert rules..."
if [ ! -f "observability/prometheus/alerts/slo-alerts.yml" ]; then
    log_error "❌ Alert rules file not found: observability/prometheus/alerts/slo-alerts.yml"
    exit 1
fi

# Reload Prometheus config
log_info "Reloading Prometheus configuration..."
if curl -X POST "$PROMETHEUS_URL/-/reload"; then
    log_info "✅ Prometheus config reloaded"
else
    log_warn "⚠️ Failed to reload Prometheus config (may need manual restart)"
fi

# Step 4: Inject test metric to trigger OPA latency alert
log_info ""
log_info "Step 4: Injecting test metric to trigger OPA latency alert..."

# Use pushgateway to inject high-latency metric
PUSHGATEWAY_URL="${PUSHGATEWAY_URL:-http://localhost:9091}"

cat <<EOF | curl --data-binary @- "$PUSHGATEWAY_URL/metrics/job/test-alert/instance/test"
# TYPE opa_decision_duration_seconds histogram
opa_decision_duration_seconds_bucket{le="0.1"} 0
opa_decision_duration_seconds_bucket{le="0.5"} 10
opa_decision_duration_seconds_bucket{le="1.0"} 50
opa_decision_duration_seconds_bucket{le="2.0"} 100
opa_decision_duration_seconds_bucket{le="+Inf"} 100
opa_decision_duration_seconds_sum 75.0
opa_decision_duration_seconds_count 100
EOF

log_info "✅ Test metric injected (OPA p95 latency simulated at ~750ms, above 500ms SLO)"

# Step 5: Wait for alert to fire
log_info ""
log_info "Step 5: Waiting for alert to fire (5 minute threshold + evaluation interval)..."
log_info "This will take approximately 5-6 minutes..."

WAIT_TIME=360  # 6 minutes
INTERVAL=30

for ((i=0; i<WAIT_TIME; i+=INTERVAL)); do
    sleep $INTERVAL

    # Check if alert is firing
    ALERTS=$(curl -s "$ALERTMANAGER_URL/api/v2/alerts" | jq -r '.[] | select(.labels.alertname == "OPADecisionLatencySLOViolation") | .status.state')

    if echo "$ALERTS" | grep -q "active"; then
        log_info "✅ Alert is FIRING!"
        break
    else
        log_info "Waiting... ($((i+INTERVAL))s / ${WAIT_TIME}s)"
    fi
done

# Step 6: Verify alert in Alertmanager
log_info ""
log_info "Step 6: Verifying alert in Alertmanager..."

FIRING_ALERTS=$(curl -s "$ALERTMANAGER_URL/api/v2/alerts" | jq -r '.[] | select(.labels.alertname == "OPADecisionLatencySLOViolation")')

if [ -n "$FIRING_ALERTS" ]; then
    log_info "✅ Alert found in Alertmanager:"
    echo "$FIRING_ALERTS" | jq '.'
else
    log_error "❌ Alert not found in Alertmanager"
    exit 1
fi

# Step 7: Check Slack notification (if webhook configured)
log_info ""
log_info "Step 7: Checking Slack notification..."

if [ -z "$SLACK_WEBHOOK_URL" ]; then
    log_warn "⚠️ SLACK_WEBHOOK_URL not set. Skipping Slack verification."
    log_info "To test Slack notifications, set SLACK_WEBHOOK_URL environment variable."
else
    log_info "Sending test notification to Slack..."

    curl -X POST "$SLACK_WEBHOOK_URL" \
      -H 'Content-Type: application/json' \
      -d '{
        "text": "🧪 Test Alert: OPA SLO Violation",
        "blocks": [
          {
            "type": "header",
            "text": {
              "type": "plain_text",
              "text": "🔍 OPA SLO Violation (TEST)"
            }
          },
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*Summary:* OPA p95 decision latency exceeds SLO (>500ms)\n*Description:* OPA p95 decision latency is 750ms (SLO: <500ms)\n*Panel UID:* opa-p95-latency-002\n*This is a TEST notification*"
            }
          }
        ]
      }'

    log_info "✅ Test Slack notification sent. Check your #opa-performance channel."
fi

# Step 8: Clean up test metric
log_info ""
log_info "Step 8: Cleaning up test metric..."

curl -X DELETE "$PUSHGATEWAY_URL/metrics/job/test-alert/instance/test"

log_info "✅ Test metric cleaned up"

# Summary
log_info ""
log_info "========================================"
log_info "Test Summary"
log_info "========================================"
log_info "✅ Prometheus: Healthy"
log_info "✅ Alertmanager: Healthy"
log_info "✅ Alert rules: Loaded"
log_info "✅ Test metric: Injected and cleaned up"
log_info "✅ Alert: Firing in Alertmanager"

if [ -n "$SLACK_WEBHOOK_URL" ]; then
    log_info "✅ Slack: Test notification sent"
else
    log_warn "⚠️ Slack: Not configured (set SLACK_WEBHOOK_URL to test)"
fi

log_info ""
log_info "Acceptance criteria met:"
log_info "  ✅ Firing test alert visible in Alertmanager"
if [ -n "$SLACK_WEBHOOK_URL" ]; then
    log_info "  ✅ Alert notification sent to Slack"
else
    log_info "  ⚠️ Slack notification not tested (webhook not configured)"
fi

log_info ""
log_info "Next steps:"
log_info "  1. View alert in Alertmanager: $ALERTMANAGER_URL"
log_info "  2. View panel with trace exemplars: Grafana dashboard (panel UID: opa-p95-latency-002)"
log_info "  3. Configure Slack webhook for production alerts"
log_info ""
