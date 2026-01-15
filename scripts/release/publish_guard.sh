#!/usr/bin/env bash
#
# publish_guard.sh - Final publish guard check before GA release
#
# This script performs comprehensive pre-publish verification:
# - Bundle completeness check
# - Checksum verification
# - Required artifacts present
# - Lineage verified
# - All gates passed
#
# Usage:
#   ./publish_guard.sh --tag v4.1.2 --sha abc123 [--bundle-dir DIR]
#
# Options:
#   --tag TAG           GA tag to verify
#   --sha SHA           Commit SHA
#   --bundle-dir DIR    Bundle directory to verify
#   --strict            Fail on any warning (default: fail on errors only)
#   --json              Output in JSON format
#   --verbose           Enable verbose output
#   --help              Show this help message
#

set -euo pipefail

SCRIPT_VERSION="1.0.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Configuration
GA_TAG=""
GA_SHA=""
BUNDLE_DIR=""
STRICT=false
JSON_OUTPUT=false
VERBOSE=false

# Tracking
ERRORS=0
WARNINGS=0
CHECKS_PASSED=0
CHECKS_TOTAL=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    if [[ "$JSON_OUTPUT" != "true" ]]; then
        echo -e "${BLUE}[INFO]${NC} $1"
    fi
}

log_success() {
    if [[ "$JSON_OUTPUT" != "true" ]]; then
        echo -e "${GREEN}[PASS]${NC} $1"
    fi
}

log_warn() {
    if [[ "$JSON_OUTPUT" != "true" ]]; then
        echo -e "${YELLOW}[WARN]${NC} $1"
    fi
}

log_error() {
    if [[ "$JSON_OUTPUT" != "true" ]]; then
        echo -e "${RED}[FAIL]${NC} $1" >&2
    fi
}

log_verbose() {
    if [[ "$VERBOSE" == "true" && "$JSON_OUTPUT" != "true" ]]; then
        echo -e "${BLUE}[VERBOSE]${NC} $1"
    fi
}

show_help() {
    cat << EOF
publish_guard.sh v${SCRIPT_VERSION}

Final publish guard check before GA release.

Usage:
  $(basename "$0") --tag TAG --sha SHA [options]

Options:
  --tag TAG           GA tag to verify
  --sha SHA           Commit SHA
  --bundle-dir DIR    Bundle directory to verify
  --strict            Fail on any warning
  --json              Output in JSON format
  --verbose           Enable verbose output
  --help              Show this help message

Examples:
  # Basic publish guard
  $(basename "$0") --tag v4.1.2 --sha abc123

  # With bundle verification
  $(basename "$0") --tag v4.1.2 --sha abc123 --bundle-dir ./ga-bundle

  # Strict mode (warnings are errors)
  $(basename "$0") --tag v4.1.2 --sha abc123 --strict
EOF
}

check_pass() {
    local name="$1"
    ((CHECKS_PASSED++))
    ((CHECKS_TOTAL++))
    log_success "$name"
}

check_fail() {
    local name="$1"
    local message="${2:-}"
    ((ERRORS++))
    ((CHECKS_TOTAL++))
    if [[ -n "$message" ]]; then
        log_error "$name: $message"
    else
        log_error "$name"
    fi
}

check_warn() {
    local name="$1"
    local message="${2:-}"
    ((WARNINGS++))
    ((CHECKS_TOTAL++))
    if [[ -n "$message" ]]; then
        log_warn "$name: $message"
    else
        log_warn "$name"
    fi
    if [[ "$STRICT" == "true" ]]; then
        ((ERRORS++))
    fi
}

output_json() {
    local status="passed"
    if [[ $ERRORS -gt 0 ]]; then
        status="failed"
    elif [[ $WARNINGS -gt 0 ]]; then
        status="warning"
    fi

    cat << EOF
{
  "version": "${SCRIPT_VERSION}",
  "status": "${status}",
  "ga_tag": "${GA_TAG}",
  "ga_sha": "${GA_SHA}",
  "bundle_dir": "${BUNDLE_DIR:-null}",
  "summary": {
    "checks_total": ${CHECKS_TOTAL},
    "checks_passed": ${CHECKS_PASSED},
    "warnings": ${WARNINGS},
    "errors": ${ERRORS}
  },
  "publish_allowed": $([ $ERRORS -eq 0 ] && echo "true" || echo "false"),
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --tag)
            GA_TAG="$2"
            shift 2
            ;;
        --sha)
            GA_SHA="$2"
            shift 2
            ;;
        --bundle-dir)
            BUNDLE_DIR="$2"
            shift 2
            ;;
        --strict)
            STRICT=true
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
    log_error "Missing required argument: --tag"
    exit 2
fi

if [[ -z "$GA_SHA" ]]; then
    log_error "Missing required argument: --sha"
    exit 2
fi

