#!/usr/bin/env bash
#
# verify-rc-lineage.sh - Verify GA tag points to a successful RC SHA
#
# This script enforces the lineage requirement: a GA tag must point to
# the same commit as a successful RC tag for the same version.
#
# Usage:
#   ./verify-rc-lineage.sh --ga-tag v4.1.2 --ga-sha abc123 [--require-success]
#
# Options:
#   --ga-tag TAG        GA tag being verified (e.g., v4.1.2)
#   --ga-sha SHA        Commit SHA the GA tag points to
#   --require-success   Fail if no matching successful RC found (default: warn)
#   --json              Output results in JSON format
#   --verbose           Enable verbose output
#   --help              Show this help message
#
# Exit codes:
#   0 - Lineage verified (or warning mode with no match)
#   1 - Lineage verification failed
#   2 - Invalid arguments
#

set -euo pipefail

SCRIPT_VERSION="1.0.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Configuration
GA_TAG=""
GA_SHA=""
REQUIRE_SUCCESS=false
JSON_OUTPUT=false
VERBOSE=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    if [[ "$JSON_OUTPUT" != "true" ]]; then
        echo -e "${BLUE}[INFO]${NC} $1"
    fi
}

log_success() {
    if [[ "$JSON_OUTPUT" != "true" ]]; then
        echo -e "${GREEN}[SUCCESS]${NC} $1"
    fi
}

log_warn() {
    if [[ "$JSON_OUTPUT" != "true" ]]; then
        echo -e "${YELLOW}[WARN]${NC} $1"
    fi
}

log_error() {
    if [[ "$JSON_OUTPUT" != "true" ]]; then
        echo -e "${RED}[ERROR]${NC} $1" >&2
    fi
}

log_verbose() {
    if [[ "$VERBOSE" == "true" && "$JSON_OUTPUT" != "true" ]]; then
        echo -e "${BLUE}[VERBOSE]${NC} $1"
    fi
}

show_help() {
    cat << EOF
verify-rc-lineage.sh v${SCRIPT_VERSION}

Verify GA tag points to a successful RC SHA.

Usage:
  $(basename "$0") --ga-tag TAG --ga-sha SHA [options]

Options:
  --ga-tag TAG        GA tag being verified (e.g., v4.1.2)
  --ga-sha SHA        Commit SHA the GA tag points to
  --require-success   Fail if no matching successful RC found
  --json              Output results in JSON format
  --verbose           Enable verbose output
  --help              Show this help message

Examples:
  # Verify lineage (warn if no RC found)
  $(basename "$0") --ga-tag v4.1.2 --ga-sha abc123

  # Require successful RC (fail if not found)
  $(basename "$0") --ga-tag v4.1.2 --ga-sha abc123 --require-success

  # JSON output for CI integration
  $(basename "$0") --ga-tag v4.1.2 --ga-sha abc123 --json

Exit Codes:
  0 - Lineage verified successfully
  1 - Lineage verification failed
  2 - Invalid arguments
EOF
}

output_json() {
    local status="$1"
    local ga_tag="$2"
    local ga_sha="$3"
    local rc_tag="${4:-}"
    local rc_sha="${5:-}"
    local message="${6:-}"

    cat << EOF
{
  "version": "${SCRIPT_VERSION}",
  "status": "${status}",
  "ga_tag": "${ga_tag}",
  "ga_sha": "${ga_sha}",
  "rc_tag": "${rc_tag}",
  "rc_sha": "${rc_sha}",
  "lineage_verified": $([ "$status" == "passed" ] && echo "true" || echo "false"),
  "message": "${message}",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --ga-tag)
            GA_TAG="$2"
            shift 2
            ;;
        --ga-sha)
            GA_SHA="$2"
            shift 2
            ;;
        --require-success)
            REQUIRE_SUCCESS=true
            shift
            ;;
        --json)
            JSON_OUTPUT=true
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
if [[ -z "$GA_TAG" ]]; then
    log_error "Missing required argument: --ga-tag"
    exit 2
fi

if [[ -z "$GA_SHA" ]]; then
    log_error "Missing required argument: --ga-sha"
    exit 2
fi

