#!/bin/bash
set -euo pipefail

# check_slo.sh - Checks Prometheus SLOs
# Usage: ./check_slo.sh <prometheus_url> <service_name>
# Env: PROM_URL, SERVICE_NAME

PROM_URL=${1:-${PROM_URL:-http://prometheus:9090}}
SERVICE_NAME=${2:-${SERVICE_NAME:-intelgraph}}

echo "Checking SLOs for $SERVICE_NAME at $PROM_URL..."

# Ensure dependencies
if ! command -v jq &> /dev/null; then
    echo "jq is required but not installed."
    exit 1
fi
if ! command -v bc &> /dev/null; then
    echo "bc is required but not installed."
    exit 1
fi

# P95 Latency Query
# Expecting < 1.5s
LATENCY_QUERY="histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{service=\"$SERVICE_NAME\"}[5m])) by (le))"
LATENCY_RES=$(curl -s -g "$PROM_URL/api/v1/query" --data-urlencode "query=$LATENCY_QUERY")
LATENCY_VAL=$(echo "$LATENCY_RES" | jq -r '.data.result[0].value[1] // 0')

echo "P95 Latency: $LATENCY_VAL s"

if (( $(echo "$LATENCY_VAL > 1.5" | bc -l) )); then
    echo "FAIL: P95 Latency > 1.5s"
    exit 1
fi

# Error Rate Query
# Expecting < 2% (0.02)
ERROR_QUERY="sum(rate(http_requests_total{service=\"$SERVICE_NAME\", status=~\"5..\"}[5m])) / sum(rate(http_requests_total{service=\"$SERVICE_NAME\"}[5m]))"
ERROR_RES=$(curl -s -g "$PROM_URL/api/v1/query" --data-urlencode "query=$ERROR_QUERY")
ERROR_VAL=$(echo "$ERROR_RES" | jq -r '.data.result[0].value[1] // 0')

echo "Error Rate: $ERROR_VAL"

if (( $(echo "$ERROR_VAL > 0.02" | bc -l) )); then
    echo "FAIL: Error Rate > 2%"
    exit 1
fi

echo "SLO Check Passed."
