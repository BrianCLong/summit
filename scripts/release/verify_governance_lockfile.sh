#!/usr/bin/env bash
# verify_governance_lockfile.sh v1.0.0
# Verifies governance lockfile integrity and freshness
#
# This script performs comprehensive verification of the governance lockfile:
# - File existence and structure
# - SHA256 checksum verification
# - Freshness check (not too old)
# - Policy file inventory validation
#
# Authority: docs/ci/GOVERNANCE_LOCKFILE.md

set -euo pipefail

# --- Configuration ---
SCRIPT_VERSION="1.0.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"

# Default paths
LOCKFILE_PATH="${REPO_ROOT}/docs/releases/_state/governance_lockfile.json"
CHECKSUM_PATH="${REPO_ROOT}/docs/releases/_state/governance_SHA256SUMS"

# Default freshness threshold (days)
MAX_AGE_DAYS=7

# --- Logging ---
log_info() {
    echo "[INFO] $*" >&2
}

log_warn() {
    echo "[WARN] $*" >&2
}

log_error() {
    echo "[ERROR] $*" >&2
}

log_pass() {
    echo "[PASS] $*" >&2
}

log_fail() {
    echo "[FAIL] $*" >&2
}

# --- Usage ---
print_usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Verifies governance lockfile integrity and freshness.

OPTIONS:
    --lockfile PATH     Path to governance lockfile (default: docs/releases/_state/governance_lockfile.json)
    --checksums PATH    Path to checksums file (default: docs/releases/_state/governance_SHA256SUMS)
    --max-age DAYS      Maximum age in days before warning (default: 7)
    --strict            Treat warnings as errors
    --json              Output in JSON format
    --verbose           Enable verbose logging
    --help              Show this help message

VERIFICATIONS:
    1. Lockfile exists and is valid JSON
    2. Required fields are present
    3. SHA256 checksums match (if checksums file exists)
    4. Lockfile is not stale (within max-age threshold)
    5. Policy files referenced exist

EXIT CODES:
    0 - All verifications passed
    1 - Verification failed
    2 - Usage error

EXAMPLES:
    # Basic verification
    $0

    # Strict mode (warnings are errors)
    $0 --strict

    # Custom freshness threshold
    $0 --max-age 3

    # JSON output for CI
    $0 --json
EOF
}

# --- Verification Functions ---

verify_file_exists() {
    local file="$1"
    local desc="$2"

    if [[ -f "${file}" ]]; then
        return 0
    else
        return 1
    fi
}

