#!/usr/bin/env bash
#
# verify-promotion-contract.sh - Verify GA_READY promotion contract
#
# Verifies that a GA_READY contract is valid and all referenced artifacts
# match their declared hashes. Used by promotion workflows before deploying.
#
# Usage:
#   ./verify-promotion-contract.sh --sha <sha> [--contract-dir DIR]
#
# Options:
#   --sha SHA           Commit SHA (required)
#   --contract-dir DIR  Path to contract directory (default: artifacts/ga-proof/<sha>)
#   --strict            Fail on any warnings
#   --verbose           Enable verbose output
#   --help              Show this help message
#
# Exit codes:
#   0 - Contract verified successfully
#   1 - Verification failed
#   2 - Invalid arguments
#

set -euo pipefail

SCRIPT_VERSION="1.0.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Configuration
GA_SHA=""
CONTRACT_DIR=""
STRICT=false
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
verify-promotion-contract.sh v${SCRIPT_VERSION}

Verify GA_READY promotion contract before cloud deployment.

Usage:
  $(basename "$0") --sha SHA [options]

Options:
  --sha SHA           Commit SHA (required)
  --contract-dir DIR  Contract directory (default: artifacts/ga-proof/<sha>)
  --strict            Fail on any warnings
  --verbose           Enable verbose output
  --help              Show this help message

Exit Codes:
  0 - Contract verified successfully
  1 - Verification failed
  2 - Invalid arguments

Examples:
  # Verify contract for SHA
  $(basename "$0") --sha abc123

  # Strict verification
  $(basename "$0") --sha abc123 --strict
EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --sha)
            GA_SHA="$2"
            shift 2
            ;;
        --contract-dir)
            CONTRACT_DIR="$2"
            shift 2
            ;;
        --strict)
            STRICT=true
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
if [[ -z "$GA_SHA" ]]; then
    log_error "Missing required argument: --sha"
    exit 2
fi

# Set default contract directory
if [[ -z "$CONTRACT_DIR" ]]; then
    CONTRACT_DIR="artifacts/ga-proof/${GA_SHA}"
fi

log_info "Verifying GA promotion contract"
log_info "SHA: ${GA_SHA}"
log_info "Contract directory: ${CONTRACT_DIR}"

# Verify contract directory exists
if [[ ! -d "$CONTRACT_DIR" ]]; then
    log_error "Contract directory not found: ${CONTRACT_DIR}"
    exit 1
fi

# Verify GA_READY.json exists
if [[ ! -f "${CONTRACT_DIR}/GA_READY.json" ]]; then
    log_error "GA_READY.json not found in ${CONTRACT_DIR}"
    exit 1
fi

# Verify contract is valid JSON
if ! jq empty "${CONTRACT_DIR}/GA_READY.json" 2>/dev/null; then
    log_error "GA_READY.json is not valid JSON"
    exit 1
fi

log_verbose "Contract JSON is valid"

# Read contract fields
CONTRACT_VERSION=$(jq -r '.version // "unknown"' "${CONTRACT_DIR}/GA_READY.json")
CONTRACT_TYPE=$(jq -r '.contract_type // "unknown"' "${CONTRACT_DIR}/GA_READY.json")
CONTRACT_SHA=$(jq -r '.release.commit_sha // ""' "${CONTRACT_DIR}/GA_READY.json")
CONTRACT_TAG=$(jq -r '.release.ga_tag // ""' "${CONTRACT_DIR}/GA_READY.json")
CONTRACT_HASH=$(jq -r '.contract_hash // ""' "${CONTRACT_DIR}/GA_READY.json")
IS_IMMUTABLE=$(jq -r '.immutable // false' "${CONTRACT_DIR}/GA_READY.json")

log_info "Contract version: ${CONTRACT_VERSION}"
log_info "Contract type: ${CONTRACT_TYPE}"
log_info "GA tag: ${CONTRACT_TAG}"

# Verify contract type
if [[ "$CONTRACT_TYPE" != "ga-ready-promotion" ]]; then
    log_error "Invalid contract type: ${CONTRACT_TYPE}"
    exit 1
fi

