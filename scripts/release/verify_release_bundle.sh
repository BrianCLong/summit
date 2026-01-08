#!/usr/bin/env bash
# verify_release_bundle.sh
# Offline verification of release bundles (RC or GA)
#
# Verifies bundle integrity including governance lockfile without network access.
# This script can be used by consumers to validate downloaded bundles.
#
# Usage:
#   ./verify_release_bundle.sh --bundle-dir ./my-bundle
#
# Options:
#   --bundle-dir DIR                  Bundle directory to verify (required)
#   --verify-governance-signature     Verify governance signature with cosign (default: on for GA if cosign available)
#   --no-verify-governance-signature  Skip governance signature verification
#   --strict                          Fail on any warning (default: fail on errors only)
#   --json                            Output in JSON format
#   --verbose                         Enable verbose output
#   --help                            Show this help message
#
# Authority: docs/ci/GOVERNANCE_LOCKFILE.md

set -euo pipefail

SCRIPT_VERSION="1.0.0"

# Configuration
BUNDLE_DIR=""
STRICT=false
JSON_OUTPUT=false
VERBOSE=false
VERIFY_SIGNATURE="auto"  # auto, true, false

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
verify_release_bundle.sh v${SCRIPT_VERSION}

Offline verification of release bundles (RC or GA).

Usage:
  $(basename "$0") --bundle-dir DIR [options]

Options:
  --bundle-dir DIR                  Bundle directory to verify (required)
  --verify-governance-signature     Verify governance signature with cosign
  --no-verify-governance-signature  Skip governance signature verification
  --strict                          Fail on any warning
  --json                            Output in JSON format
  --verbose                         Enable verbose output
  --help                            Show this help message

Verifies:
  - Bundle completeness (required files present)
  - Top-level SHA256SUMS integrity
  - Governance lockfile existence and integrity
  - Governance snapshot file hashes
  - Governance signature (if cosign available and --verify-governance-signature)
  - Metadata consistency

Examples:
  # Verify a downloaded GA bundle
  $(basename "$0") --bundle-dir ./v4.1.2-bundle

  # Verify with verbose output
  $(basename "$0") --bundle-dir ./bundle --verbose

  # Verify with governance signature verification
  $(basename "$0") --bundle-dir ./bundle --verify-governance-signature

  # Strict mode (warnings are errors)
  $(basename "$0") --bundle-dir ./bundle --strict
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

    # Extract metadata if available
    local bundle_type="unknown"
    local tag="null"
    local sha="null"

    if [[ -f "${BUNDLE_DIR}/ga_metadata.json" ]]; then
        bundle_type="ga-release"
        tag=$(jq -r '.release.ga_tag // "null"' "${BUNDLE_DIR}/ga_metadata.json" 2>/dev/null || echo "null")
        sha=$(jq -r '.release.commit_sha // "null"' "${BUNDLE_DIR}/ga_metadata.json" 2>/dev/null || echo "null")
    elif [[ -f "${BUNDLE_DIR}/promote_to_ga.sh" ]]; then
        bundle_type="rc-promotion"
    fi

    cat << EOF
{
  "version": "${SCRIPT_VERSION}",
  "status": "${status}",
  "bundle_dir": "${BUNDLE_DIR}",
  "bundle_type": "${bundle_type}",
  "tag": ${tag},
  "sha": ${sha},
  "summary": {
    "checks_total": ${CHECKS_TOTAL},
    "checks_passed": ${CHECKS_PASSED},
    "warnings": ${WARNINGS},
    "errors": ${ERRORS}
  },
  "verified": $([ $ERRORS -eq 0 ] && echo "true" || echo "false"),
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --bundle-dir)
            BUNDLE_DIR="$2"
            shift 2
            ;;
        --verify-governance-signature)
            VERIFY_SIGNATURE="true"
            shift
            ;;
        --no-verify-governance-signature)
            VERIFY_SIGNATURE="false"
            shift
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
if [[ -z "$BUNDLE_DIR" ]]; then
    log_error "Missing required argument: --bundle-dir"
    exit 2
fi

if [[ ! -d "$BUNDLE_DIR" ]]; then
    log_error "Bundle directory not found: $BUNDLE_DIR"
    exit 2
fi

