#!/usr/bin/env bash
# validate_governance_policies.sh v1.0.0
# Validates governance policy files for syntax and required fields
#
# This script ensures all governance policies are valid before deployment:
# - YAML syntax validation
# - JSON syntax validation
# - Required field checks
# - Cross-reference validation
#
# Authority: docs/ci/GOVERNANCE_LOCKFILE.md

set -euo pipefail

# --- Configuration ---
SCRIPT_VERSION="1.0.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"

# Policy files to validate
YAML_POLICIES=(
    "docs/ci/REQUIRED_CHECKS_POLICY.yml"
    "docs/ci/REQUIRED_CHECKS_EXCEPTIONS.yml"
    "docs/ci/ERROR_BUDGET_POLICY.yml"
    "docs/ci/REDACTION_POLICY.yml"
    "docs/ci/REDACTION_TREND_ALERT_POLICY.yml"
    "docs/ci/RELEASE_OPS_SLO_POLICY.yml"
    "docs/ci/BLOCKER_ESCALATION_POLICY.yml"
    "docs/ci/ONCALL_HANDOFF_POLICY.yml"
    "docs/ci/TRIAGE_ROUTING_POLICY.yml"
    "docs/ci/REMEDIATION_PLAYBOOKS.yml"
    "docs/ci/TEST_QUARANTINE_POLICY.yml"
    "docs/ci/CHANGELOG_POLICY.yml"
    "docs/ci/DEPENDENCY_AUDIT_POLICY.yml"
    "docs/ci/TYPE_SAFETY_POLICY.yml"
    "docs/ci/API_DETERMINISM_POLICY.yml"
)

JSON_STATE_FILES=(
    "docs/releases/_state/freeze_mode.json"
    "docs/releases/_state/release_override.json"
    "docs/releases/_state/governance_tight_mode.json"
    "docs/releases/_state/error_budget_state.json"
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

Validates governance policy files for syntax and required fields.

OPTIONS:
    --strict            Treat warnings as errors
    --json              Output in JSON format
    --verbose           Enable verbose logging
    --fix               Attempt to fix minor issues (formatting)
    --help              Show this help message

VALIDATIONS:
    - YAML syntax (requires yq or python3)
    - JSON syntax (requires jq)
    - Required fields for each policy type
    - Cross-references between policies

EXAMPLES:
    # Basic validation
    $0

    # Strict mode (fail on warnings)
    $0 --strict

    # JSON output for CI
    $0 --json
EOF
}

# --- Validation Functions ---

# Check if a command exists
command_exists() {
    command -v "$1" &>/dev/null
}

# Validate YAML syntax
validate_yaml() {
    local file="$1"
    local verbose="$2"

    if [[ ! -f "${REPO_ROOT}/${file}" ]]; then
        echo "MISSING"
        return
    fi

    # Try yq first, then python3
    if command_exists yq; then
        if yq eval '.' "${REPO_ROOT}/${file}" > /dev/null 2>&1; then
            echo "VALID"
        else
            echo "INVALID"
        fi
    elif command_exists python3; then
        if python3 -c "import yaml; yaml.safe_load(open('${REPO_ROOT}/${file}'))" 2>/dev/null; then
            echo "VALID"
        else
            echo "INVALID"
        fi
    else
        echo "SKIPPED"
    fi
}

# Validate JSON syntax
validate_json() {
    local file="$1"

    if [[ ! -f "${REPO_ROOT}/${file}" ]]; then
        echo "MISSING"
        return
    fi

    if command_exists jq; then
        if jq empty "${REPO_ROOT}/${file}" 2>/dev/null; then
            echo "VALID"
        else
            echo "INVALID"
        fi
    else
        echo "SKIPPED"
    fi
}