# Verify contract is immutable
if [[ "$IS_IMMUTABLE" != "true" ]]; then
    log_error "Contract is not marked as immutable"
    exit 1
fi

# Verify SHA matches
if [[ "$CONTRACT_SHA" != "$GA_SHA" ]]; then
    log_error "Contract SHA mismatch: expected ${GA_SHA}, got ${CONTRACT_SHA}"
    exit 1
fi

log_verbose "Contract SHA matches"

# Verify contract hash
log_info "Verifying contract hash..."
COMPUTED_HASH=$(jq -S 'del(.contract_hash)' "${CONTRACT_DIR}/GA_READY.json" | sha256sum | cut -d' ' -f1)

if [[ "$COMPUTED_HASH" != "$CONTRACT_HASH" ]]; then
    log_error "Contract hash mismatch"
    log_error "Expected: ${CONTRACT_HASH}"
    log_error "Computed: ${COMPUTED_HASH}"
    log_error "Contract has been modified!"
    exit 1
fi

log_success "Contract hash verified: ${CONTRACT_HASH}"

# Verify required files exist
log_info "Verifying required files..."
REQUIRED_FILES=(
    "GA_READY.json"
    "GA_APPROVED"
    "provenance.json"
    "ga_metadata.json"
    "SHA256SUMS"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [[ ! -f "${CONTRACT_DIR}/${file}" ]]; then
        log_error "Required file missing: ${file}"
        exit 1
    fi
    log_verbose "Found: ${file}"
done

# Verify artifact hashes
log_info "Verifying artifact hashes..."

PROVENANCE_HASH=$(jq -r '.artifact_hashes.provenance_json // ""' "${CONTRACT_DIR}/GA_READY.json")
METADATA_HASH=$(jq -r '.artifact_hashes.ga_metadata_json // ""' "${CONTRACT_DIR}/GA_READY.json")
SUMS_HASH=$(jq -r '.artifact_hashes.sha256sums // ""' "${CONTRACT_DIR}/GA_READY.json")

# Verify provenance.json hash
ACTUAL_PROVENANCE_HASH=$(sha256sum "${CONTRACT_DIR}/provenance.json" | cut -d' ' -f1)
if [[ "$ACTUAL_PROVENANCE_HASH" != "$PROVENANCE_HASH" ]]; then
    log_error "provenance.json hash mismatch"
    log_error "Expected: ${PROVENANCE_HASH}"
    log_error "Actual:   ${ACTUAL_PROVENANCE_HASH}"
    exit 1
fi
log_verbose "provenance.json hash verified"

# Verify ga_metadata.json hash
ACTUAL_METADATA_HASH=$(sha256sum "${CONTRACT_DIR}/ga_metadata.json" | cut -d' ' -f1)
if [[ "$ACTUAL_METADATA_HASH" != "$METADATA_HASH" ]]; then
    log_error "ga_metadata.json hash mismatch"
    log_error "Expected: ${METADATA_HASH}"
    log_error "Actual:   ${ACTUAL_METADATA_HASH}"
    exit 1
fi
log_verbose "ga_metadata.json hash verified"

# Verify SHA256SUMS hash
ACTUAL_SUMS_HASH=$(sha256sum "${CONTRACT_DIR}/SHA256SUMS" | cut -d' ' -f1)
if [[ "$ACTUAL_SUMS_HASH" != "$SUMS_HASH" ]]; then
    log_error "SHA256SUMS hash mismatch"
    log_error "Expected: ${SUMS_HASH}"
    log_error "Actual:   ${ACTUAL_SUMS_HASH}"
    exit 1
fi
log_verbose "SHA256SUMS hash verified"

# Verify governance lockfile if present
GOVERNANCE_HASH=$(jq -r '.artifact_hashes.governance_lockfile_json // "null"' "${CONTRACT_DIR}/GA_READY.json")
if [[ "$GOVERNANCE_HASH" != "null" ]]; then
    if [[ ! -f "${CONTRACT_DIR}/governance/governance_lockfile.json" ]]; then
        log_error "Contract declares governance lockfile but file not found"
        exit 1
    fi

    ACTUAL_GOVERNANCE_HASH=$(sha256sum "${CONTRACT_DIR}/governance/governance_lockfile.json" | cut -d' ' -f1)
    if [[ "$ACTUAL_GOVERNANCE_HASH" != "$GOVERNANCE_HASH" ]]; then
        log_error "governance_lockfile.json hash mismatch"
        log_error "Expected: ${GOVERNANCE_HASH}"
        log_error "Actual:   ${ACTUAL_GOVERNANCE_HASH}"
        exit 1
    fi
    log_verbose "governance_lockfile.json hash verified"
fi

# Verify promotion rules
log_info "Verifying promotion rules..."
NO_BUILDS=$(jq -r '.promotion_rules.no_builds // false' "${CONTRACT_DIR}/GA_READY.json")
NO_MUTATIONS=$(jq -r '.promotion_rules.no_mutations // false' "${CONTRACT_DIR}/GA_READY.json")
NO_INTERPRETATION=$(jq -r '.promotion_rules.no_interpretation // false' "${CONTRACT_DIR}/GA_READY.json")
HASH_VERIFICATION=$(jq -r '.promotion_rules.hash_verification_required // false' "${CONTRACT_DIR}/GA_READY.json")
REPLAY_SAFE=$(jq -r '.promotion_rules.replay_safe // false' "${CONTRACT_DIR}/GA_READY.json")

if [[ "$NO_BUILDS" != "true" ]] || \
   [[ "$NO_MUTATIONS" != "true" ]] || \
   [[ "$NO_INTERPRETATION" != "true" ]] || \
   [[ "$HASH_VERIFICATION" != "true" ]] || \
   [[ "$REPLAY_SAFE" != "true" ]]; then
    log_error "Promotion rules are not properly set"
    exit 1
fi

log_verbose "Promotion rules verified"

# Verify verification flags
log_info "Verifying GA verification status..."
LINEAGE_VERIFIED=$(jq -r '.verification.lineage_verified // false' "${CONTRACT_DIR}/GA_READY.json")
SECURITY_VERIFIED=$(jq -r '.verification.security_verified // false' "${CONTRACT_DIR}/GA_READY.json")
PUBLISH_GUARD=$(jq -r '.verification.publish_guard_passed // false' "${CONTRACT_DIR}/GA_READY.json")
TWO_PERSON=$(jq -r '.verification.two_person_approval // false' "${CONTRACT_DIR}/GA_READY.json")

if [[ "$LINEAGE_VERIFIED" != "true" ]]; then
    log_error "Lineage not verified"
    exit 1
fi

if [[ "$SECURITY_VERIFIED" != "true" ]]; then
    log_error "Security not verified"
    exit 1
fi

if [[ "$PUBLISH_GUARD" != "true" ]]; then
    log_error "Publish guard not passed"
    exit 1
fi

if [[ "$TWO_PERSON" != "true" ]]; then
    if [[ "$STRICT" == "true" ]]; then
        log_error "Two-person approval not verified (strict mode)"
        exit 1
    else
        log_warn "Two-person approval not verified"
    fi
fi

log_success "All verification checks passed"

# Output summary
echo ""
echo "=============================================="
echo "  Contract Verification: PASSED"
echo "=============================================="
echo ""
echo "  GA Tag:         ${CONTRACT_TAG}"
echo "  SHA:            ${GA_SHA}"
echo "  Contract Hash:  ${CONTRACT_HASH}"
echo ""
echo "Verification Status:"
echo "  Lineage:        ✓ Verified"
echo "  Security:       ✓ Verified"
echo "  Publish Guard:  ✓ Passed"
echo "  Two-Person:     $(if [[ "$TWO_PERSON" == "true" ]]; then echo "✓ Verified"; else echo "⚠ Not verified"; fi)"
echo ""
echo "Promotion Rules:"
echo "  No Builds:      ✓ Enforced"
echo "  No Mutations:   ✓ Enforced"
echo "  No Interpret:   ✓ Enforced"
echo "  Hash Check:     ✓ Required"
echo "  Replay Safe:    ✓ Enabled"
echo ""
echo "This artifact is ready for cloud promotion."
echo ""

exit 0
