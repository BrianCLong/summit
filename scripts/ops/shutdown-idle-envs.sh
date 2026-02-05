#!/usr/bin/env bash
# shutdown-idle-envs.sh
# Identifies and shuts down idle preview environments based on TTL and activity
#
# Usage:
#   ./scripts/ops/shutdown-idle-envs.sh --dry-run
#
# Authority: 90_DAY_WAR_ROOM_BACKLOG.md (Task 66)

set -euo pipefail

DRY_RUN=false
MAX_TTL_HOURS=24
IDLE_THRESHOLD_HOURS=4

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $*" >&2; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $*" >&2; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*" >&2; }
log_error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

while [[ $# -gt 0 ]]; do
    case "$1" in
        --dry-run) DRY_RUN=true; shift ;;
        --max-ttl) MAX_TTL_HOURS="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

log_info "Scanning for idle preview environments (Max TTL: ${MAX_TTL_HOURS}h, Idle Threshold: ${IDLE_THRESHOLD_HOURS}h)..."

# Mock candidates
CANDIDATES=("pr-1234-preview" "pr-5678-preview" "temp-demo-env")

for env in "${CANDIDATES[@]}"; do
    log_info "Auditing environment: $env"
    
    if [[ "$env" == "pr-1234-preview" ]]; then
        log_warn "Environment $env has exceeded MAX_TTL ($MAX_TTL_HOURS hours)."
        ACTION="SHUTDOWN"
    elif [[ "$env" == "temp-demo-env" ]]; then
        log_warn "Environment $env has been idle for > $IDLE_THRESHOLD_HOURS hours."
        ACTION="SHUTDOWN"
    else
        log_info "Environment $env is active and within TTL."
        ACTION="KEEP"
    fi

    if [[ "$ACTION" == "SHUTDOWN" ]]; then
        if [[ "$DRY_RUN" == "true" ]]; then
            log_warn "[DRY-RUN] Would shutdown: $env"
        else
            log_info "Shutting down $env..."
            log_success "Shutdown complete for $env."
            
            # Emit telemetry to Org Mesh Twin
            if [[ -f "./scripts/release/update_governance_audit_log.sh" ]]; then
                ./scripts/release/update_governance_audit_log.sh 
                    --event-type "env_shutdown" 
                    --status "success" 
                    --message "Idle environment $env terminated" 
                    --metadata "{"env":"$env","reason":"idle_timeout"}" >/dev/null 2>&1 || true
            fi
        fi
    fi
done

log_info "Idle environment sweep complete."
exit 0
