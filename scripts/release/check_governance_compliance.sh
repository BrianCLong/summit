#!/usr/bin/env bash
# check_governance_compliance.sh v1.0.0
# Comprehensive governance compliance checker
#
# This script performs a full compliance audit including:
# - Required policy presence
# - Policy syntax validation
# - Lockfile integrity
# - State flag analysis
# - Drift detection
# - Overall compliance scoring
#
# Authority: docs/ci/GOVERNANCE_LOCKFILE.md

set -euo pipefail

# --- Configuration ---
SCRIPT_VERSION="1.0.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"

# Required policies that MUST exist for compliance
REQUIRED_POLICIES=(
    "REQUIRED_CHECKS_POLICY.yml"
    "ERROR_BUDGET_POLICY.yml"
)

# Optional policies (warning if missing)
OPTIONAL_POLICIES=(
    "REQUIRED_CHECKS_EXCEPTIONS.yml"
    "REDACTION_POLICY.yml"
    "RELEASE_OPS_SLO_POLICY.yml"
    "BLOCKER_ESCALATION_POLICY.yml"
    "CHANGELOG_POLICY.yml"
    "TYPE_SAFETY_POLICY.yml"
)

# Required state files
REQUIRED_STATE_FILES=(
    "freeze_mode.json"
)

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

log_check() {
    local status="$1"
    local check="$2"
    local message="$3"

    case "${status}" in
        pass) echo "[✓] ${check}: ${message}" >&2 ;;
        fail) echo "[✗] ${check}: ${message}" >&2 ;;
        warn) echo "[!] ${check}: ${message}" >&2 ;;
        skip) echo "[-] ${check}: ${message}" >&2 ;;
    esac
}

# --- Usage ---
print_usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Performs comprehensive governance compliance checking.

OPTIONS:
    --strict              Treat warnings as failures
    --require-lockfile    Require governance lockfile (default: true)
    --max-age DAYS        Maximum lockfile age in days (default: 7)
    --json                Output results as JSON
    --verbose             Enable verbose logging
    --help                Show this help message

EXAMPLES:
    # Basic compliance check
    $0

    # Strict mode for CI
    $0 --strict --json

    # Custom lockfile age requirement
    $0 --max-age 14
EOF
}

# --- Compliance Checks ---

check_required_policies() {
    local passed=0
    local failed=0
    local results=()

    for policy in "${REQUIRED_POLICIES[@]}"; do
        local policy_path="${REPO_ROOT}/docs/ci/${policy}"
        if [[ -f "${policy_path}" ]]; then
            log_check "pass" "Required Policy" "${policy} exists"
            results+=("{\"policy\": \"${policy}\", \"status\": \"pass\", \"required\": true}")
            ((++passed)) || true
        else
            log_check "fail" "Required Policy" "${policy} MISSING"
            results+=("{\"policy\": \"${policy}\", \"status\": \"fail\", \"required\": true}")
            ((++failed)) || true
        fi
    done

    echo "{\"passed\": ${passed}, \"failed\": ${failed}, \"results\": [$(IFS=,; echo "${results[*]}")]}"
}

check_optional_policies() {
    local present=0
    local missing=0
    local results=()

    for policy in "${OPTIONAL_POLICIES[@]}"; do
        local policy_path="${REPO_ROOT}/docs/ci/${policy}"
        if [[ -f "${policy_path}" ]]; then
            log_check "pass" "Optional Policy" "${policy} exists"
            results+=("{\"policy\": \"${policy}\", \"status\": \"pass\", \"required\": false}")
            ((++present)) || true
        else
            log_check "warn" "Optional Policy" "${policy} not found"
            results+=("{\"policy\": \"${policy}\", \"status\": \"warn\", \"required\": false}")
            ((++missing)) || true
        fi
    done

    echo "{\"present\": ${present}, \"missing\": ${missing}, \"results\": [$(IFS=,; echo "${results[*]}")]}"
}

