#!/usr/bin/env bash
# extract_required_checks_from_policy.sh
# Extracts always-required check names from REQUIRED_CHECKS_POLICY.yml
#
# Usage:
#   ./scripts/release/extract_required_checks_from_policy.sh
#   ./scripts/release/extract_required_checks_from_policy.sh --policy docs/ci/REQUIRED_CHECKS_POLICY.yml
#
# Output: JSON with always_required check names
#
# Authority: docs/ci/BRANCH_PROTECTION_DRIFT.md

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"
POLICY_FILE="${REPO_ROOT}/docs/ci/REQUIRED_CHECKS_POLICY.yml"
OUTPUT_FILE=""
VERBOSE=false

usage() {
    cat << 'EOF'
Usage: extract_required_checks_from_policy.sh [OPTIONS]

Extract always-required check names from REQUIRED_CHECKS_POLICY.yml.

Options:
  --policy FILE    Policy file path (default: docs/ci/REQUIRED_CHECKS_POLICY.yml)
  --out FILE       Output JSON file (default: stdout)
  --verbose        Enable verbose logging
  --help           Show this help

Output format:
{
  "always_required": ["Check Name 1", "Check Name 2", ...],
  "policy_version": "2.0.0",
  "extracted_at": "2026-01-08T12:00:00Z"
}
EOF
    exit 0
}

log() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo "[extract-policy] $*" >&2
    fi
}

error() {
    echo "[ERROR] $*" >&2
    exit 1
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --policy)
            POLICY_FILE="$2"
            shift 2
            ;;
        --out)
            OUTPUT_FILE="$2"
            shift 2
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            usage
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Validate policy file exists
if [[ ! -f "$POLICY_FILE" ]]; then
    error "Policy file not found: $POLICY_FILE"
fi

log "Reading policy from: $POLICY_FILE"

# Extract always_required check names using yq if available, otherwise use grep/sed
if command -v yq &> /dev/null; then
    log "Using yq for extraction"

    POLICY_VERSION=$(yq -r '.version // "unknown"' "$POLICY_FILE")

    # Extract check names as JSON array
    # For branch protection drift, use branch_protection.required_status_checks.contexts
    # Try yq v4 syntax first, then fallback to jq-wrapper yq syntax
    CHECKS=$(yq -o=json '.branch_protection.required_status_checks.contexts' "$POLICY_FILE" 2>/dev/null || \
             yq '.branch_protection.required_status_checks.contexts' "$POLICY_FILE" 2>/dev/null || \
             echo "[]")

    # Validate CHECKS is valid JSON before proceeding
    if ! echo "$CHECKS" | jq empty 2>/dev/null; then
        log "yq output was not valid JSON, falling back to empty array"
        CHECKS="[]"
    fi
else
    log "yq not found, using fallback parsing"

    # Fallback: extract version
    POLICY_VERSION=$(grep -E "^version:" "$POLICY_FILE" | sed -E 's/version:\s*"?([^"]*)"?/\1/' | tr -d ' ')

    # Fallback: extract names from branch_protection.required_status_checks.contexts
    # This is fragile but works for the expected format
    CHECKS=$(awk '
        /^branch_protection:/ { in_bp=1; next }
        /^[a-z_]+:/ && !/^  / { in_bp=0; in_contexts=0 }
        in_bp && /^  required_status_checks:/ { in_rsc=1; next }
        in_bp && in_rsc && /^    contexts:/ { in_contexts=1; next }
        in_bp && in_rsc && in_contexts && /^      - / {
            gsub(/^      - "?/, "")
            gsub(/"?\s*$/, "")
            print
        }
        in_contexts && /^    [a-z_]+:/ { in_contexts=0 }
    ' "$POLICY_FILE" | jq -R -s 'split("\n") | map(select(length > 0))')
fi

# Build output JSON
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

OUTPUT_JSON=$(jq -n \
    --argjson checks "$CHECKS" \
    --arg version "$POLICY_VERSION" \
    --arg timestamp "$TIMESTAMP" \
    --arg policy_file "$POLICY_FILE" \
    '{
        always_required: $checks,
        policy_version: $version,
        policy_file: $policy_file,
        extracted_at: $timestamp,
        count: ($checks | length)
    }')

log "Extracted $(echo "$OUTPUT_JSON" | jq -r '.count') always-required checks"

# Output
if [[ -n "$OUTPUT_FILE" ]]; then
    mkdir -p "$(dirname "$OUTPUT_FILE")"
    echo "$OUTPUT_JSON" > "$OUTPUT_FILE"
    log "Wrote to: $OUTPUT_FILE"
else
    echo "$OUTPUT_JSON"
fi
