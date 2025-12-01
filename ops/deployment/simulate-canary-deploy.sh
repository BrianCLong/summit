#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT=""
SERVICE=""
SLO_THRESHOLD=""
COST_THRESHOLD=""
VERIFY_ONLY=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --environment)
      ENVIRONMENT="$2"
      shift 2
      ;;
    --service)
      SERVICE="$2"
      shift 2
      ;;
    --slo-budget-threshold)
      SLO_THRESHOLD="$2"
      shift 2
      ;;
    --cost-threshold)
      COST_THRESHOLD="$2"
      shift 2
      ;;
    --verify-only)
      VERIFY_ONLY=true
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

if [[ -z "$ENVIRONMENT" || -z "$SERVICE" ]]; then
  echo "--environment and --service are required" >&2
  exit 2
fi

printf 'Simulating %s deployment checks for %s\n' "$ENVIRONMENT" "$SERVICE"

if [[ "$VERIFY_ONLY" == false ]]; then
  echo "🟢 Validating deployment event emitted"
  echo "kubectl get rollouts -n platform-$ENVIRONMENT $SERVICE"
fi

echo "📈 Checking golden signals from Prometheus"
METRIC_QUERY="1 - (sum(rate(http_requests_total{environment=\"$ENVIRONMENT\",service=\"$SERVICE\",status=~\"5..\"}[5m])) / sum(rate(http_requests_total{environment=\"$ENVIRONMENT\",service=\"$SERVICE\"}[5m])))"
SLO_LIMIT=${SLO_THRESHOLD:-0.001}
cat <<PROM
curl -s "https://prometheus.platform.$ENVIRONMENT/api/v1/query" \
  --data-urlencode "query=$METRIC_QUERY"
PROM

echo "Threshold: error budget must remain <= $SLO_LIMIT"

if [[ -n "$COST_THRESHOLD" ]]; then
  echo "💰 Evaluating cost guardrail (threshold ${COST_THRESHOLD})"
  cat <<CLOUD
python ops/observability-ci/scripts/check_cloud_costs.py \
  --budget-config ops/observability/cost-budget.yaml \
  --threshold $COST_THRESHOLD \
  --environment $ENVIRONMENT
CLOUD
fi

echo "🧪 Running synthetic checks"
cat <<SYNTH
npm run test:e2e -- --grep "$SERVICE canary"
SYNTH

echo "✅ Simulation complete"
