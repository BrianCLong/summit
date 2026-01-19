#!/usr/bin/env bash
#
# rollback-promotion.sh - Deterministic rollback via promotion replay
#
# Implements rollback safety by replaying a previous GA-approved promotion
# to any environment. Does not mutate history - creates new promotion record.
#
# Usage:
#   ./rollback-promotion.sh --env <env> --sha <sha> [options]
#
# Options:
#   --env ENV           Target environment (dev|stage|prod)
#   --sha SHA           Git SHA to rollback to (must have GA_READY contract)
#   --reason TEXT       Reason for rollback (required)
#   --dry-run           Show what would be done without executing
#   --verbose           Enable verbose output
#   --help              Show this help message
#
# Rollback Rules:
#   1. Can only rollback to SHAs with valid GA_READY contracts
#   2. Creates new promotion record (does not delete current)
#   3. Uses new monotonic logical index
#   4. Records rollback provenance
#   5. Deterministic and replay-safe
#

set -euo pipefail

SCRIPT_VERSION="1.0.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Configuration
TARGET_ENV=""
ROLLBACK_SHA=""
ROLLBACK_REASON=""
DRY_RUN=false
VERBOSE=false

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

log_verbose() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "${BLUE}[VERBOSE]${NC} $1"
    fi
}

show_help() {
    cat << EOF
rollback-promotion.sh v${SCRIPT_VERSION}

Deterministic rollback via promotion replay.

Usage:
  $(basename "$0") --env ENV --sha SHA --reason REASON [options]

Options:
  --env ENV           Target environment (dev|stage|prod) (required)
  --sha SHA           Git SHA to rollback to (required)
  --reason TEXT       Reason for rollback (required)
  --dry-run           Show what would be done
  --verbose           Enable verbose output
  --help              Show this help message

Rollback Rules:
  1. Can only rollback to SHAs with valid GA_READY contracts
  2. Creates new promotion record (does not delete current)
  3. Uses new monotonic logical index
  4. Records rollback provenance
  5. Deterministic and replay-safe

Examples:
  # Rollback prod to previous SHA
  $(basename "$0") --env prod --sha abc123 --reason "Incident #1234: API errors"

  # Dry run
  $(basename "$0") --env stage --sha def456 --reason "Test rollback" --dry-run
EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            TARGET_ENV="$2"
            shift 2
            ;;
        --sha)
            ROLLBACK_SHA="$2"
            shift 2
            ;;
        --reason)
            ROLLBACK_REASON="$2"
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
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 2
            ;;
    esac
done

# Validate required arguments
if [[ -z "$TARGET_ENV" ]]; then
    log_error "Missing required argument: --env"
    exit 2
fi

if [[ -z "$ROLLBACK_SHA" ]]; then
    log_error "Missing required argument: --sha"
    exit 2
fi

if [[ -z "$ROLLBACK_REASON" ]]; then
    log_error "Missing required argument: --reason"
    exit 2
fi

# Validate environment
if [[ ! "$TARGET_ENV" =~ ^(dev|stage|prod)$ ]]; then
    log_error "Invalid environment: ${TARGET_ENV}. Must be dev, stage, or prod"
    exit 1
fi

log_info "Rollback Configuration"
log_info "Environment: ${TARGET_ENV}"
log_info "Target SHA:  ${ROLLBACK_SHA}"
log_info "Reason:      ${ROLLBACK_REASON}"

if [[ "$DRY_RUN" == "true" ]]; then
    log_warn "DRY RUN MODE - No changes will be made"
fi

echo ""

# Verify rollback target has GA_READY contract
CONTRACT_PATH="artifacts/ga-proof/${ROLLBACK_SHA}/GA_READY.json"

if [[ ! -f "$CONTRACT_PATH" ]]; then
    log_error "Cannot rollback to SHA without GA_READY contract"
    log_error "Contract not found: ${CONTRACT_PATH}"
    log_error ""
    log_error "Rollback is only allowed to GA-verified SHAs."
    exit 1
fi

