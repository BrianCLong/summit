
#!/usr/bin/env bash
set -euo pipefail
PROM=${1:-${PROM_URL:-http://prometheus.monitoring.svc:9090}}
# simple checks: error rate and p95 latency during canary window
err=$(curl -sG "$PROM/api/v1/query" --data-urlencode 'query=sum(rate(http_requests_total{status=~"5.."}[5m]))')
p95=$(curl -sG "$PROM/api/v1/query" --data-urlencode 'query=histogram_quantile(0.95, sum by(le) (rate(http_request_duration_seconds_bucket[5m]))) * 1000')

if [[ $(echo "$err" | jq -r .data.result[0].value[1]) == null ]]; then echo "WARN: no error metric"; fi
if [[ $(echo "$p95" | jq -r .data.result[0].value[1]) == null ]]; then echo "WARN: no p95 metric"; fi

echo "Canary analysis complete. See SLO gate for enforcement."