if [[ "$JSON_OUTPUT" != "true" ]]; then
    echo ""
    echo "=============================================="
    echo "  RELEASE BUNDLE VERIFICATION"
    echo "=============================================="
    echo ""
    echo "Bundle: ${BUNDLE_DIR}"
    echo ""
    echo "Running checks..."
    echo ""
fi

# --- Section 1: Bundle Structure ---
log_verbose "Checking bundle structure..."

# Check 1: SHA256SUMS exists
if [[ -f "${BUNDLE_DIR}/SHA256SUMS" ]]; then
    check_pass "SHA256SUMS exists"

    # Check 2: Verify top-level checksums
    log_verbose "Verifying bundle checksums..."
    cd "${BUNDLE_DIR}"
    if sha256sum -c SHA256SUMS > /dev/null 2>&1; then
        check_pass "Bundle checksums verified"
    else
        # Try to identify which files failed
        FAILED_FILES=$(sha256sum -c SHA256SUMS 2>&1 | grep FAILED || echo "")
        if [[ -n "$FAILED_FILES" ]]; then
            check_fail "Bundle checksums" "Some files failed verification"
            log_verbose "Failed files: $FAILED_FILES"
        else
            check_fail "Bundle checksums" "Verification failed"
        fi
    fi
    cd - > /dev/null
else
    check_fail "SHA256SUMS" "Not found in bundle"
fi

# --- Section 2: Governance Lockfile ---
log_verbose "Checking governance lockfile..."