check_policy_syntax() {
    local validator="${SCRIPT_DIR}/validate_governance_policies.sh"

    if [[ -x "${validator}" ]]; then
        local output
        output=$("${validator}" --json 2>/dev/null) || true

        if echo "${output}" | jq empty 2>/dev/null; then
            local status passed failed
            status=$(echo "${output}" | jq -r '.status // "unknown"')
            passed=$(echo "${output}" | jq -r '.summary.passed // 0')
            failed=$(echo "${output}" | jq -r '.summary.failed // 0')

            if [[ "${status}" == "pass" ]]; then
                log_check "pass" "Policy Syntax" "All ${passed} policies valid"
            else
                log_check "fail" "Policy Syntax" "${failed} policy validation error(s)"
            fi

            echo "${output}"
        else
            log_check "fail" "Policy Syntax" "Validation returned invalid output"
            echo '{"status":"error","summary":{"passed":0,"failed":0}}'
        fi
    else
        log_check "skip" "Policy Syntax" "Validator not available"
        echo '{"status":"skipped","summary":{"passed":0,"failed":0}}'
    fi
}

check_lockfile() {
    local require_lockfile="$1"
    local max_age="$2"
    local lockfile="${REPO_ROOT}/docs/releases/_state/governance_lockfile.json"
    local verifier="${SCRIPT_DIR}/verify_governance_lockfile.sh"

    if [[ ! -f "${lockfile}" ]]; then
        if [[ "${require_lockfile}" == "true" ]]; then
            log_check "fail" "Lockfile" "Required but not found"
            echo '{"exists":false,"status":"fail","required":true}'
        else
            log_check "warn" "Lockfile" "Not present"
            echo '{"exists":false,"status":"warn","required":false}'
        fi
        return
    fi

    if [[ -x "${verifier}" ]]; then
        local output
        output=$("${verifier}" --json --max-age "${max_age}" 2>/dev/null) || true

        if echo "${output}" | jq empty 2>/dev/null; then
            local status
            status=$(echo "${output}" | jq -r '.status // "unknown"')

            if [[ "${status}" == "pass" ]]; then
                log_check "pass" "Lockfile" "Valid and within age limit"
            else
                log_check "fail" "Lockfile" "Verification failed"
            fi

            echo "{\"exists\":true,\"verification\":${output}}"
        else
            log_check "warn" "Lockfile" "Exists but verification failed"
            echo '{"exists":true,"status":"error"}'
        fi
    else
        # Basic existence check
        local hash
        hash=$(sha256sum "${lockfile}" | cut -d' ' -f1)
        log_check "pass" "Lockfile" "Present (hash: ${hash:0:16}...)"
        echo "{\"exists\":true,\"hash\":\"${hash}\",\"status\":\"pass\"}"
    fi
}

check_state_files() {
    local passed=0
    local failed=0
    local warnings=0
    local results=()

    for state_file in "${REQUIRED_STATE_FILES[@]}"; do
        local state_path="${REPO_ROOT}/docs/releases/_state/${state_file}"
        if [[ -f "${state_path}" ]]; then
            # Validate JSON
            if jq empty "${state_path}" 2>/dev/null; then
                log_check "pass" "State File" "${state_file} valid"
                results+=("{\"file\": \"${state_file}\", \"status\": \"pass\"}")
                ((++passed)) || true
            else
                log_check "fail" "State File" "${state_file} invalid JSON"
                results+=("{\"file\": \"${state_file}\", \"status\": \"fail\", \"reason\": \"invalid JSON\"}")
                ((++failed)) || true
            fi
        else
            log_check "warn" "State File" "${state_file} not found"
            results+=("{\"file\": \"${state_file}\", \"status\": \"warn\", \"reason\": \"not found\"}")
            ((++warnings)) || true
        fi
    done

    # Check for concerning state conditions
    local freeze_file="${REPO_ROOT}/docs/releases/_state/freeze_mode.json"
    if [[ -f "${freeze_file}" ]]; then
        local frozen
        frozen=$(jq -r '.frozen // false' "${freeze_file}" 2>/dev/null || echo "false")
        if [[ "${frozen}" == "true" ]]; then
            log_check "warn" "State" "Freeze mode is ACTIVE"
            ((++warnings)) || true
        fi
    fi

    echo "{\"passed\": ${passed}, \"failed\": ${failed}, \"warnings\": ${warnings}, \"results\": [$(IFS=,; echo "${results[*]}")]}"
}

