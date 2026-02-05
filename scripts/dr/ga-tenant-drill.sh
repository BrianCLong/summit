#!/bin/bash
set -euo pipefail

# scripts/dr/ga-tenant-drill.sh
# GA tenant DR drill orchestration (backup verify + simulated failover).

TENANT_IDS="${TENANT_IDS:-}"
MODE="${MODE:-dry-run}"
OUTPUT_DIR="${OUTPUT_DIR:-artifacts/dr}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { printf "${BLUE}[DR]${NC} %s\n" "$*"; }
warn() { printf "${YELLOW}[WARN]${NC} %s\n" "$*"; }
err() { printf "${RED}[ERR]${NC} %s\n" "$*"; }

usage() {
  cat <<EOF
Usage: $0 [--execute] [--tenants "t1,t2"]

Env:
  TENANT_IDS  Comma-separated tenant ids (optional)
  MODE        dry-run|execute (default: dry-run)
  OUTPUT_DIR  Output directory for drill evidence
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --execute) MODE="execute"; shift ;;
    --tenants) TENANT_IDS="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) err "Unknown arg: $1"; usage; exit 1 ;;
  esac
done

mkdir -p "$OUTPUT_DIR"
RESULTS_FILE="${OUTPUT_DIR}/ga-tenant-drill.json"

START_TS="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
log "Starting GA tenant DR drill (${MODE})"
if [[ -n "$TENANT_IDS" ]]; then
  log "Tenants: $TENANT_IDS"
else
  warn "No tenant ids provided; running generic drill"
fi

steps=()
step_status="pass"

if [[ -x "scripts/dr/backup-verification.sh" ]]; then
  if [[ "$MODE" == "execute" ]]; then
    if scripts/dr/backup-verification.sh >/dev/null 2>&1; then
      steps+=("{\"step\":\"backup_verification\",\"status\":\"pass\"}")
    else
      steps+=("{\"step\":\"backup_verification\",\"status\":\"fail\"}")
      step_status="fail"
    fi
  else
    steps+=("{\"step\":\"backup_verification\",\"status\":\"validated\"}")
  fi
else
  steps+=("{\"step\":\"backup_verification\",\"status\":\"missing_script\"}")
  step_status="fail"
fi

if [[ -f "scripts/dr/dr_drill.ts" ]]; then
  if [[ "$MODE" == "execute" ]]; then
    if npx tsx scripts/dr/dr_drill.ts >/dev/null 2>&1; then
      steps+=("{\"step\":\"failover_simulation\",\"status\":\"pass\"}")
    else
      steps+=("{\"step\":\"failover_simulation\",\"status\":\"fail\"}")
      step_status="fail"
    fi
  else
    steps+=("{\"step\":\"failover_simulation\",\"status\":\"validated\"}")
  fi
else
  steps+=("{\"step\":\"failover_simulation\",\"status\":\"missing_script\"}")
  step_status="fail"
fi

END_TS="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

cat > "$RESULTS_FILE" <<EOF
{
  "started_at": "${START_TS}",
  "ended_at": "${END_TS}",
  "mode": "${MODE}",
  "tenants": "${TENANT_IDS}",
  "status": "${step_status}",
  "steps": [$(IFS=,; echo "${steps[*]}")]
}
EOF

if [[ "$step_status" == "fail" ]]; then
  warn "DR drill recorded failures (see $RESULTS_FILE)"
  exit 1
fi

log "DR drill completed successfully (see $RESULTS_FILE)"
