# scripts/health-gate.sh
set -euo pipefail
MIN=${1:-0.85}
score=$(curl -sf $EVAL_GATE_URL | jq -r .score)
lat=$(curl -sf $SLO_API/latency | jq -r .p95)
err=$(curl -sf $SLO_API/error_rate | jq -r .value)
if awk "BEGIN {exit !($score >= $MIN && $lat < 300 && $err < 0.01)}"; then
  echo "HEALTH OK: score=$score p95=${lat}ms err=${err}"
else
  echo "HEALTH FAIL: score=$score p95=${lat}ms err=${err}" >&2
  exit 1
fi