# Validate GA tag format (must be vX.Y.Z without -rc.N)
if [[ ! "$GA_TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    log_error "Invalid GA tag format: ${GA_TAG}. Expected vX.Y.Z (no -rc suffix)"
    if [[ "$JSON_OUTPUT" == "true" ]]; then
        output_json "failed" "$GA_TAG" "$GA_SHA" "" "" "Invalid GA tag format"
    fi
    exit 1
fi

# Extract base version from GA tag (e.g., v4.1.2 -> 4.1.2)
BASE_VERSION="${GA_TAG#v}"

log_info "Verifying RC lineage for GA tag: ${GA_TAG}"
log_info "GA commit SHA: ${GA_SHA}"
log_verbose "Base version: ${BASE_VERSION}"

# Find RC tags for this version
RC_PATTERN="v${BASE_VERSION}-rc.*"
log_verbose "Searching for RC tags matching: ${RC_PATTERN}"

# Get all RC tags for this version, sorted by RC number
RC_TAGS=$(git tag -l "${RC_PATTERN}" --sort=-v:refname 2>/dev/null || echo "")

if [[ -z "$RC_TAGS" ]]; then
    MESSAGE="No RC tags found for version ${BASE_VERSION}"
    log_warn "$MESSAGE"

    if [[ "$REQUIRE_SUCCESS" == "true" ]]; then
        log_error "Lineage verification failed: ${MESSAGE}"
        if [[ "$JSON_OUTPUT" == "true" ]]; then
            output_json "failed" "$GA_TAG" "$GA_SHA" "" "" "$MESSAGE"
        fi
        exit 1
    else
        log_warn "Lineage not enforced (no --require-success flag)"
        if [[ "$JSON_OUTPUT" == "true" ]]; then
            output_json "warning" "$GA_TAG" "$GA_SHA" "" "" "$MESSAGE"
        fi
        exit 0
    fi
fi

log_verbose "Found RC tags:"
if [[ "$VERBOSE" == "true" ]]; then
    echo "$RC_TAGS" | while read -r tag; do
        log_verbose "  - $tag"
    done
fi

# Find the latest RC tag
LATEST_RC_TAG=$(echo "$RC_TAGS" | head -n1)
log_info "Latest RC tag: ${LATEST_RC_TAG}"

# Get the SHA of the latest RC tag
LATEST_RC_SHA=$(git rev-parse "${LATEST_RC_TAG}^{}" 2>/dev/null || git rev-parse "${LATEST_RC_TAG}" 2>/dev/null || echo "")

if [[ -z "$LATEST_RC_SHA" ]]; then
    MESSAGE="Could not resolve SHA for RC tag ${LATEST_RC_TAG}"
    log_error "$MESSAGE"
    if [[ "$JSON_OUTPUT" == "true" ]]; then
        output_json "failed" "$GA_TAG" "$GA_SHA" "$LATEST_RC_TAG" "" "$MESSAGE"
    fi
    exit 1
fi

log_info "Latest RC SHA: ${LATEST_RC_SHA}"

# Compare SHAs
if [[ "$GA_SHA" == "$LATEST_RC_SHA" ]]; then
    MESSAGE="GA tag ${GA_TAG} points to the same commit as ${LATEST_RC_TAG}"
    log_success "$MESSAGE"
    log_success "Lineage verified: GA commit matches latest successful RC"

    if [[ "$JSON_OUTPUT" == "true" ]]; then
        output_json "passed" "$GA_TAG" "$GA_SHA" "$LATEST_RC_TAG" "$LATEST_RC_SHA" "$MESSAGE"
    fi
    exit 0
else
    # Check if GA SHA matches any RC tag (not just latest)
    MATCHING_RC=""
    for rc_tag in $RC_TAGS; do
        rc_sha=$(git rev-parse "${rc_tag}^{}" 2>/dev/null || git rev-parse "${rc_tag}" 2>/dev/null || echo "")
        if [[ "$GA_SHA" == "$rc_sha" ]]; then
            MATCHING_RC="$rc_tag"
            break
        fi
    done

    if [[ -n "$MATCHING_RC" ]]; then
        MESSAGE="GA tag ${GA_TAG} points to ${MATCHING_RC} (not latest RC: ${LATEST_RC_TAG})"
        log_warn "$MESSAGE"
        log_warn "Consider using the latest RC for GA promotion"

        if [[ "$REQUIRE_SUCCESS" == "true" ]]; then
            log_error "Lineage verification failed: GA must match latest RC"
            if [[ "$JSON_OUTPUT" == "true" ]]; then
                output_json "failed" "$GA_TAG" "$GA_SHA" "$MATCHING_RC" "$GA_SHA" "GA matches older RC, not latest"
            fi
            exit 1
        else
            if [[ "$JSON_OUTPUT" == "true" ]]; then
                output_json "warning" "$GA_TAG" "$GA_SHA" "$MATCHING_RC" "$GA_SHA" "$MESSAGE"
            fi
            exit 0
        fi
    else
        MESSAGE="GA SHA ${GA_SHA} does not match any RC for version ${BASE_VERSION}"
        log_error "$MESSAGE"
        log_error "Latest RC ${LATEST_RC_TAG} points to ${LATEST_RC_SHA}"

        if [[ "$JSON_OUTPUT" == "true" ]]; then
            output_json "failed" "$GA_TAG" "$GA_SHA" "$LATEST_RC_TAG" "$LATEST_RC_SHA" "$MESSAGE"
        fi
        exit 1
    fi
fi
