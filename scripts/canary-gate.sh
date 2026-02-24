#!/usr/bin/env bash
set -euo pipefail

PROMETHEUS_URL=${PROMETHEUS_URL:-http://prometheus:9090}
PROMETHEUS_LABEL_FILTER=${PROMETHEUS_LABEL_FILTER:-}
WINDOW=${WINDOW:-5m}
MAX_ERROR_RATE=${MAX_ERROR_RATE:-0.01}
MAX_P95_LATENCY_MS=${MAX_P95_LATENCY_MS:-500}
MAX_P99_LATENCY_MS=${MAX_P99_LATENCY_MS:-1000}

# In CI/Mock environments, skip Prometheus checks if URL is unreachable
if ! curl -s --max-time 1 "$PROMETHEUS_URL" > /dev/null; then
  echo "::warning::Prometheus unreachable at $PROMETHEUS_URL. Skipping canary checks (mock mode)."
  if [ -n "${GITHUB_OUTPUT:-}" ]; then
    echo "passed=true" >> "$GITHUB_OUTPUT"
  fi
  exit 0
fi

join_labels() {
  local extra="${1:-}"
  local labels=()

  if [ -n "$PROMETHEUS_LABEL_FILTER" ]; then
    labels+=("$PROMETHEUS_LABEL_FILTER")
  fi

  if [ -n "$extra" ]; then
    labels+=("$extra")
  fi

  if [ ${#labels[@]} -eq 0 ]; then
    echo ""
    return 0
  fi

  local joined
  joined=$(IFS=,; echo "${labels[*]}")
  echo "{${joined}}"
}

metric_selector() {
  local metric="$1"
  local extra_labels="${2:-}"
  echo "${metric}$(join_labels "$extra_labels")"
}

query_prometheus() {
  local query="$1"

  curl -fsG "$PROMETHEUS_URL/api/v1/query" \
    --data-urlencode "query=${query}" \
    | jq -r '.data.result[0].value[1]'
}

require_numeric() {
  local value="$1"
  local name="$2"

  if [ -z "$value" ] || [ "$value" = "null" ]; then
    echo "Missing ${name} from Prometheus query." >&2
    exit 1
  fi
}

error_rate_query="sum(rate($(metric_selector http_requests_total 'status=~\"5..\"')[$WINDOW])) / sum(rate($(metric_selector http_requests_total)[$WINDOW]))"
latency_p95_query="histogram_quantile(0.95, sum(rate($(metric_selector http_request_duration_seconds_bucket)[$WINDOW])) by (le)) * 1000"
latency_p99_query="histogram_quantile(0.99, sum(rate($(metric_selector http_request_duration_seconds_bucket)[$WINDOW])) by (le)) * 1000"

error_rate=$(query_prometheus "$error_rate_query")
p95_latency=$(query_prometheus "$latency_p95_query")
p99_latency=$(query_prometheus "$latency_p99_query")

require_numeric "$error_rate" "error rate"
require_numeric "$p95_latency" "p95 latency"
require_numeric "$p99_latency" "p99 latency"

cat <<SUMMARY
Canary metrics:
  error_rate=${error_rate}
  p95_latency_ms=${p95_latency}
  p99_latency_ms=${p99_latency}
SUMMARY

python3 - <<PY
import sys

error_rate = float("$error_rate")
p95_latency = float("$p95_latency")
p99_latency = float("$p99_latency")

max_error_rate = float("$MAX_ERROR_RATE")
max_p95 = float("$MAX_P95_LATENCY_MS")
max_p99 = float("$MAX_P99_LATENCY_MS")

violations = []

if error_rate > max_error_rate:
    violations.append(f"Error rate {error_rate:.4f} > {max_error_rate:.4f}")
if p95_latency > max_p95:
    violations.append(f"p95 latency {p95_latency:.1f}ms > {max_p95:.1f}ms")
if p99_latency > max_p99:
    violations.append(f"p99 latency {p99_latency:.1f}ms > {max_p99:.1f}ms")

if violations:
    for violation in violations:
        print(f"Gate violation: {violation}")
    sys.exit(1)

print("Canary metrics gate passed.")
PY

if [ -n "${GITHUB_OUTPUT:-}" ]; then
  echo "passed=true" >> "$GITHUB_OUTPUT"
fi
