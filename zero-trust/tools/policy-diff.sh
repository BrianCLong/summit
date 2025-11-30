#!/usr/bin/env bash
# Policy Diff Tool
# Analyzes changes to zero-trust policies and generates "who can talk to what" reports

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
POLICIES_DIR="$ROOT_DIR/policies"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Output format
OUTPUT_FORMAT="${1:-text}"
BASE_REF="${2:-HEAD~1}"
HEAD_REF="${3:-HEAD}"

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_section() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

#############################################
# NETWORK POLICY DIFF
#############################################

diff_network_policies() {
    log_section "Network Policy Changes"

    local changed_files
    changed_files=$(git diff --name-only "$BASE_REF" "$HEAD_REF" -- "$POLICIES_DIR/network" 2>/dev/null || true)

    if [[ -z "$changed_files" ]]; then
        log_info "No network policy changes detected"
        return
    fi

    echo ""
    echo "Changed files:"
    echo "$changed_files" | while read -r file; do
        if [[ -n "$file" ]]; then
            echo "  • $file"
        fi
    done

    echo ""
    echo "Detailed changes:"
    echo ""

    for file in $changed_files; do
        if [[ -f "$file" ]]; then
            echo -e "${YELLOW}File: $file${NC}"

            # Show additions and removals
            git diff "$BASE_REF" "$HEAD_REF" -- "$file" | grep -E "^[+-]" | grep -v "^[+-]{3}" | head -50 || true
            echo ""
        fi
    done
}

#############################################
# COMMUNICATION MATRIX REPORT
#############################################

generate_communication_report() {
    log_section "Service Communication Matrix"

    local matrix_file="$ROOT_DIR/config/communication-matrix.yaml"

    if [[ ! -f "$matrix_file" ]]; then
        log_info "Communication matrix not found"
        return
    fi

    echo ""
    echo "Current allowed communications:"
    echo ""

    # Extract and format rules
    yq eval '.data."matrix.yaml" | from_yaml | .rules[] | "  " + .source.service + " (" + .source.namespace + ") → " + .destination.service + " (" + .destination.namespace + ")"' "$matrix_file" 2>/dev/null || \
    yq eval '.data."matrix.yaml" | from_yaml | .rules[] | "  " + (.source.services // [.source.service] | join(",")) + " (" + .source.namespace + ") → " + (.destination.services // [.destination.service] | join(",")) + " (" + .destination.namespace + ")"' "$matrix_file" 2>/dev/null || \
    echo "  Unable to parse communication matrix"

    echo ""
}

#############################################
# OPA POLICY DIFF
#############################################

diff_opa_policies() {
    log_section "OPA Policy Changes"

    local changed_files
    changed_files=$(git diff --name-only "$BASE_REF" "$HEAD_REF" -- "$POLICIES_DIR/opa" 2>/dev/null || true)

    if [[ -z "$changed_files" ]]; then
        log_info "No OPA policy changes detected"
        return
    fi

    echo ""
    echo "Changed files:"
    echo "$changed_files" | while read -r file; do
        if [[ -n "$file" ]]; then
            echo "  • $file"
        fi
    done

    echo ""
    echo "Rule changes:"
    echo ""

    for file in $changed_files; do
        if [[ -f "$file" ]]; then
            echo -e "${YELLOW}File: $file${NC}"

            # Show rule additions/removals
            git diff "$BASE_REF" "$HEAD_REF" -- "$file" | grep -E "^[+-]\s*(allow|deny|communication_rules)" | head -30 || true
            echo ""
        fi
    done
}

#############################################
# IMPACT ANALYSIS
#############################################

analyze_impact() {
    log_section "Impact Analysis"

    echo ""
    echo "Potentially affected services:"
    echo ""

    # Find services mentioned in changed files
    local changed_files
    changed_files=$(git diff --name-only "$BASE_REF" "$HEAD_REF" -- "$ROOT_DIR" 2>/dev/null || true)

    local services=()

    for file in $changed_files; do
        if [[ -f "$file" ]]; then
            # Extract service names from the file
            local found_services
            found_services=$(grep -oE "(ga-[a-z]+|intelgraph-[a-z]+|[a-z]+-service)" "$file" 2>/dev/null | sort -u || true)
            for svc in $found_services; do
                services+=("$svc")
            done
        fi
    done

    # Unique services
    printf '%s\n' "${services[@]}" | sort -u | while read -r svc; do
        if [[ -n "$svc" ]]; then
            echo "  • $svc"
        fi
    done

    echo ""
    echo "Recommended validation steps:"
    echo "  1. Run policy tests: ./tools/policy-lint.sh"
    echo "  2. Apply in staging first"
    echo "  3. Monitor for policy violations after deployment"
    echo "  4. Check service connectivity with chaos tests"
}

#############################################
# JSON OUTPUT
#############################################

output_json() {
    local changed_network
    local changed_opa

    changed_network=$(git diff --name-only "$BASE_REF" "$HEAD_REF" -- "$POLICIES_DIR/network" 2>/dev/null | tr '\n' ',' | sed 's/,$//' || echo "")
    changed_opa=$(git diff --name-only "$BASE_REF" "$HEAD_REF" -- "$POLICIES_DIR/opa" 2>/dev/null | tr '\n' ',' | sed 's/,$//' || echo "")

    cat <<EOF
{
    "base_ref": "$BASE_REF",
    "head_ref": "$HEAD_REF",
    "changes": {
        "network_policies": ["$changed_network"],
        "opa_policies": ["$changed_opa"]
    },
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
}

#############################################
# MAIN
#############################################

main() {
    if [[ "$OUTPUT_FORMAT" == "json" ]]; then
        output_json
        exit 0
    fi

    echo "=============================================="
    echo "Zero-Trust Policy Diff Report"
    echo "=============================================="
    echo ""
    echo "Comparing: $BASE_REF → $HEAD_REF"

    # Run all analyzers
    diff_network_policies
    diff_opa_policies
    generate_communication_report
    analyze_impact

    echo ""
    echo "=============================================="
    echo "End of Report"
    echo "=============================================="
}

main "$@"