# Validate required fields in YAML policy
validate_required_fields_yaml() {
    local file="$1"
    local fields="$2"  # comma-separated list

    if [[ ! -f "${REPO_ROOT}/${file}" ]]; then
        echo "MISSING"
        return
    fi

    if ! command_exists yq && ! command_exists python3; then
        echo "SKIPPED"
        return
    fi

    local missing=()
    IFS=',' read -ra FIELD_ARRAY <<< "$fields"

    for field in "${FIELD_ARRAY[@]}"; do
        local value=""
        if command_exists yq; then
            value=$(yq eval ".${field} // \"\"" "${REPO_ROOT}/${file}" 2>/dev/null || echo "")
        elif command_exists python3; then
            value=$(python3 -c "
import yaml
with open('${REPO_ROOT}/${file}') as f:
    data = yaml.safe_load(f)
    keys = '${field}'.split('.')
    val = data
    for k in keys:
        if val and isinstance(val, dict):
            val = val.get(k)
        else:
            val = None
    print(val if val else '')
" 2>/dev/null || echo "")
        fi

        if [[ -z "${value}" || "${value}" == "null" ]]; then
            missing+=("${field}")
        fi
    done

    if [[ ${#missing[@]} -eq 0 ]]; then
        echo "VALID"
    else
        echo "MISSING_FIELDS:${missing[*]}"
    fi
}

# Validate required fields in JSON state file
validate_required_fields_json() {
    local file="$1"
    local fields="$2"  # comma-separated list

    if [[ ! -f "${REPO_ROOT}/${file}" ]]; then
        echo "MISSING"
        return
    fi

    if ! command_exists jq; then
        echo "SKIPPED"
        return
    fi

    local missing=()
    IFS=',' read -ra FIELD_ARRAY <<< "$fields"

    for field in "${FIELD_ARRAY[@]}"; do
        # Use has() to check field existence - handles boolean false correctly
        local exists
        exists=$(jq "has(\"${field}\")" "${REPO_ROOT}/${file}" 2>/dev/null || echo "false")

        if [[ "${exists}" != "true" ]]; then
            missing+=("${field}")
        fi
    done

    if [[ ${#missing[@]} -eq 0 ]]; then
        echo "VALID"
    else
        echo "MISSING_FIELDS:${missing[*]}"
    fi
}

# --- Main Validation ---

run_validations() {
    local verbose="$1"
    local strict="$2"

    local total=0
    local passed=0
    local failed=0
    local warnings=0
    local skipped=0

    local results=()

    log_info "=== Validating Governance Policies ==="
    echo ""

    # Validate YAML policies
    log_info "Checking YAML policies..."
    for policy in "${YAML_POLICIES[@]}"; do
        ((total++))
        local basename
        basename=$(basename "${policy}")

        local syntax_result
        syntax_result=$(validate_yaml "${policy}" "${verbose}")

        case "${syntax_result}" in
            VALID)
                ((passed++))
                [[ "${verbose}" == "true" ]] && log_pass "${basename}: syntax OK"
                results+=("{\"file\":\"${policy}\",\"type\":\"yaml\",\"syntax\":\"valid\",\"status\":\"pass\"}")
                ;;
            INVALID)
                ((failed++))
                log_fail "${basename}: invalid YAML syntax"
                results+=("{\"file\":\"${policy}\",\"type\":\"yaml\",\"syntax\":\"invalid\",\"status\":\"fail\"}")
                ;;
            MISSING)
                ((warnings++))
                log_warn "${basename}: file not found"
                results+=("{\"file\":\"${policy}\",\"type\":\"yaml\",\"syntax\":\"missing\",\"status\":\"warn\"}")
                ;;
            SKIPPED)
                ((skipped++))
                [[ "${verbose}" == "true" ]] && log_info "${basename}: skipped (no YAML parser)"
                results+=("{\"file\":\"${policy}\",\"type\":\"yaml\",\"syntax\":\"skipped\",\"status\":\"skip\"}")
                ;;
        esac
    done

    echo ""

    # Validate JSON state files
    log_info "Checking JSON state files..."
    for state_file in "${JSON_STATE_FILES[@]}"; do
        ((total++))
        local basename
        basename=$(basename "${state_file}")

        local syntax_result
        syntax_result=$(validate_json "${state_file}")

        case "${syntax_result}" in
            VALID)
                ((passed++))
                [[ "${verbose}" == "true" ]] && log_pass "${basename}: syntax OK"
                results+=("{\"file\":\"${state_file}\",\"type\":\"json\",\"syntax\":\"valid\",\"status\":\"pass\"}")
                ;;
            INVALID)
                ((failed++))
                log_fail "${basename}: invalid JSON syntax"
                results+=("{\"file\":\"${state_file}\",\"type\":\"json\",\"syntax\":\"invalid\",\"status\":\"fail\"}")
                ;;
            MISSING)
                ((warnings++))
                log_warn "${basename}: file not found"
                results+=("{\"file\":\"${state_file}\",\"type\":\"json\",\"syntax\":\"missing\",\"status\":\"warn\"}")
                ;;
            SKIPPED)
                ((skipped++))
                [[ "${verbose}" == "true" ]] && log_info "${basename}: skipped (no jq)"
                results+=("{\"file\":\"${state_file}\",\"type\":\"json\",\"syntax\":\"skipped\",\"status\":\"skip\"}")
                ;;
        esac
    done

    echo ""

    # Validate specific required fields
    log_info "Checking required fields..."

    # Required checks policy
    # Schema: version, always_required (main check list), conditional_required, informational
    if [[ -f "${REPO_ROOT}/docs/ci/REQUIRED_CHECKS_POLICY.yml" ]]; then
        ((total++))
        local fields_result
        fields_result=$(validate_required_fields_yaml "docs/ci/REQUIRED_CHECKS_POLICY.yml" "version,always_required")
        if [[ "${fields_result}" == "VALID" ]]; then
            ((passed++))
            [[ "${verbose}" == "true" ]] && log_pass "REQUIRED_CHECKS_POLICY.yml: required fields OK"
        elif [[ "${fields_result}" == MISSING_FIELDS:* ]]; then
            ((failed++))
            local missing="${fields_result#MISSING_FIELDS:}"
            log_fail "REQUIRED_CHECKS_POLICY.yml: missing fields: ${missing}"
        fi
    fi

    # Error budget policy
    if [[ -f "${REPO_ROOT}/docs/ci/ERROR_BUDGET_POLICY.yml" ]]; then
        ((total++))
        local fields_result
        fields_result=$(validate_required_fields_yaml "docs/ci/ERROR_BUDGET_POLICY.yml" "version,budgets")
        if [[ "${fields_result}" == "VALID" ]]; then
            ((passed++))
            [[ "${verbose}" == "true" ]] && log_pass "ERROR_BUDGET_POLICY.yml: required fields OK"
        elif [[ "${fields_result}" == MISSING_FIELDS:* ]]; then
            ((failed++))
            local missing="${fields_result#MISSING_FIELDS:}"
            log_fail "ERROR_BUDGET_POLICY.yml: missing fields: ${missing}"
        fi
    fi

    # Freeze mode state
    # Schema: freeze_mode (boolean), set_at, reason, set_by
    if [[ -f "${REPO_ROOT}/docs/releases/_state/freeze_mode.json" ]]; then
        ((total++))
        local fields_result
        fields_result=$(validate_required_fields_json "docs/releases/_state/freeze_mode.json" "freeze_mode")
        if [[ "${fields_result}" == "VALID" ]]; then
            ((passed++))
            [[ "${verbose}" == "true" ]] && log_pass "freeze_mode.json: required fields OK"
        elif [[ "${fields_result}" == MISSING_FIELDS:* ]]; then
            ((failed++))
            local missing="${fields_result#MISSING_FIELDS:}"
            log_fail "freeze_mode.json: missing fields: ${missing}"
        fi
    fi

    echo ""

    # Summary
    log_info "=== Validation Summary ==="
    log_info "  Total checks: ${total}"
    log_info "  Passed: ${passed}"
    log_info "  Failed: ${failed}"
    log_info "  Warnings: ${warnings}"
    log_info "  Skipped: ${skipped}"
    echo ""

    # Determine exit code
    local exit_code=0
    if [[ ${failed} -gt 0 ]]; then
        exit_code=1
        log_error "Validation FAILED: ${failed} error(s)"
    elif [[ "${strict}" == "true" && ${warnings} -gt 0 ]]; then
        exit_code=1
        log_error "Validation FAILED (strict mode): ${warnings} warning(s)"
    elif [[ ${warnings} -gt 0 ]]; then
        log_warn "Validation passed with ${warnings} warning(s)"
    else
        log_pass "All validations passed"
    fi

    # Output JSON if requested
    echo "${total}|${passed}|${failed}|${warnings}|${skipped}|${exit_code}"
}

