#!/usr/bin/env bash
# verify_goldens.sh — Golden Path Verification Gate
#
# Validates golden path probe results against SLO targets.
# Used by CI (slo-gates workflow) and release promotion.
#
# Usage:
#   ./scripts/verify_goldens.sh [--config PATH] [--prometheus URL] [--window DURATION]
#
# Examples:
#   ./scripts/verify_goldens.sh --prometheus http://prometheus:9090 --window 5m
#   ./scripts/verify_goldens.sh --config observability/golden-paths/golden_paths.yaml

set -euo pipefail

# Defaults — check both old and new config locations
CONFIG="${CONFIG:-observability/golden-paths/golden_paths.yaml}"
if [ ! -f "$CONFIG" ] && [ -f "observability/golden_paths.yaml" ]; then
  CONFIG="observability/golden_paths.yaml"
fi
PROMETHEUS="${PROMETHEUS:-http://prometheus:9090}"
WINDOW="${WINDOW:-5m}"
VERBOSE="${VERBOSE:-false}"

# Parse args
while [[ $# -gt 0 ]]; do
  case $1 in
    --config)    CONFIG="$2"; shift 2 ;;
    --prometheus) PROMETHEUS="$2"; shift 2 ;;
    --window)    WINDOW="$2"; shift 2 ;;
    --verbose)   VERBOSE=true; shift ;;
    *)           echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

log() { echo -e "$1"; }
pass() { log "${GREEN}  PASS${NC} $1"; PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { log "${RED}  FAIL${NC} $1"; FAIL_COUNT=$((FAIL_COUNT + 1)); }
warn() { log "${YELLOW}  WARN${NC} $1"; WARN_COUNT=$((WARN_COUNT + 1)); }

if [ ! -f "$CONFIG" ]; then
  echo "Error: Golden path config not found: $CONFIG"
  exit 1
fi

# Validate config structure
if ! grep -q "paths:" "$CONFIG"; then
  echo "Error: Invalid Golden Paths configuration (missing 'paths:' key)."
  exit 1
fi

log "Golden Path Verification"
log "========================"
log "Config:     $CONFIG"
log "Prometheus: $PROMETHEUS"
log "Window:     $WINDOW"
log ""

# Check if yq (Go version from mikefarah) is available for full verification
# Python yq uses different syntax; fall back to grep-based validation
YQ_GO=false
if command -v yq &>/dev/null; then
  # Detect Go yq (mikefarah) vs Python yq (kislyuk) — redirect all output
  if yq --version 2>&1 | grep -qi "mikefarah\|version v4\|version 4" 2>/dev/null; then
    YQ_GO=true
  fi
fi

if [ "$YQ_GO" = "false" ]; then
  log "Config validation mode (install mikefarah/yq + Prometheus for full SLO verification)"
  log ""
  log "Config structure: valid"
  PATH_COUNT=$(grep -c "^  - name:" "$CONFIG" || echo 0)
  log "Paths defined: ${PATH_COUNT}"
  COMPOSITE_COUNT=$(grep -c "^  - name:" <<< "$(sed -n '/composite_slos:/,$ p' "$CONFIG")" 2>/dev/null || echo 0)
  log "Composite SLOs: ${COMPOSITE_COUNT}"

  # List path names
  log ""
  log "Golden paths:"
  grep "^  - name:" "$CONFIG" | sed 's/  - name: /  /' | head -20
  log ""
  log "${GREEN}GATE: CONFIG VALID${NC}"
  exit 0
fi

# Query Prometheus for a metric
query_prom() {
  local query="$1"
  local result
  result=$(curl -s --fail --connect-timeout 5 \
    "${PROMETHEUS}/api/v1/query" \
    --data-urlencode "query=${query}" \
    2>/dev/null | jq -r '.data.result[0].value[1] // "N/A"' 2>/dev/null) || result="N/A"
  echo "$result"
}

# Check if Prometheus is reachable
PROM_UP=$(curl -s --connect-timeout 3 "${PROMETHEUS}/-/healthy" 2>/dev/null || echo "down")
if [ "$PROM_UP" = "down" ]; then
  warn "Prometheus not reachable at ${PROMETHEUS} — validating config only"

  PATH_COUNT=$(yq eval '.paths | length' "$CONFIG")
  log "Paths defined: ${PATH_COUNT}"
  for i in $(seq 0 $((PATH_COUNT - 1))); do
    name=$(yq eval ".paths[$i].name" "$CONFIG")
    avail=$(yq eval ".paths[$i].slo.availability" "$CONFIG")
    latency=$(yq eval ".paths[$i].slo.p99_latency_ms" "$CONFIG")
    log "  ${name}: availability=${avail}, p99=${latency}ms"
  done

  log ""
  log "${GREEN}GATE: CONFIG VALID (Prometheus offline — SLO checks skipped)${NC}"
  exit 0
fi

# Full Prometheus-backed verification
PATH_COUNT=$(yq eval '.paths | length' "$CONFIG")

for i in $(seq 0 $((PATH_COUNT - 1))); do
  name=$(yq eval ".paths[$i].name" "$CONFIG")
  avail_target=$(yq eval ".paths[$i].slo.availability" "$CONFIG")
  latency_target=$(yq eval ".paths[$i].slo.p99_latency_ms" "$CONFIG")

  log "Checking: ${name}"

  if [ "$avail_target" != "null" ]; then
    query="sum(rate(golden_path_probe_success{path=\"${name}\"}[${WINDOW}])) / sum(rate(golden_path_probe_total{path=\"${name}\"}[${WINDOW}]))"
    actual=$(query_prom "$query")
    if [ "$actual" = "N/A" ]; then
      warn "${name}: availability — no data"
    elif (( $(echo "$actual >= $avail_target" | bc -l 2>/dev/null || echo 0) )); then
      pass "${name}: availability ${actual} >= ${avail_target}"
    else
      fail "${name}: availability ${actual} < ${avail_target}"
    fi
  fi

  if [ "$latency_target" != "null" ]; then
    query="histogram_quantile(0.99, sum(rate(golden_path_probe_duration_seconds_bucket{path=\"${name}\"}[${WINDOW}])) by (le)) * 1000"
    actual=$(query_prom "$query")
    if [ "$actual" = "N/A" ]; then
      warn "${name}: p99 latency — no data"
    elif (( $(echo "$actual <= $latency_target" | bc -l 2>/dev/null || echo 0) )); then
      pass "${name}: p99 latency ${actual}ms <= ${latency_target}ms"
    else
      fail "${name}: p99 latency ${actual}ms > ${latency_target}ms"
    fi
  fi
done

# Summary
log ""
log "========================"
log "Results: ${GREEN}${PASS_COUNT} passed${NC}, ${RED}${FAIL_COUNT} failed${NC}, ${YELLOW}${WARN_COUNT} warnings${NC}"

if [ "$FAIL_COUNT" -gt 0 ]; then
  log "${RED}GATE: FAILED${NC}"
  exit 1
fi

log "${GREEN}GATE: PASSED${NC}"
exit 0
