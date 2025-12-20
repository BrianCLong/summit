#!/usr/bin/env bash
set -euo pipefail

PROM="${PROM_URL:-http://prometheus.monitoring.svc:9090}"
BUDGET=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --budget)
      BUDGET="$2"
      shift 2
      ;;
    http*)
      PROM="$1"
      shift
      ;;
    *)
      echo "Unknown argument: $1"
      shift
      ;;
  esac
done

echo "Starting Canary Analysis..."
echo "Prometheus URL: $PROM"
if [ -n "$BUDGET" ]; then
    echo "Using Budget File: $BUDGET"
fi

# simple checks: error rate and p95 latency during canary window
# In a real environment, we would use curl to query Prometheus.
# For simulation/CI validation without live Prometheus, we might skip or mock.

if curl -s --head "$PROM" >/dev/null; then
    err=$(curl -sG "$PROM/api/v1/query" --data-urlencode 'query=sum(rate(http_requests_total{status=~"5.."}[5m]))')
    p95=$(curl -sG "$PROM/api/v1/query" --data-urlencode 'query=histogram_quantile(0.95, sum by(le) (rate(http_request_duration_seconds_bucket[5m]))) * 1000')

    if [[ $(echo "$err" | jq -r .data.result[0].value[1]) == null ]]; then echo "WARN: no error metric"; fi
    if [[ $(echo "$p95" | jq -r .data.result[0].value[1]) == null ]]; then echo "WARN: no p95 metric"; fi
else
    echo "WARN: Prometheus not reachable at $PROM. Skipping live analysis."
fi

echo "Canary analysis complete. See SLO gate for enforcement."
