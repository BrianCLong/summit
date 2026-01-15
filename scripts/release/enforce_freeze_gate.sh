#!/usr/bin/env bash
# enforce_freeze_gate.sh
# Enforces change freeze mode for release operations
#
# When freeze_mode=true and no valid override exists, blocks non-hotfix releases.
# Hotfix releases are always allowed regardless of freeze state.
#
# Usage:
#   ./scripts/release/enforce_freeze_gate.sh --mode ga
#   ./scripts/release/enforce_freeze_gate.sh --mode rc
#   ./scripts/release/enforce_freeze_gate.sh --mode pages
#   ./scripts/release/enforce_freeze_gate.sh --mode hotfix
#
# Exit codes:
#   0 - Allowed to proceed
#   1 - Blocked by freeze mode
#   2 - Configuration error
#
# Authority: docs/ci/CHANGE_FREEZE_MODE.md

set -euo pipefail

# Defaults
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"
FREEZE_MODE_FILE="${REPO_ROOT}/docs/releases/_state/freeze_mode.json"
OVERRIDE_FILE="${REPO_ROOT}/docs/releases/_state/release_override.json"
MODE=""
TAG=""
SHA=""
VERBOSE=false
DRY_RUN=false

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

usage() {
    cat << 'EOF'
Usage: enforce_freeze_gate.sh [OPTIONS]

Enforce change freeze mode for release operations.

Options:
  --mode MODE       Release mode: ga, rc, pages, hotfix (required)
  --tag TAG         Optional tag being released
  --sha SHA         Optional commit SHA
  --freeze-file F   Override freeze mode file path
  --override-file F Override release override file path
  --dry-run         Check without blocking (exit 0 always)
  --verbose         Enable verbose logging
  --help            Show this help

Modes:
  ga      - GA tag promotion (blocked when freeze active)
  rc      - RC tag promotion (blocked when freeze active)
  pages   - Pages publish (optionally blocked on WARN)
  hotfix  - Hotfix release (always allowed)

Exit Codes:
  0 - Allowed to proceed
  1 - Blocked by freeze mode
  2 - Configuration error

Examples:
  # Check if GA promotion is allowed
  ./scripts/release/enforce_freeze_gate.sh --mode ga --tag v4.2.0

  # Check hotfix (always allowed)
  ./scripts/release/enforce_freeze_gate.sh --mode hotfix

  # Dry run check
  ./scripts/release/enforce_freeze_gate.sh --mode ga --dry-run
EOF
    exit 0
}

log() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo "[freeze-gate] $*" >&2
    fi
}

log_info() {
    echo -e "${GREEN}[INFO]${NC} $*" >&2
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*" >&2
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*" >&2
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --mode)
            MODE="$2"
            shift 2
            ;;
        --tag)
            TAG="$2"
            shift 2
            ;;
        --sha)
            SHA="$2"
            shift 2
            ;;
        --freeze-file)
            FREEZE_MODE_FILE="$2"
            shift 2
            ;;
        --override-file)
            OVERRIDE_FILE="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            usage
            ;;
        *)
            log_error "Unknown option: $1"
            exit 2
            ;;
    esac
done

# Validate mode
if [[ -z "$MODE" ]]; then
    log_error "Missing required --mode argument"
    exit 2
fi

case "$MODE" in
    ga|rc|pages|hotfix)
        log "Mode: $MODE"
        ;;
    *)
        log_error "Invalid mode: $MODE (must be ga, rc, pages, or hotfix)"
        exit 2
        ;;
esac

# Hotfix is always allowed
if [[ "$MODE" == "hotfix" ]]; then
    log_info "Hotfix mode - always allowed regardless of freeze state"
    exit 0
fi

# Check if freeze mode file exists
if [[ ! -f "$FREEZE_MODE_FILE" ]]; then
    log "Freeze mode file not found: $FREEZE_MODE_FILE"
    log_info "No freeze mode configured - proceeding"
    exit 0
fi