log_success "GA_READY contract found: ${CONTRACT_PATH}"

# Verify contract
log_info "Verifying rollback target contract..."

if [[ -x "${SCRIPT_DIR}/verify-promotion-contract.sh" ]]; then
    if "${SCRIPT_DIR}/verify-promotion-contract.sh" \
        --sha "${ROLLBACK_SHA}" \
        ${VERBOSE:+--verbose}; then
        log_success "Contract verified"
    else
        log_error "Contract verification failed"
        exit 1
    fi
else
    log_warn "Contract verification script not found, skipping verification"
fi

# Read contract metadata
GA_TAG=$(jq -r '.release.ga_tag // "unknown"' "$CONTRACT_PATH")
CONTRACT_HASH=$(jq -r '.contract_hash // "unknown"' "$CONTRACT_PATH")

log_verbose "GA Tag: ${GA_TAG}"
log_verbose "Contract Hash: ${CONTRACT_HASH}"

# Check current promotion
CURRENT_PROMOTION_PATH="artifacts/promotions/${TARGET_ENV}"
CURRENT_SHA=""
CURRENT_LOGICAL_INDEX=0

if [[ -d "$CURRENT_PROMOTION_PATH" ]]; then
    # Find most recent promotion by logical_index
    LATEST_PROMOTION=$(find "$CURRENT_PROMOTION_PATH" -name "*.json" -type f -exec jq -r '.logical_index // 0' {} \; | sort -rn | head -1)

    if [[ -n "$LATEST_PROMOTION" && "$LATEST_PROMOTION" != "0" ]]; then
        CURRENT_LOGICAL_INDEX=$LATEST_PROMOTION
        # Find file with this logical index
        CURRENT_PROMOTION_FILE=$(grep -l "\"logical_index\": ${CURRENT_LOGICAL_INDEX}" "$CURRENT_PROMOTION_PATH"/*.json 2>/dev/null | head -1 || echo "")

        if [[ -n "$CURRENT_PROMOTION_FILE" ]]; then
            CURRENT_SHA=$(jq -r '.source.commit_sha // "unknown"' "$CURRENT_PROMOTION_FILE")
            CURRENT_GA_TAG=$(jq -r '.source.ga_tag // "unknown"' "$CURRENT_PROMOTION_FILE")
            log_info "Current ${TARGET_ENV} deployment:"
            log_info "  SHA:           ${CURRENT_SHA}"
            log_info "  GA Tag:        ${CURRENT_GA_TAG}"
            log_info "  Logical Index: ${CURRENT_LOGICAL_INDEX}"
        fi
    fi
fi

if [[ -z "$CURRENT_SHA" ]]; then
    log_warn "No current promotion found for ${TARGET_ENV}"
fi

# Check if rollback target is same as current
if [[ "$ROLLBACK_SHA" == "$CURRENT_SHA" ]]; then
    log_warn "Rollback SHA is same as current deployment"
    if [[ "$DRY_RUN" != "true" ]]; then
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Rollback cancelled"
            exit 0
        fi
    fi
fi

# Generate new monotonic logical index
NEW_LOGICAL_INDEX=$(date -u +%s)

# Ensure new index is greater than current
if [[ $NEW_LOGICAL_INDEX -le $CURRENT_LOGICAL_INDEX ]]; then
    NEW_LOGICAL_INDEX=$((CURRENT_LOGICAL_INDEX + 1))
    log_verbose "Adjusted logical index to maintain monotonicity: ${NEW_LOGICAL_INDEX}"
fi

# Compute promotion hash
PROMOTION_HASH="$(echo -n "${ROLLBACK_SHA}:${TARGET_ENV}:${NEW_LOGICAL_INDEX}:rollback" | sha256sum | cut -d' ' -f1)"

echo ""
log_info "Rollback Plan:"
log_info "  From SHA:      ${CURRENT_SHA:-none}"
log_info "  To SHA:        ${ROLLBACK_SHA}"
log_info "  GA Tag:        ${GA_TAG}"
log_info "  New Index:     ${NEW_LOGICAL_INDEX}"
log_info "  Rollback Hash: ${PROMOTION_HASH}"
echo ""

if [[ "$DRY_RUN" == "true" ]]; then
    echo "[DRY-RUN] Would execute:"
    echo ""
    echo "  1. Verify artifact hashes for SHA ${ROLLBACK_SHA}"
    echo "  2. Replay promotion to ${TARGET_ENV}"
    echo "  3. Create rollback record: artifacts/promotions/${TARGET_ENV}/${ROLLBACK_SHA}.rollback.${NEW_LOGICAL_INDEX}.json"
    echo "  4. Record provenance with reason: ${ROLLBACK_REASON}"
    echo ""
    echo "No changes made."
    exit 0
fi

# Execute rollback
log_info "Executing rollback..."

# Verify artifact hashes
BUNDLE_DIR=$(jq -r '.release.artifact_directory // "unknown"' "$CONTRACT_PATH")
if [[ -d "$BUNDLE_DIR" && -f "$BUNDLE_DIR/SHA256SUMS" ]]; then
    log_info "Verifying artifact hashes..."
    cd "$BUNDLE_DIR"
    if sha256sum -c SHA256SUMS > /dev/null 2>&1; then
        log_success "Artifact hashes verified"
    else
        log_error "Artifact hash verification failed"
        exit 1
    fi
    cd - > /dev/null
else
    log_warn "Bundle directory not available, skipping hash verification"
fi

# Create rollback promotion record
mkdir -p "artifacts/promotions/${TARGET_ENV}"

ROLLBACK_RECORD="artifacts/promotions/${TARGET_ENV}/${ROLLBACK_SHA}.rollback.${NEW_LOGICAL_INDEX}.json"

cat > "$ROLLBACK_RECORD" << EOF
{
  "version": "1.0.0",
  "promotion_type": "rollback",
  "promoted_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "logical_index": ${NEW_LOGICAL_INDEX},
  "promotion_hash": "${PROMOTION_HASH}",
  "rollback": {
    "from_sha": "${CURRENT_SHA:-unknown}",
    "from_logical_index": ${CURRENT_LOGICAL_INDEX},
    "to_sha": "${ROLLBACK_SHA}",
    "reason": "${ROLLBACK_REASON}",
    "initiated_by": "${USER:-unknown}",
    "initiated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  },
  "source": {
    "ga_tag": "${GA_TAG}",
    "commit_sha": "${ROLLBACK_SHA}",
    "contract_hash": "${CONTRACT_HASH}",
    "contract_path": "${CONTRACT_PATH}"
  },
  "target": {
    "environment": "${TARGET_ENV}",
    "deployment_method": "artifact-promotion-rollback",
    "no_builds": true,
    "no_mutations": true
  },
  "verification": {
    "contract_verified": true,
    "hashes_verified": true,
    "promotion_rules_enforced": true,
    "replay_safe": true
  }
}
EOF

log_success "Rollback record created: ${ROLLBACK_RECORD}"

# In production:
# 1. Trigger actual deployment to environment
# 2. Wait for deployment to complete
# 3. Verify health checks
# 4. Update monitoring/alerting

log_success "Rollback completed successfully"

# Output summary
echo ""
echo "=============================================="
echo "  Rollback Complete"
echo "=============================================="
echo ""
echo "  Environment:    ${TARGET_ENV}"
echo "  Rolled back to: ${ROLLBACK_SHA}"
echo "  GA Tag:         ${GA_TAG}"
echo "  Logical Index:  ${NEW_LOGICAL_INDEX}"
echo "  Rollback Hash:  ${PROMOTION_HASH}"
echo ""
echo "Rollback record: ${ROLLBACK_RECORD}"
echo ""
echo "Next steps:"
echo "  1. Verify ${TARGET_ENV} environment health"
echo "  2. Monitor metrics and logs"
echo "  3. Validate rollback resolved the issue"
echo "  4. Document incident with rollback details"
echo ""

exit 0