check_governance_health() {
    local health_checker="${SCRIPT_DIR}/compute_governance_health.sh"

    if [[ -x "${health_checker}" ]]; then
        local output
        output=$("${health_checker}" 2>/dev/null) || true

        if echo "${output}" | jq empty 2>/dev/null; then
            local status score
            status=$(echo "${output}" | jq -r '.overall.status // "UNKNOWN"')
            score=$(echo "${output}" | jq -r '.overall.score // 0')

            case "${status}" in
                OK) log_check "pass" "Health" "Status: ${status}, Score: ${score}%" ;;
                WARNING) log_check "warn" "Health" "Status: ${status}, Score: ${score}%" ;;
                CRITICAL) log_check "fail" "Health" "Status: ${status}, Score: ${score}%" ;;
                *) log_check "warn" "Health" "Status: ${status}, Score: ${score}%" ;;
            esac

            echo "${output}"
        else
            log_check "fail" "Health" "Health check returned invalid output"
            echo '{"overall":{"status":"ERROR","score":0}}'
        fi
    else
        log_check "skip" "Health" "Health checker not available"
        echo '{"overall":{"status":"SKIPPED","score":0}}'
    fi
}

# --- Scoring ---

calculate_compliance_score() {
    local required_policies_result="$1"
    local policy_syntax_result="$2"
    local lockfile_result="$3"
    local state_files_result="$4"
    local health_result="$5"

    local total_score=0
    local weights_sum=0

    # Required policies: 25% weight
    local req_passed req_failed
    req_passed=$(echo "${required_policies_result}" | jq -r '.passed // 0')
    req_failed=$(echo "${required_policies_result}" | jq -r '.failed // 0')
    local req_total=$((req_passed + req_failed))
    if [[ ${req_total} -gt 0 ]]; then
        local req_score=$((req_passed * 100 / req_total))
        total_score=$((total_score + req_score * 25))
        weights_sum=$((weights_sum + 25))
    fi

    # Policy syntax: 25% weight
    local syntax_status
    syntax_status=$(echo "${policy_syntax_result}" | jq -r '.status // "unknown"')
    case "${syntax_status}" in
        pass) total_score=$((total_score + 100 * 25)); weights_sum=$((weights_sum + 25)) ;;
        fail) total_score=$((total_score + 0)); weights_sum=$((weights_sum + 25)) ;;
        *) ;; # Skip if unknown
    esac

    # Lockfile: 25% weight
    local lockfile_exists lockfile_status
    lockfile_exists=$(echo "${lockfile_result}" | jq -r '.exists // false')
    lockfile_status=$(echo "${lockfile_result}" | jq -r '.verification.status // .status // "unknown"')
    if [[ "${lockfile_exists}" == "true" && "${lockfile_status}" == "pass" ]]; then
        total_score=$((total_score + 100 * 25))
    elif [[ "${lockfile_exists}" == "true" ]]; then
        total_score=$((total_score + 50 * 25))
    fi
    weights_sum=$((weights_sum + 25))

    # Health: 25% weight
    local health_score
    health_score=$(echo "${health_result}" | jq -r '.overall.score // 0')
    total_score=$((total_score + health_score * 25))
    weights_sum=$((weights_sum + 25))

    if [[ ${weights_sum} -gt 0 ]]; then
        echo $((total_score / weights_sum))
    else
        echo 0
    fi
}

determine_compliance_status() {
    local score="$1"
    local strict="$2"
    local required_policies_result="$3"
    local lockfile_result="$4"

    # Check for hard failures
    local req_failed
    req_failed=$(echo "${required_policies_result}" | jq -r '.failed // 0')
    if [[ ${req_failed} -gt 0 ]]; then
        echo "NON_COMPLIANT"
        return
    fi

    # Check lockfile if required
    local lockfile_status
    lockfile_status=$(echo "${lockfile_result}" | jq -r '.status // "pass"')
    if [[ "${lockfile_status}" == "fail" ]]; then
        echo "NON_COMPLIANT"
        return
    fi

    # Score-based determination
    if [[ ${score} -ge 90 ]]; then
        echo "COMPLIANT"
    elif [[ ${score} -ge 70 ]]; then
        if [[ "${strict}" == "true" ]]; then
            echo "NON_COMPLIANT"
        else
            echo "PARTIALLY_COMPLIANT"
        fi
    else
        echo "NON_COMPLIANT"
    fi
}

# --- Output ---