# Check 3: Governance directory exists
if [[ -d "${BUNDLE_DIR}/governance" ]]; then
    check_pass "Governance directory exists"

    # Check 4: Governance lockfile exists
    if [[ -f "${BUNDLE_DIR}/governance/governance_lockfile.json" ]]; then
        check_pass "Governance lockfile exists"

        # Check 5: Governance SHA256SUMS exists
        if [[ -f "${BUNDLE_DIR}/governance/governance_SHA256SUMS" ]]; then
            check_pass "Governance checksums exist"

            # Check 6: Verify governance checksums
            log_verbose "Verifying governance lockfile checksums..."
            cd "${BUNDLE_DIR}/governance"
            if sha256sum -c governance_SHA256SUMS > /dev/null 2>&1; then
                check_pass "Governance checksums verified"
            else
                FAILED=$(sha256sum -c governance_SHA256SUMS 2>&1 | grep FAILED || echo "")
                check_fail "Governance checksums" "Verification failed"
                log_verbose "Failed: $FAILED"
            fi
            cd - > /dev/null
        else
            check_fail "Governance checksums" "governance_SHA256SUMS not found"
        fi

        # Check 7: Governance lockfile structure
        if command -v jq > /dev/null 2>&1; then
            if jq -e '.version and .sha and .files' "${BUNDLE_DIR}/governance/governance_lockfile.json" > /dev/null 2>&1; then
                check_pass "Governance lockfile valid JSON structure"

                # Check 8: Verify lockfile files match snapshot
                log_verbose "Verifying lockfile file entries match snapshot..."
                LOCKFILE_VALID=true
                while IFS= read -r entry; do
                    FILE_PATH=$(echo "$entry" | jq -r '.path')
                    EXPECTED_HASH=$(echo "$entry" | jq -r '.sha256')
                    FULL_PATH="${BUNDLE_DIR}/governance/${FILE_PATH}"

                    if [[ -f "$FULL_PATH" ]]; then
                        ACTUAL_HASH=$(sha256sum "$FULL_PATH" | cut -d' ' -f1)
                        if [[ "$ACTUAL_HASH" != "$EXPECTED_HASH" ]]; then
                            log_verbose "Hash mismatch: $FILE_PATH"
                            LOCKFILE_VALID=false
                        fi
                    else
                        log_verbose "Missing file: $FILE_PATH"
                        LOCKFILE_VALID=false
                    fi
                done < <(jq -c '.files[]' "${BUNDLE_DIR}/governance/governance_lockfile.json")

                if [[ "$LOCKFILE_VALID" == "true" ]]; then
                    check_pass "Lockfile entries match snapshot files"
                else
                    check_fail "Lockfile entries" "Some files don't match or are missing"
                fi

                # Display lockfile summary
                FILE_COUNT=$(jq -r '.files | length' "${BUNDLE_DIR}/governance/governance_lockfile.json")
                LOCKFILE_SHA=$(jq -r '.sha' "${BUNDLE_DIR}/governance/governance_lockfile.json")
                LOCKFILE_TAG=$(jq -r '.tag // "none"' "${BUNDLE_DIR}/governance/governance_lockfile.json")
                log_verbose "Lockfile: ${FILE_COUNT} files, SHA=${LOCKFILE_SHA}, tag=${LOCKFILE_TAG}"
            else
                check_fail "Governance lockfile" "Invalid JSON structure"
            fi
        else
            check_warn "Governance lockfile structure" "jq not available for deep validation"
        fi
    else
        check_fail "Governance lockfile" "governance_lockfile.json not found"
    fi

    # Check 9: Snapshot directory exists and has files
    if [[ -d "${BUNDLE_DIR}/governance/snapshot" ]]; then
        SNAPSHOT_COUNT=$(find "${BUNDLE_DIR}/governance/snapshot" -type f | wc -l)
        if [[ "$SNAPSHOT_COUNT" -gt 0 ]]; then
            check_pass "Governance snapshot contains ${SNAPSHOT_COUNT} files"
        else
            check_warn "Governance snapshot" "Empty snapshot directory"
        fi
    else
        check_fail "Governance snapshot" "snapshot directory not found"
    fi

    # Check 10: Governance signature verification
    # Determine if we should verify signature
    SHOULD_VERIFY_SIG=false
    if [[ "$VERIFY_SIGNATURE" == "true" ]]; then
        SHOULD_VERIFY_SIG=true
    elif [[ "$VERIFY_SIGNATURE" == "auto" ]]; then
        # Auto-enable for GA bundles if cosign is available
        if [[ -f "${BUNDLE_DIR}/ga_metadata.json" ]] && command -v cosign > /dev/null 2>&1; then
            SHOULD_VERIFY_SIG=true
        fi
    fi

    if [[ -d "${BUNDLE_DIR}/governance/signatures" ]]; then
        if [[ -f "${BUNDLE_DIR}/governance/signatures/metadata.json" ]]; then
            check_pass "Governance signature metadata exists"

            # Get signature method
            SIG_METHOD=$(jq -r '.method // "unknown"' "${BUNDLE_DIR}/governance/signatures/metadata.json" 2>/dev/null || echo "unknown")

            if [[ "$SIG_METHOD" == "sigstore-cosign-oidc" ]]; then
                if [[ "$SHOULD_VERIFY_SIG" == "true" ]]; then
                    if command -v cosign > /dev/null 2>&1; then
                        log_verbose "Verifying governance signature with cosign..."
                        SIG_FILE="${BUNDLE_DIR}/governance/signatures/governance_SHA256SUMS.sig"
                        CERT_FILE="${BUNDLE_DIR}/governance/signatures/governance_SHA256SUMS.cert"
                        SUBJECT_FILE="${BUNDLE_DIR}/governance/governance_SHA256SUMS"

                        if [[ -f "$SIG_FILE" && -f "$CERT_FILE" && -f "$SUBJECT_FILE" ]]; then
                            export COSIGN_EXPERIMENTAL=1
                            if cosign verify-blob \
                                --signature "$SIG_FILE" \
                                --certificate "$CERT_FILE" \
                                --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
                                --certificate-identity-regexp "https://github.com/.*/summit/.github/workflows/.*" \
                                "$SUBJECT_FILE" > /dev/null 2>&1; then
                                check_pass "Governance signature verified (Sigstore OIDC)"
                            else
                                check_fail "Governance signature" "Verification failed - identity constraints not met"
                            fi
                        else
                            check_fail "Governance signature files" "Missing sig, cert, or subject file"
                        fi
                    else
                        check_warn "Governance signature" "cosign not available, skipping verification"
                    fi
                else
                    check_pass "Governance signature present (verification skipped)"
                fi
            elif [[ "$SIG_METHOD" == "unsigned" ]]; then
                SIG_REASON=$(jq -r '.reason // "unknown"' "${BUNDLE_DIR}/governance/signatures/metadata.json" 2>/dev/null || echo "unknown")
                if [[ "$SHOULD_VERIFY_SIG" == "true" && "$STRICT" == "true" ]]; then
                    check_fail "Governance signature" "Bundle is unsigned (reason: ${SIG_REASON})"
                else
                    check_warn "Governance signature" "Bundle is unsigned (reason: ${SIG_REASON})"
                fi
            else
                check_warn "Governance signature" "Unknown signature method: ${SIG_METHOD}"
            fi
        else
            check_warn "Governance signature" "No signature metadata found"
        fi
    else
        if [[ "$SHOULD_VERIFY_SIG" == "true" && "$STRICT" == "true" ]]; then
            check_fail "Governance signature" "No signatures directory (bundle is unsigned)"
        else
            log_verbose "No signatures directory (bundle may be unsigned)"
        fi
    fi
