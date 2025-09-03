#!/bin/bash
# scripts/ops/check-grafana-slo.sh
# Checks Grafana SLOs via API and reports status.

set -euo pipefail

GRAFANA_URL="${GRAFANA_URL:-https://grafana.dev.intelgraph.local}"
GRAFANA_API_TOKEN="${GRAFANA_API_TOKEN:?GRAFANA_API_TOKEN not set}"

log() { printf "\033[1;34m[SLO Check]\033[0m %s\n" "$*"; }
warn(){ printf "\033[1;33m[WARN]\033[0m %s\n" "$*"; }
err() { printf "\033[1;31m[ERROR]\033[0m %s\n" "$*"; exit 1; }

check_slo() {
  local dashboard_uid="$1"
  local panel_id="$2"
  local threshold="$3"
  local metric_name="$4"
  local expected_status="$5" # e.g., "ok", "warning", "critical"

  log "Checking SLO for $metric_name (Dashboard: $dashboard_uid, Panel: $panel_id)"

  # Grafana API endpoint for panel data
  # This is a simplified example. Real Grafana API queries are more complex.
  # You might need to query Prometheus directly or use a more specific Grafana API.
  local query_url="${GRAFANA_URL}/api/datasources/proxy/1/api/v1/query?query=${metric_name}" # Assuming datasource ID 1

  local response
  response=$(curl -s -H "Authorization: Bearer $GRAFANA_API_TOKEN" "$query_url")

  local value
  value=$(echo "$response" | jq -r '.data.result[0].value[1]' || echo "null")

  if [[ "$value" == "null" || -z "$value" ]]; then
    warn "Could not retrieve value for $metric_name. Response: $response"
    return 1
  fi

  log "Current value for $metric_name: $value"

  # Simple threshold check (customize as needed)
  if (( $(echo "$value $expected_status $threshold" | awk '{print ($1 $2 $3)}') )); then
    log "✅ SLO for $metric_name is within threshold."
    return 0
  else
    warn "❌ SLO for $metric_name is outside threshold. Current: $value, Threshold: $threshold"
    return 1
  fi
}

# Example SLO checks (customize with actual dashboard UIDs, panel IDs, and metrics)
# These are placeholders and need to be adapted to your actual Grafana setup.

# Check Maestro Availability SLO
# check_slo "maestro-dashboard-uid" "availability-panel-id" ">= 0.99" "maestro_blackbox_availability" "ok"

# Check Maestro Latency SLO
# check_slo "maestro-dashboard-uid" "latency-panel-id" "<= 1.5" "maestro_blackbox_ttfb_seconds" "ok"

echo "==> Grafana SLO checks completed. Please review the output."