# Read freeze mode state
FREEZE_MODE=$(jq -r '.freeze_mode // false' "$FREEZE_MODE_FILE" 2>/dev/null || echo "false")
FREEZE_REASON=$(jq -r '.reason // "unknown"' "$FREEZE_MODE_FILE" 2>/dev/null || echo "unknown")
FREEZE_SET_AT=$(jq -r '.set_at // "unknown"' "$FREEZE_MODE_FILE" 2>/dev/null || echo "unknown")
FREEZE_TIER=$(jq -r '.tier // "unknown"' "$FREEZE_MODE_FILE" 2>/dev/null || echo "unknown")

log "Freeze mode: $FREEZE_MODE"
log "Freeze reason: $FREEZE_REASON"
log "Freeze tier: $FREEZE_TIER"

# If freeze mode is not active, allow
if [[ "$FREEZE_MODE" != "true" ]]; then
    log_info "Freeze mode not active - proceeding"
    exit 0
fi

# Freeze mode is active - check for override
log "Freeze mode is ACTIVE"

OVERRIDE_ACTIVE=false
if [[ -f "$OVERRIDE_FILE" ]]; then
    OVERRIDE_ACTIVE=$(jq -r '.active // false' "$OVERRIDE_FILE" 2>/dev/null || echo "false")
    OVERRIDE_EXPIRES=$(jq -r '.expires_at // ""' "$OVERRIDE_FILE" 2>/dev/null || echo "")
    OVERRIDE_JUSTIFICATION=$(jq -r '.justification // ""' "$OVERRIDE_FILE" 2>/dev/null || echo "")

    log "Override active: $OVERRIDE_ACTIVE"
    log "Override expires: $OVERRIDE_EXPIRES"

    if [[ "$OVERRIDE_ACTIVE" == "true" && -n "$OVERRIDE_EXPIRES" ]]; then
        # Check if override has expired
        EXPIRES_TS=$(date -d "$OVERRIDE_EXPIRES" +%s 2>/dev/null || echo 0)
        NOW_TS=$(date +%s)

        if [[ $NOW_TS -lt $EXPIRES_TS ]]; then
            REMAINING_HOURS=$(( (EXPIRES_TS - NOW_TS) / 3600 ))
            log_info "Valid override found - expires in ${REMAINING_HOURS}h"
            log_info "Override justification: $OVERRIDE_JUSTIFICATION"
            log_info "Proceeding with release (override active)"
            exit 0
        else
            log_warn "Override has expired at $OVERRIDE_EXPIRES"
            OVERRIDE_ACTIVE=false
        fi
    fi
fi

# No valid override - block the release
if [[ "$DRY_RUN" == "true" ]]; then
    log_warn "[DRY RUN] Would block $MODE release due to freeze mode"
    log_warn "Freeze reason: $FREEZE_REASON"
    log_warn "Freeze tier: $FREEZE_TIER"
    log_warn "Set at: $FREEZE_SET_AT"
    exit 0
fi

# Output block message
echo ""
echo "=============================================="
echo "  CHANGE FREEZE MODE ACTIVE"
echo "=============================================="
echo ""
echo "Release mode '$MODE' is blocked due to error budget exhaustion."
echo ""
echo "Freeze Details:"
echo "  Reason: $FREEZE_REASON"
echo "  Tier: $FREEZE_TIER"
echo "  Set at: $FREEZE_SET_AT"
echo ""
echo "Options:"
echo ""
echo "  1. Use hotfix-release workflow (always allowed)"
echo "     gh workflow run hotfix-release.yml"
echo ""
echo "  2. Request temporary override"
echo "     gh workflow run release-override.yml \\"
echo "       -f justification='Reason for override' \\"
echo "       -f ticket_url='https://...' \\"
echo "       -f duration_hours=24"
echo ""
echo "  3. Wait for manual freeze reset"
echo "     Create PR to set freeze_mode=false in:"
echo "     docs/releases/_state/freeze_mode.json"
echo ""
echo "=============================================="
echo ""

log_error "Release blocked by change freeze mode"

# Exit with block code
exit 1