if [[ "$JSON_OUTPUT" != "true" ]]; then
    echo ""
    echo "=============================================="
    echo "  PUBLISH GUARD: ${GA_TAG}"
    echo "=============================================="
    echo ""
    echo "Tag:    ${GA_TAG}"
    echo "Commit: ${GA_SHA}"
    echo "Bundle: ${BUNDLE_DIR:-'(not specified)'}"
    echo ""
    echo "Running checks..."
    echo ""
fi

# Check 1: GA tag format
if [[ "$GA_TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    check_pass "GA tag format valid"
else
    check_fail "GA tag format" "Expected vX.Y.Z, got ${GA_TAG}"
fi

# Check 2: Not an RC tag
if [[ "$GA_TAG" =~ -rc\. ]]; then
    check_fail "Not an RC tag" "GA tag should not contain -rc."
else
    check_pass "Not an RC tag"
fi

# Check 3: SHA format
if [[ "$GA_SHA" =~ ^[a-f0-9]{7,40}$ ]]; then
    check_pass "SHA format valid"
else
    check_fail "SHA format" "Invalid SHA: ${GA_SHA}"
fi

# Check 4: RC lineage (if lineage script exists)
if [[ -f "${SCRIPT_DIR}/verify-rc-lineage.sh" ]]; then
    log_verbose "Running lineage verification..."
    if "${SCRIPT_DIR}/verify-rc-lineage.sh" --ga-tag "$GA_TAG" --ga-sha "$GA_SHA" --require-success > /dev/null 2>&1; then
        check_pass "RC lineage verified"
    else
        check_fail "RC lineage" "GA SHA does not match any RC"
    fi
else
    check_warn "RC lineage" "Lineage script not found, skipping"
fi

# Check 5: Verification status (if verify script exists)
if [[ -f "${SCRIPT_DIR}/verify-green-for-tag.sh" ]]; then
    log_verbose "Running verification check..."
    if "${SCRIPT_DIR}/verify-green-for-tag.sh" --tag "$GA_TAG" --commit "$GA_SHA" > /dev/null 2>&1; then
        check_pass "CI verification passed"
    else
        check_warn "CI verification" "Some checks may be pending"
    fi
else
    check_warn "CI verification" "Verification script not found"
fi

# Bundle checks (if bundle directory specified)
if [[ -n "$BUNDLE_DIR" && -d "$BUNDLE_DIR" ]]; then
    log_verbose "Checking bundle completeness..."

    # Check 6: Required files
    REQUIRED_FILES=(
        "github_release.md"
        "ga_metadata.json"
        "SHA256SUMS"
    )

    for file in "${REQUIRED_FILES[@]}"; do
        if [[ -f "${BUNDLE_DIR}/${file}" ]]; then
            check_pass "Bundle contains ${file}"
        else
            check_fail "Bundle missing ${file}"
        fi
    done

    # Check 7: Operator script
    if [[ -f "${BUNDLE_DIR}/publish_to_ga.sh" ]]; then
        if [[ -x "${BUNDLE_DIR}/publish_to_ga.sh" ]]; then
            check_pass "Operator script executable"
        else
            check_warn "Operator script" "Not executable"
        fi
    else
        check_warn "Operator script" "publish_to_ga.sh not found"
    fi

    # Check 8: Checksum verification
    if [[ -f "${BUNDLE_DIR}/SHA256SUMS" ]]; then
        log_verbose "Verifying checksums..."
        cd "${BUNDLE_DIR}"
        if sha256sum -c SHA256SUMS > /dev/null 2>&1; then
            check_pass "Checksums verified"
        else
            check_fail "Checksums" "Verification failed"
        fi
        cd - > /dev/null
    fi

    # Check 9: Metadata validation
    if [[ -f "${BUNDLE_DIR}/ga_metadata.json" ]]; then
        if command -v jq > /dev/null 2>&1; then
            if jq -e '.release.ga_tag' "${BUNDLE_DIR}/ga_metadata.json" > /dev/null 2>&1; then
                METADATA_TAG=$(jq -r '.release.ga_tag' "${BUNDLE_DIR}/ga_metadata.json")
                if [[ "$METADATA_TAG" == "$GA_TAG" ]]; then
                    check_pass "Metadata tag matches"
                else
                    check_fail "Metadata tag" "Expected ${GA_TAG}, got ${METADATA_TAG}"
                fi
            else
                check_warn "Metadata" "Could not parse ga_metadata.json"
            fi
        else
            check_warn "Metadata" "jq not available for validation"
        fi
    fi

    # Check 10: Governance lockfile exists (required for GA)
    if [[ -f "${BUNDLE_DIR}/governance/governance_lockfile.json" ]]; then
        check_pass "Governance lockfile exists"

        # Check 11: Governance SHA256SUMS exists
        if [[ -f "${BUNDLE_DIR}/governance/governance_SHA256SUMS" ]]; then
            check_pass "Governance checksums exist"

            # Check 12: Verify governance checksums
            log_verbose "Verifying governance lockfile checksums..."
            cd "${BUNDLE_DIR}/governance"
            if sha256sum -c governance_SHA256SUMS > /dev/null 2>&1; then
                check_pass "Governance checksums verified"
            else
                check_fail "Governance checksums" "Verification failed"
            fi
            cd - > /dev/null
        else
            check_fail "Governance checksums" "governance_SHA256SUMS not found"
        fi

        # Check 13: Governance lockfile has valid structure
        if command -v jq > /dev/null 2>&1; then
            if jq -e '.version and .sha and .files' "${BUNDLE_DIR}/governance/governance_lockfile.json" > /dev/null 2>&1; then
                LOCKFILE_SHA=$(jq -r '.sha' "${BUNDLE_DIR}/governance/governance_lockfile.json")
                if [[ "$LOCKFILE_SHA" == "$GA_SHA" ]]; then
                    check_pass "Governance lockfile SHA matches"
                else
                    check_warn "Governance lockfile SHA" "Expected ${GA_SHA}, got ${LOCKFILE_SHA}"
                fi

                FILE_COUNT=$(jq -r '.files | length' "${BUNDLE_DIR}/governance/governance_lockfile.json")
                if [[ "$FILE_COUNT" -gt 0 ]]; then
                    check_pass "Governance lockfile contains ${FILE_COUNT} files"
                else
                    check_warn "Governance lockfile" "No policy files captured"
                fi
            else
                check_fail "Governance lockfile" "Invalid structure"
            fi
        fi

        # Check 14: Governance signature verification (if signatures exist)
        if [[ -d "${BUNDLE_DIR}/governance/signatures" ]]; then
            if [[ -f "${BUNDLE_DIR}/governance/signatures/metadata.json" ]]; then
                check_pass "Governance signature metadata exists"

                # Check signature method
                local sig_method
                sig_method=$(jq -r '.method // "unknown"' "${BUNDLE_DIR}/governance/signatures/metadata.json" 2>/dev/null || echo "unknown")

                if [[ "$sig_method" == "sigstore-cosign-oidc" ]]; then
                    # Signature exists, verify it if cosign available
                    if command -v cosign > /dev/null 2>&1; then
                        log_verbose "Verifying governance signature with cosign..."
                        local sig_file="${BUNDLE_DIR}/governance/signatures/governance_SHA256SUMS.sig"
                        local cert_file="${BUNDLE_DIR}/governance/signatures/governance_SHA256SUMS.cert"
                        local subject_file="${BUNDLE_DIR}/governance/governance_SHA256SUMS"

                        if [[ -f "$sig_file" && -f "$cert_file" && -f "$subject_file" ]]; then
                            export COSIGN_EXPERIMENTAL=1
                            if cosign verify-blob \
                                --signature "$sig_file" \
                                --certificate "$cert_file" \
                                --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
                                --certificate-identity-regexp "https://github.com/.*/summit/.github/workflows/.*" \
                                "$subject_file" > /dev/null 2>&1; then
                                check_pass "Governance signature verified (Sigstore OIDC)"
                            else
                                check_fail "Governance signature" "Verification failed - identity constraints not met"
                            fi
                        else
                            check_fail "Governance signature files" "Missing sig, cert, or subject file"
                        fi
                    else
                        check_warn "Governance signature" "cosign not available for verification"
                    fi
                elif [[ "$sig_method" == "unsigned" ]]; then
                    local sig_reason
                    sig_reason=$(jq -r '.reason // "unknown"' "${BUNDLE_DIR}/governance/signatures/metadata.json" 2>/dev/null || echo "unknown")
                    check_warn "Governance signature" "Bundle is unsigned (reason: ${sig_reason})"
                else
                    check_warn "Governance signature" "Unknown signature method: ${sig_method}"
                fi
            else
                check_warn "Governance signature" "No signature metadata found"
            fi
        else
            check_warn "Governance signature" "No signatures directory (bundle may be unsigned)"
        fi
    else
        check_fail "Governance lockfile" "governance_lockfile.json not found (required for GA)"
    fi
elif [[ -n "$BUNDLE_DIR" ]]; then
    check_fail "Bundle directory" "Directory not found: ${BUNDLE_DIR}"
fi

# Output results
if [[ "$JSON_OUTPUT" == "true" ]]; then
    output_json
else
    echo ""
    echo "=============================================="
    echo "  PUBLISH GUARD SUMMARY"
    echo "=============================================="
    echo ""
    echo "Checks passed: ${CHECKS_PASSED}/${CHECKS_TOTAL}"
    echo "Warnings:      ${WARNINGS}"
    echo "Errors:        ${ERRORS}"
    echo ""

    if [[ $ERRORS -eq 0 ]]; then
        echo -e "${GREEN}PUBLISH GUARD: PASSED${NC}"
        echo ""
        echo "GA release ${GA_TAG} is ready for publishing."
        echo "Proceed with two-person approval in ga-release environment."
    else
        echo -e "${RED}PUBLISH GUARD: FAILED${NC}"
        echo ""
        echo "Cannot proceed with GA release. Fix the errors above."
    fi
    echo ""
fi

# Exit with appropriate code
if [[ $ERRORS -gt 0 ]]; then
    exit 1
else
    exit 0
fi