else
    check_warn "Governance directory" "Not present in bundle (may be RC bundle)"
fi

# --- Section 3: Bundle Metadata ---
log_verbose "Checking bundle metadata..."

# Check for GA or RC bundle metadata
if [[ -f "${BUNDLE_DIR}/ga_metadata.json" ]]; then
    check_pass "GA metadata present"
    log_verbose "Bundle type: GA Release"

    if command -v jq > /dev/null 2>&1; then
        # Check 10: Metadata structure
        if jq -e '.version and .release' "${BUNDLE_DIR}/ga_metadata.json" > /dev/null 2>&1; then
            check_pass "GA metadata valid structure"

            # Check 11: Governance lockfile reference in metadata
            if jq -e '.governance_lockfile.path' "${BUNDLE_DIR}/ga_metadata.json" > /dev/null 2>&1; then
                METADATA_LOCKFILE_PATH=$(jq -r '.governance_lockfile.path' "${BUNDLE_DIR}/ga_metadata.json")
                METADATA_LOCKFILE_HASH=$(jq -r '.governance_lockfile.sha256' "${BUNDLE_DIR}/ga_metadata.json")

                if [[ -f "${BUNDLE_DIR}/${METADATA_LOCKFILE_PATH}" ]]; then
                    ACTUAL_HASH=$(sha256sum "${BUNDLE_DIR}/${METADATA_LOCKFILE_PATH}" | cut -d' ' -f1)
                    if [[ "$ACTUAL_HASH" == "$METADATA_LOCKFILE_HASH" ]]; then
                        check_pass "Metadata lockfile reference verified"
                    else
                        check_fail "Metadata lockfile hash" "Mismatch in ga_metadata.json"
                    fi
                else
                    check_fail "Metadata lockfile path" "Referenced file not found"
                fi
            else
                check_warn "Metadata" "No governance_lockfile reference"
            fi
        else
            check_warn "GA metadata" "Missing required fields"
        fi
    fi
elif [[ -f "${BUNDLE_DIR}/promote_to_ga.sh" ]]; then
    check_pass "RC promotion bundle detected"
    log_verbose "Bundle type: RC Promotion"

    if [[ -f "${BUNDLE_DIR}/PROMOTION_CHECKLIST.md" ]]; then
        check_pass "Promotion checklist present"
    else
        check_warn "Promotion checklist" "Not found"
    fi
else
    check_warn "Bundle type" "Could not determine bundle type"
fi

# --- Output Results ---
if [[ "$JSON_OUTPUT" == "true" ]]; then
    output_json
else
    echo ""
    echo "=============================================="
    echo "  VERIFICATION SUMMARY"
    echo "=============================================="
    echo ""
    echo "Checks passed: ${CHECKS_PASSED}/${CHECKS_TOTAL}"
    echo "Warnings:      ${WARNINGS}"
    echo "Errors:        ${ERRORS}"
    echo ""

    if [[ $ERRORS -eq 0 ]]; then
        echo -e "${GREEN}VERIFICATION: PASSED${NC}"
        echo ""
        echo "Bundle integrity verified."
        if [[ -f "${BUNDLE_DIR}/governance/governance_lockfile.json" ]]; then
            echo "Governance lockfile validated."
        fi
    else
        echo -e "${RED}VERIFICATION: FAILED${NC}"
        echo ""
        echo "Bundle integrity could not be verified."
        echo "Do not use this bundle for deployment."
    fi
    echo ""
fi

# Exit with appropriate code
if [[ $ERRORS -gt 0 ]]; then
    exit 1
else
    exit 0
fi