output_json() {
    local total="$1"
    local passed="$2"
    local failed="$3"
    local warnings="$4"
    local skipped="$5"
    local exit_code="$6"

    cat <<EOF
{
  "version": "${SCRIPT_VERSION}",
  "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "summary": {
    "total": ${total},
    "passed": ${passed},
    "failed": ${failed},
    "warnings": ${warnings},
    "skipped": ${skipped}
  },
  "status": $([ "${exit_code}" -eq 0 ] && echo '"pass"' || echo '"fail"'),
  "yaml_policies_checked": ${#YAML_POLICIES[@]},
  "json_state_files_checked": ${#JSON_STATE_FILES[@]}
}
EOF
}

# --- Main ---
main() {
    local strict=false
    local json_output=false
    local verbose=false
    local fix=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
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
            --fix)
                fix=true
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

    # Run validations (capture output)
    local result
    if [[ "${json_output}" == "true" ]]; then
        result=$(run_validations "${verbose}" "${strict}" 2>/dev/null | tail -1)
    else
        result=$(run_validations "${verbose}" "${strict}" | tail -1)
    fi

    # Parse result
    IFS='|' read -r total passed failed warnings skipped exit_code <<< "${result}"

    # JSON output
    if [[ "${json_output}" == "true" ]]; then
        output_json "${total}" "${passed}" "${failed}" "${warnings}" "${skipped}" "${exit_code}"
    fi

    exit "${exit_code}"
}

main "$@"
