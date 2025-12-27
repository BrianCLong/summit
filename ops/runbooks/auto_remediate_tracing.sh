#!/usr/bin/env bash
set -euo pipefail

# Auto-remediation script for tracing and correlation ID gaps
# Requires kubectl context pointing at the target cluster and Prometheus API access.

PROM_URL=${PROM_URL:-"http://prometheus.monitoring:9090"}
NAMESPACE=${NAMESPACE:-"platform-prod"}
SERVICES=${SERVICES:-"intelgraph-api intelgraph-gateway intelgraph-ingest"}

query_prometheus() {
  local promql=$1
  curl -sG "${PROM_URL}/api/v1/query" --data-urlencode "query=${promql}" | jq -r '.data.result[0].value[1] // "0"'
}

restart_instrumentation() {
  local service=$1
  echo "[auto-remediation] Restarting instrumentation for ${service} in namespace ${NAMESPACE}" >&2
  kubectl rollout restart deploy/${service} -n "${NAMESPACE}"
}

for service in ${SERVICES}; do
  echo "[auto-remediation] Checking correlation coverage for ${service}"
  missing=$(query_prometheus "sum(rate(traces_spanmetrics_calls_total{service_name=\"${service}\",correlation_id=\"\"}[5m]))")
  if [[ ${missing} != "0" ]]; then
    echo "[auto-remediation] Detected correlation gaps (${missing}) for ${service}; enforcing restart"
    restart_instrumentation "${service}"
  fi
  err_ratio=$(query_prometheus "sum(rate(traces_spanmetrics_calls_total{service_name=\"${service}\",status_code!~\"OK|UNSET\"}[5m])) / sum(rate(traces_spanmetrics_calls_total{service_name=\"${service}\"}[5m]))")
  if [[ $(printf '%.0f' "$(echo "${err_ratio} > 0.05" | bc -l)") -eq 1 ]]; then
    echo "[auto-remediation] High trace error ratio (${err_ratio}) detected; refreshing otel-collector"
    kubectl rollout restart deploy/otel-collector -n monitoring
  fi

done

echo "[auto-remediation] Correlation + tracing sweep complete"