verify_json_valid() {
    local file="$1"

    if jq empty "${file}" 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

verify_required_fields() {
    local file="$1"

    local required_fields=("version" "schema_version" "generated_at_utc" "summary" "files")
    local missing=()

    for field in "${required_fields[@]}"; do
        if ! jq -e ".${field}" "${file}" >/dev/null 2>&1; then
            missing+=("${field}")
        fi
    done

    if [[ ${#missing[@]} -eq 0 ]]; then
        return 0
    else
        echo "${missing[*]}"
        return 1
    fi
}

verify_checksums() {
    local checksums_file="$1"
    local base_dir="$2"

    if [[ ! -f "${checksums_file}" ]]; then
        return 2  # Checksums file not found (warning)
    fi

    cd "${base_dir}" || return 1

    if sha256sum -c "${checksums_file}" >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

verify_freshness() {
    local lockfile="$1"
    local max_age_days="$2"

    local generated_at
    generated_at=$(jq -r '.generated_at_utc // empty' "${lockfile}")

    if [[ -z "${generated_at}" ]]; then
        return 2  # Cannot determine age (warning)
    fi

    # Parse generated_at and compare with current time
    local generated_epoch current_epoch age_days
    generated_epoch=$(date -d "${generated_at}" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "${generated_at}" +%s 2>/dev/null || echo "0")
    current_epoch=$(date +%s)

    if [[ "${generated_epoch}" == "0" ]]; then
        return 2  # Cannot parse date (warning)
    fi

    age_days=$(( (current_epoch - generated_epoch) / 86400 ))

    if [[ ${age_days} -le ${max_age_days} ]]; then
        echo "${age_days}"
        return 0
    else
        echo "${age_days}"
        return 1
    fi
}

verify_policy_files() {
    local lockfile="$1"
    local repo_root="$2"

    local missing_files=()
    local total_files=0
    local found_files=0

    # Get list of files from lockfile
    while IFS= read -r file_path; do
        ((total_files++))
        # Remove "snapshot/" prefix if present
        local actual_path="${file_path#snapshot/}"

        if [[ -f "${repo_root}/${actual_path}" ]]; then
            ((found_files++))
        else
            missing_files+=("${actual_path}")
        fi
    done < <(jq -r '.files[].path' "${lockfile}" 2>/dev/null)

    if [[ ${#missing_files[@]} -eq 0 ]]; then
        echo "${found_files}/${total_files}"
        return 0
    else
        echo "${missing_files[*]}"
        return 1
    fi
}

# --- Main ---
main() {
    local lockfile="${LOCKFILE_PATH}"
    local checksums="${CHECKSUM_PATH}"
    local max_age="${MAX_AGE_DAYS}"
    local strict=false
    local json_output=false
    local verbose=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --lockfile)
                lockfile="$2"
                shift 2
                ;;
            --checksums)
                checksums="$2"
                shift 2
                ;;
            --max-age)
                max_age="$2"
                shift 2
                ;;
            --strict)
                strict=true
                shift
                ;;
            --json)
                json_output=true
                shift
                ;;
            --verbose)
                verbose=true
                shift
                ;;
            --help)
                print_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                print_usage
                exit 2
                ;;
        esac
    done

    [[ "${verbose}" == "true" ]] && log_info "Verifying governance lockfile..."
    [[ "${verbose}" == "true" ]] && log_info "  Lockfile: ${lockfile}"
    [[ "${verbose}" == "true" ]] && log_info "  Checksums: ${checksums}"
    [[ "${verbose}" == "true" ]] && log_info "  Max age: ${max_age} days"

    local checks_passed=0
    local checks_failed=0
    local checks_warned=0
    local results=()

    # 1. Check lockfile exists
    if verify_file_exists "${lockfile}" "Lockfile"; then
        ((++checks_passed)) || true
        results+=('{"check":"lockfile_exists","status":"pass"}')
        [[ "${verbose}" == "true" ]] && log_pass "Lockfile exists"
    else
        ((++checks_failed)) || true
        results+=('{"check":"lockfile_exists","status":"fail","message":"Lockfile not found"}')
        log_fail "Lockfile not found: ${lockfile}"
        # Cannot continue without lockfile
        if [[ "${json_output}" == "true" ]]; then
            echo "{\"version\":\"${SCRIPT_VERSION}\",\"status\":\"fail\",\"checks_passed\":0,\"checks_failed\":1,\"checks_warned\":0}"
        fi
        exit 1
    fi

    # 2. Check JSON validity
    if verify_json_valid "${lockfile}"; then
        ((++checks_passed)) || true
        results+=('{"check":"json_valid","status":"pass"}')
        [[ "${verbose}" == "true" ]] && log_pass "Lockfile is valid JSON"
    else
        ((++checks_failed)) || true
        results+=('{"check":"json_valid","status":"fail","message":"Invalid JSON"}')
        log_fail "Lockfile is not valid JSON"
    fi

    # 3. Check required fields
    local missing_fields
    if missing_fields=$(verify_required_fields "${lockfile}"); then
        ((++checks_passed)) || true
        results+=('{"check":"required_fields","status":"pass"}')
        [[ "${verbose}" == "true" ]] && log_pass "All required fields present"
    else
        ((++checks_failed)) || true
        results+=("{\"check\":\"required_fields\",\"status\":\"fail\",\"message\":\"Missing: ${missing_fields}\"}")
        log_fail "Missing required fields: ${missing_fields}"
    fi

    # 4. Check checksums (if file exists)
    local checksum_dir
    checksum_dir=$(dirname "${checksums}")
    local checksum_result
    checksum_result=$(verify_checksums "${checksums}" "${checksum_dir}"; echo $?)

    case "${checksum_result}" in
        0)
            ((++checks_passed)) || true
            results+=('{"check":"checksums","status":"pass"}')
            [[ "${verbose}" == "true" ]] && log_pass "Checksums verified"
            ;;
        1)
            ((++checks_failed)) || true
            results+=('{"check":"checksums","status":"fail","message":"Checksum mismatch"}')
            log_fail "Checksum verification failed"
            ;;
        2)
            ((++checks_warned)) || true
            results+=('{"check":"checksums","status":"warn","message":"Checksums file not found"}')
            [[ "${verbose}" == "true" ]] && log_warn "Checksums file not found, skipping verification"
            ;;
    esac

    # 5. Check freshness
    local age_result age_days
    age_days=$(verify_freshness "${lockfile}" "${max_age}") || age_result=$?
    age_result=${age_result:-0}

    case "${age_result}" in
        0)
            ((++checks_passed)) || true
            results+=("{\"check\":\"freshness\",\"status\":\"pass\",\"age_days\":${age_days}}")
            [[ "${verbose}" == "true" ]] && log_pass "Lockfile is fresh (${age_days} days old)"
            ;;
        1)
            if [[ "${strict}" == "true" ]]; then
                ((++checks_failed)) || true
                results+=("{\"check\":\"freshness\",\"status\":\"fail\",\"age_days\":${age_days},\"message\":\"Lockfile is stale\"}")
                log_fail "Lockfile is stale (${age_days} days old, max ${max_age})"
            else
                ((++checks_warned)) || true
                results+=("{\"check\":\"freshness\",\"status\":\"warn\",\"age_days\":${age_days},\"message\":\"Lockfile is stale\"}")
                log_warn "Lockfile is stale (${age_days} days old, max ${max_age})"
            fi
            ;;
        2)
            ((++checks_warned)) || true
            results+=('{"check":"freshness","status":"warn","message":"Cannot determine age"}')
            [[ "${verbose}" == "true" ]] && log_warn "Cannot determine lockfile age"
            ;;
    esac

    # 6. Check policy files exist
    local files_result policy_check
    policy_check=$(verify_policy_files "${lockfile}" "${REPO_ROOT}") || files_result=$?
    files_result=${files_result:-0}

    if [[ "${files_result}" -eq 0 ]]; then
        ((++checks_passed)) || true
        results+=("{\"check\":\"policy_files\",\"status\":\"pass\",\"files\":\"${policy_check}\"}")
        [[ "${verbose}" == "true" ]] && log_pass "Policy files verified (${policy_check})"
    else
        if [[ "${strict}" == "true" ]]; then
            ((++checks_failed)) || true
            results+=("{\"check\":\"policy_files\",\"status\":\"fail\",\"missing\":\"${policy_check}\"}")
            log_fail "Missing policy files: ${policy_check}"
        else
            ((++checks_warned)) || true
            results+=("{\"check\":\"policy_files\",\"status\":\"warn\",\"missing\":\"${policy_check}\"}")
            log_warn "Missing policy files: ${policy_check}"
        fi
    fi

    # Determine overall status
    local overall_status="pass"
    if [[ ${checks_failed} -gt 0 ]]; then
        overall_status="fail"
    elif [[ "${strict}" == "true" && ${checks_warned} -gt 0 ]]; then
        overall_status="fail"
    elif [[ ${checks_warned} -gt 0 ]]; then
        overall_status="warn"
    fi

    # Output
    if [[ "${json_output}" == "true" ]]; then
        local results_json
        results_json=$(printf '%s\n' "${results[@]}" | jq -s '.')

        jq -n \
            --arg version "${SCRIPT_VERSION}" \
            --arg status "${overall_status}" \
            --argjson passed "${checks_passed}" \
            --argjson failed "${checks_failed}" \
            --argjson warned "${checks_warned}" \
            --argjson results "${results_json}" \
            --arg generated "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
            '{
                version: $version,
                generated_at: $generated,
                status: $status,
                summary: {
                    checks_passed: $passed,
                    checks_failed: $failed,
                    checks_warned: $warned
                },
                results: $results
            }'
    else
        echo ""
        log_info "=== Verification Summary ==="
        log_info "  Passed: ${checks_passed}"
        log_info "  Failed: ${checks_failed}"
        log_info "  Warned: ${checks_warned}"
        echo ""

        if [[ "${overall_status}" == "pass" ]]; then
            log_pass "Governance lockfile verification PASSED"
        elif [[ "${overall_status}" == "warn" ]]; then
            log_warn "Governance lockfile verification passed with WARNINGS"
        else
            log_fail "Governance lockfile verification FAILED"
        fi
    fi

    # Exit with appropriate code
    if [[ "${overall_status}" == "fail" ]]; then
        exit 1
    elif [[ "${strict}" == "true" && "${overall_status}" == "warn" ]]; then
        exit 1
    fi

    exit 0
}

main "$@"