render_json() {
    local score="$1"
    local status="$2"
    local required_policies="$3"
    local optional_policies="$4"
    local policy_syntax="$5"
    local lockfile="$6"
    local state_files="$7"
    local health="$8"

    # Write to temp files to avoid bash variable expansion issues
    local tmpdir
    tmpdir=$(mktemp -d)
    trap "rm -rf ${tmpdir}" EXIT

    echo "${required_policies}" > "${tmpdir}/required.json"
    echo "${optional_policies}" > "${tmpdir}/optional.json"
    echo "${policy_syntax}" > "${tmpdir}/syntax.json"
    echo "${lockfile}" > "${tmpdir}/lockfile.json"
    echo "${state_files}" > "${tmpdir}/state.json"
    echo "${health}" > "${tmpdir}/health.json"

    jq -n \
        --arg version "${SCRIPT_VERSION}" \
        --arg generated "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        --argjson score "${score}" \
        --arg status "${status}" \
        --slurpfile required "${tmpdir}/required.json" \
        --slurpfile optional "${tmpdir}/optional.json" \
        --slurpfile syntax "${tmpdir}/syntax.json" \
        --slurpfile lockfile "${tmpdir}/lockfile.json" \
        --slurpfile state "${tmpdir}/state.json" \
        --slurpfile health "${tmpdir}/health.json" \
        '{
            version: $version,
            generated_at: $generated,
            compliance: {
                status: $status,
                score: $score
            },
            checks: {
                required_policies: $required[0],
                optional_policies: $optional[0],
                policy_syntax: $syntax[0],
                lockfile: $lockfile[0],
                state_files: $state[0],
                governance_health: $health[0]
            }
        }'
}

render_summary() {
    local score="$1"
    local status="$2"

    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo "             GOVERNANCE COMPLIANCE SUMMARY                  "
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    echo "  Status: ${status}"
    echo "  Score:  ${score}%"
    echo ""

    case "${status}" in
        COMPLIANT)
            echo "  ✅ All governance requirements are met."
            ;;
        PARTIALLY_COMPLIANT)
            echo "  ⚠️  Some governance requirements need attention."
            echo "     Review warnings above and address as needed."
            ;;
        NON_COMPLIANT)
            echo "  ❌ Governance requirements are NOT met."
            echo "     Review failures above and remediate before release."
            ;;
    esac

    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo ""
}

# --- Main ---
main() {
    local strict=false
    local require_lockfile=true
    local max_age=7
    local json_output=false
    local verbose=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --strict)
                strict=true
                shift
                ;;
            --require-lockfile)
                require_lockfile=true
                shift
                ;;
            --no-require-lockfile)
                require_lockfile=false
                shift
                ;;
            --max-age)
                max_age="$2"
                shift 2
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
                exit 1
                ;;
        esac
    done

    [[ "${verbose}" == "true" ]] && log_info "Starting compliance check..."
    [[ "${verbose}" == "true" ]] && log_info "  Strict mode: ${strict}"
    [[ "${verbose}" == "true" ]] && log_info "  Require lockfile: ${require_lockfile}"
    [[ "${verbose}" == "true" ]] && log_info "  Max lockfile age: ${max_age} days"

    echo "" >&2
    echo "───────────────────────────────────────────────────────────" >&2
    echo "           GOVERNANCE COMPLIANCE CHECK                     " >&2
    echo "───────────────────────────────────────────────────────────" >&2
    echo "" >&2

    # Run checks
    log_info "Checking required policies..."
    local required_policies_result
    required_policies_result=$(check_required_policies)

    log_info "Checking optional policies..."
    local optional_policies_result
    optional_policies_result=$(check_optional_policies)

    log_info "Checking policy syntax..."
    local policy_syntax_result
    policy_syntax_result=$(check_policy_syntax)

    log_info "Checking governance lockfile..."
    local lockfile_result
    lockfile_result=$(check_lockfile "${require_lockfile}" "${max_age}")

    log_info "Checking state files..."
    local state_files_result
    state_files_result=$(check_state_files)

    log_info "Checking governance health..."
    local health_result
    health_result=$(check_governance_health)

    # Calculate score and status
    local score status
    score=$(calculate_compliance_score "${required_policies_result}" "${policy_syntax_result}" "${lockfile_result}" "${state_files_result}" "${health_result}")
    status=$(determine_compliance_status "${score}" "${strict}" "${required_policies_result}" "${lockfile_result}")

    # Output
    if [[ "${json_output}" == "true" ]]; then
        render_json "${score}" "${status}" \
            "${required_policies_result}" "${optional_policies_result}" \
            "${policy_syntax_result}" "${lockfile_result}" \
            "${state_files_result}" "${health_result}"
    else
        render_summary "${score}" "${status}"
    fi

    # Exit code based on status
    case "${status}" in
        COMPLIANT) exit 0 ;;
        PARTIALLY_COMPLIANT) exit 0 ;;  # Success with warnings
        NON_COMPLIANT) exit 1 ;;
    esac
}

main "$@"
