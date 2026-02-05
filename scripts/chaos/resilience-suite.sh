#!/bin/bash
set -euo pipefail

# scripts/chaos/resilience-suite.sh
# Runs a GA resilience suite using the chaos/experiments manifests.
# Default is dry-run (manifests validated). Use --execute to apply.

NAMESPACE="${NAMESPACE:-summit-staging}"
MODE="dry-run"
OUTPUT_DIR="${OUTPUT_DIR:-artifacts/chaos}"
EXPERIMENT_DIR="${EXPERIMENT_DIR:-chaos/experiments}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { printf "${BLUE}[CHAOS]${NC} %s\n" "$*"; }
warn() { printf "${YELLOW}[WARN]${NC} %s\n" "$*"; }
err() { printf "${RED}[ERR]${NC} %s\n" "$*"; }

usage() {
  cat <<EOF
Usage: $0 [--execute] [--namespace <ns>]

Defaults:
  --namespace ${NAMESPACE}
  dry-run validation only

Env:
  NAMESPACE, OUTPUT_DIR, EXPERIMENT_DIR
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --execute) MODE="execute"; shift ;;
    --namespace) NAMESPACE="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) err "Unknown arg: $1"; usage; exit 1 ;;
  esac
done

command -v kubectl >/dev/null 2>&1 || { err "kubectl is required"; exit 2; }

if [[ ! -d "$EXPERIMENT_DIR" ]]; then
  err "Experiment directory not found: $EXPERIMENT_DIR"
  exit 3
fi

mapfile -t experiments < <(ls "$EXPERIMENT_DIR"/*.yaml 2>/dev/null || true)
if [[ ${#experiments[@]} -eq 0 ]]; then
  err "No experiments found in $EXPERIMENT_DIR"
  exit 4
fi

mkdir -p "$OUTPUT_DIR"
RESULTS_FILE="${OUTPUT_DIR}/resilience-suite.json"
START_TS="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

log "Resilience suite starting"
log "Namespace: $NAMESPACE"
log "Mode: $MODE"
log "Experiments: ${#experiments[@]}"

pass=0
fail=0
details=()

for exp in "${experiments[@]}"; do
  name="$(basename "$exp")"
  log "Validating $name"
  if [[ "$MODE" == "dry-run" ]]; then
    if kubectl apply --dry-run=client -n "$NAMESPACE" -f "$exp" >/dev/null; then
      pass=$((pass+1))
      details+=("{\"experiment\":\"$name\",\"status\":\"validated\"}")
    else
      fail=$((fail+1))
      details+=("{\"experiment\":\"$name\",\"status\":\"invalid\"}")
    fi
  else
    if kubectl apply -n "$NAMESPACE" -f "$exp" >/dev/null; then
      pass=$((pass+1))
      details+=("{\"experiment\":\"$name\",\"status\":\"applied\"}")
    else
      fail=$((fail+1))
      details+=("{\"experiment\":\"$name\",\"status\":\"apply_failed\"}")
    fi
  fi
done

END_TS="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

cat > "$RESULTS_FILE" <<EOF
{
  "started_at": "${START_TS}",
  "ended_at": "${END_TS}",
  "namespace": "${NAMESPACE}",
  "mode": "${MODE}",
  "experiments_total": ${#experiments[@]},
  "experiments_passed": ${pass},
  "experiments_failed": ${fail},
  "experiments": [$(IFS=,; echo "${details[*]}")]
}
EOF

if [[ $fail -gt 0 ]]; then
  warn "Resilience suite completed with failures (see $RESULTS_FILE)"
  exit 1
fi

log "Resilience suite completed successfully (see $RESULTS_FILE)"
