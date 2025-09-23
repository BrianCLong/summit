#!/bin/bash
#
# Gate Validator - Automated Go/No-Go Gate Validation System
# Sprint 26: GA Cutover gate validation automation
#
# This script validates all 8 Go/No-Go gates for the GA cutover
# and provides real-time status updates.
#

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VALIDATOR_VERSION="1.0.0-ga"
CONFIG_FILE="${SCRIPT_DIR}/go-no-go-matrix.yaml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Prometheus configuration
PROMETHEUS_URL="${PROMETHEUS_URL:-http://prometheus:9090}"
PROMETHEUS_TOKEN="${PROMETHEUS_TOKEN:-}"

# Gate validation results
declare -A GATE_STATUS
declare -A GATE_DETAILS
declare -A GATE_LAST_CHECK

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_header() {
    echo -e "\n${BOLD}=== $1 ===${NC}"
}

# Prometheus query function
prometheus_query() {
    local query="$1"
    local auth_header=""

    if [[ -n "$PROMETHEUS_TOKEN" ]]; then
        auth_header="-H \"Authorization: Bearer $PROMETHEUS_TOKEN\""
    fi

    local response
    response=$(curl -s ${auth_header} \
        --data-urlencode "query=$query" \
        --data-urlencode "time=$(date +%s)" \
        "${PROMETHEUS_URL}/api/v1/query")

    echo "$response"
}

# Extract metric value from Prometheus response
extract_metric_value() {
    local response="$1"
    echo "$response" | jq -r '.data.result[0].value[1] // "0"' 2>/dev/null || echo "0"
}

# Validate Gate G1: SLO Readiness
validate_gate_g1() {
    log_info "Validating G1: SLO Readiness..."

    local p0_slo_query="min(slo_compliance_p0) * 100"
    local p1_slo_query="min(slo_compliance_p1) * 100"
    local error_budget_query="min(error_budget_remaining_days)"

    local p0_compliance
    p0_compliance=$(extract_metric_value "$(prometheus_query "$p0_slo_query")")

    local p1_compliance
    p1_compliance=$(extract_metric_value "$(prometheus_query "$p1_slo_query")")

    local error_budget_days
    error_budget_days=$(extract_metric_value "$(prometheus_query "$error_budget_query")")

    # Check thresholds
    local passed=true
    local details=""

    if (( $(echo "$p0_compliance < 99.9" | bc -l) )); then
        passed=false
        details+="P0 SLO compliance: ${p0_compliance}% (required: ≥99.9%) "
    fi

    if (( $(echo "$p1_compliance < 99.5" | bc -l) )); then
        passed=false
        details+="P1 SLO compliance: ${p1_compliance}% (required: ≥99.5%) "
    fi

    if (( $(echo "$error_budget_days < 14" | bc -l) )); then
        passed=false
        details+="Error budget: ${error_budget_days} days (required: ≥14 days) "
    fi

    if [[ "$passed" == "true" ]]; then
        GATE_STATUS["G1"]="PASSED"
        GATE_DETAILS["G1"]="P0: ${p0_compliance}%, P1: ${p1_compliance}%, Error Budget: ${error_budget_days} days"
        log_success "G1 SLO Readiness: PASSED"
    else
        GATE_STATUS["G1"]="FAILED"
        GATE_DETAILS["G1"]="$details"
        log_error "G1 SLO Readiness: FAILED - $details"
    fi

    GATE_LAST_CHECK["G1"]=$(date -u +%Y-%m-%dT%H:%M:%SZ)
}

# Validate Gate G2: K6 Performance
validate_gate_g2() {
    log_info "Validating G2: K6 Performance..."

    # Check if recent K6 test results exist
    local k6_report_file="${SCRIPT_DIR}/../k6/reports/ga-validation-latest.json"

    if [[ ! -f "$k6_report_file" ]]; then
        # Run K6 test
        log_info "Running K6 performance validation..."
        if "${SCRIPT_DIR}/../k6/run-ga-validation.sh" production full > /dev/null 2>&1; then
            GATE_STATUS["G2"]="PASSED"
            GATE_DETAILS["G2"]="K6 validation completed successfully"
            log_success "G2 K6 Performance: PASSED"
        else
            GATE_STATUS["G2"]="FAILED"
            GATE_DETAILS["G2"]="K6 validation failed - check logs"
            log_error "G2 K6 Performance: FAILED"
        fi
    else
        # Parse existing results
        local test_passed
        test_passed=$(jq -r '.root_group.checks.passes // 0' "$k6_report_file")
        local test_failed
        test_failed=$(jq -r '.root_group.checks.fails // 0' "$k6_report_file")

        if [[ "$test_failed" -eq 0 && "$test_passed" -gt 0 ]]; then
            GATE_STATUS["G2"]="PASSED"
            GATE_DETAILS["G2"]="Checks passed: $test_passed, failed: $test_failed"
            log_success "G2 K6 Performance: PASSED"
        else
            GATE_STATUS["G2"]="FAILED"
            GATE_DETAILS["G2"]="Checks passed: $test_passed, failed: $test_failed"
            log_error "G2 K6 Performance: FAILED"
        fi
    fi

    GATE_LAST_CHECK["G2"]=$(date -u +%Y-%m-%dT%H:%M:%SZ)
}

# Validate Gate G3: Provenance/Supply-Chain
validate_gate_g3() {
    log_info "Validating G3: Provenance/Supply-Chain..."

    # Run provenance verification
    if "${SCRIPT_DIR}/../verify-bundle/verify-bundle.sh" --target production --strict > /dev/null 2>&1; then
        GATE_STATUS["G3"]="PASSED"
        GATE_DETAILS["G3"]="SLSA-3 attestations verified, all signatures valid"
        log_success "G3 Provenance: PASSED"
    else
        GATE_STATUS["G3"]="FAILED"
        GATE_DETAILS["G3"]="Provenance verification failed - check attestations"
        log_error "G3 Provenance: FAILED"
    fi

    GATE_LAST_CHECK["G3"]=$(date -u +%Y-%m-%dT%H:%M:%SZ)
}

# Validate Gate G4: Change Freeze
validate_gate_g4() {
    log_info "Validating G4: Change Freeze..."

    # Check freeze status via igctl
    local freeze_status
    freeze_status=$(igctl freeze status --format json 2>/dev/null | jq -r '.status' || echo "unknown")

    local unapproved_exceptions
    unapproved_exceptions=$(igctl freeze status --format json 2>/dev/null | jq -r '.unapproved_exceptions // 0' || echo "0")

    if [[ "$freeze_status" == "enforced" && "$unapproved_exceptions" -eq 0 ]]; then
        GATE_STATUS["G4"]="PASSED"
        GATE_DETAILS["G4"]="Freeze active, no unapproved exceptions"
        log_success "G4 Change Freeze: PASSED"
    else
        GATE_STATUS["G4"]="FAILED"
        GATE_DETAILS["G4"]="Freeze status: $freeze_status, unapproved exceptions: $unapproved_exceptions"
        log_error "G4 Change Freeze: FAILED"
    fi

    GATE_LAST_CHECK["G4"]=$(date -u +%Y-%m-%dT%H:%M:%SZ)
}

# Validate Gate G5: DR/Backup
validate_gate_g5() {
    log_info "Validating G5: DR/Backup..."

    # Check recent DR drill status
    local drill_status
    drill_status=$(igctl dr status --recent 7d --format json 2>/dev/null || echo '{"last_drill_success": false}')

    local last_drill_success
    last_drill_success=$(echo "$drill_status" | jq -r '.last_drill_success // false')

    local last_drill_age_days
    last_drill_age_days=$(echo "$drill_status" | jq -r '.last_drill_age_days // 999')

    if [[ "$last_drill_success" == "true" && "$last_drill_age_days" -lt 7 ]]; then
        GATE_STATUS["G5"]="PASSED"
        GATE_DETAILS["G5"]="Recent drill successful, age: ${last_drill_age_days} days"
        log_success "G5 DR/Backup: PASSED"
    else
        GATE_STATUS["G5"]="FAILED"
        GATE_DETAILS["G5"]="Last drill success: $last_drill_success, age: ${last_drill_age_days} days"
        log_error "G5 DR/Backup: FAILED"
    fi

    GATE_LAST_CHECK["G5"]=$(date -u +%Y-%m-%dT%H:%M:%SZ)
}

# Validate Gate G6: Cost Guardrails
validate_gate_g6() {
    log_info "Validating G6: Cost Guardrails..."

    local infra_util_query="intelgraph:budget_utilization_infrastructure"
    local llm_util_query="intelgraph:budget_utilization_llm"
    local downshift_armed_query="cost_guardrails_downshift_armed"

    local infra_utilization
    infra_utilization=$(extract_metric_value "$(prometheus_query "$infra_util_query")")

    local llm_utilization
    llm_utilization=$(extract_metric_value "$(prometheus_query "$llm_util_query")")

    local downshift_armed
    downshift_armed=$(extract_metric_value "$(prometheus_query "$downshift_armed_query")")

    local passed=true
    local details=""

    if (( $(echo "$infra_utilization > 0.80" | bc -l) )); then
        passed=false
        details+="Infrastructure utilization: ${infra_utilization} (threshold: ≤0.80) "
    fi

    if (( $(echo "$llm_utilization > 0.80" | bc -l) )); then
        passed=false
        details+="LLM utilization: ${llm_utilization} (threshold: ≤0.80) "
    fi

    if [[ "$downshift_armed" != "1" ]]; then
        passed=false
        details+="Downshift rules not armed "
    fi

    if [[ "$passed" == "true" ]]; then
        GATE_STATUS["G6"]="PASSED"
        GATE_DETAILS["G6"]="Infra: ${infra_utilization}, LLM: ${llm_utilization}, downshift armed"
        log_success "G6 Cost Guardrails: PASSED"
    else
        GATE_STATUS["G6"]="FAILED"
        GATE_DETAILS["G6"]="$details"
        log_error "G6 Cost Guardrails: FAILED - $details"
    fi

    GATE_LAST_CHECK["G6"]=$(date -u +%Y-%m-%dT%H:%M:%SZ)
}

# Validate Gate G7: Security
validate_gate_g7() {
    log_info "Validating G7: Security..."

    local opa_health_query="up{job=\"opa\"}"
    local webauthn_enabled_query="webauthn_enforcement_enabled"
    local policy_latency_query="histogram_quantile(0.95, rate(opa_decision_duration_seconds_bucket[5m]))"

    local opa_health
    opa_health=$(extract_metric_value "$(prometheus_query "$opa_health_query")")

    local webauthn_enabled
    webauthn_enabled=$(extract_metric_value "$(prometheus_query "$webauthn_enabled_query")")

    local policy_latency
    policy_latency=$(extract_metric_value "$(prometheus_query "$policy_latency_query")")

    local passed=true
    local details=""

    if [[ "$opa_health" != "1" ]]; then
        passed=false
        details+="OPA not healthy "
    fi

    if [[ "$webauthn_enabled" != "1" ]]; then
        passed=false
        details+="WebAuthn not enabled "
    fi

    if (( $(echo "$policy_latency > 0.025" | bc -l) )); then
        passed=false
        details+="Policy latency too high: ${policy_latency}s (threshold: ≤0.025s) "
    fi

    if [[ "$passed" == "true" ]]; then
        GATE_STATUS["G7"]="PASSED"
        GATE_DETAILS["G7"]="OPA healthy, WebAuthn enabled, policy latency: ${policy_latency}s"
        log_success "G7 Security: PASSED"
    else
        GATE_STATUS["G7"]="FAILED"
        GATE_DETAILS["G7"]="$details"
        log_error "G7 Security: FAILED - $details"
    fi

    GATE_LAST_CHECK["G7"]=$(date -u +%Y-%m-%dT%H:%M:%SZ)
}

# Validate Gate G8: Support & Communications (Manual)
validate_gate_g8() {
    log_info "Validating G8: Support & Communications..."

    # This is a manual gate - check for manual approval
    local approval_file="${SCRIPT_DIR}/.g8_approval"

    if [[ -f "$approval_file" ]]; then
        local approval_data
        approval_data=$(cat "$approval_file")
        local approver
        approver=$(echo "$approval_data" | jq -r '.approver // "unknown"')
        local timestamp
        timestamp=$(echo "$approval_data" | jq -r '.timestamp // "unknown"')

        GATE_STATUS["G8"]="PASSED"
        GATE_DETAILS["G8"]="Manual approval by $approver at $timestamp"
        log_success "G8 Support & Communications: PASSED (Manual approval)"
    else
        GATE_STATUS["G8"]="MANUAL_REQUIRED"
        GATE_DETAILS["G8"]="Manual approval required - check war room readiness"
        log_warning "G8 Support & Communications: MANUAL APPROVAL REQUIRED"
    fi

    GATE_LAST_CHECK["G8"]=$(date -u +%Y-%m-%dT%H:%M:%SZ)
}

# Validate all gates
validate_all_gates() {
    log_header "Validating All Go/No-Go Gates"

    validate_gate_g1
    validate_gate_g2
    validate_gate_g3
    validate_gate_g4
    validate_gate_g5
    validate_gate_g6
    validate_gate_g7
    validate_gate_g8

    # Summary
    log_header "Gate Validation Summary"

    local passed_count=0
    local failed_count=0
    local manual_count=0

    for gate in G1 G2 G3 G4 G5 G6 G7 G8; do
        local status="${GATE_STATUS[$gate]}"
        local details="${GATE_DETAILS[$gate]}"
        local last_check="${GATE_LAST_CHECK[$gate]}"

        case "$status" in
            "PASSED")
                echo -e "${GREEN}✅ $gate: PASSED${NC} - $details"
                ((passed_count++))
                ;;
            "FAILED")
                echo -e "${RED}❌ $gate: FAILED${NC} - $details"
                ((failed_count++))
                ;;
            "MANUAL_REQUIRED")
                echo -e "${YELLOW}🟡 $gate: MANUAL REQUIRED${NC} - $details"
                ((manual_count++))
                ;;
        esac
    done

    echo ""
    log_info "Summary: $passed_count passed, $failed_count failed, $manual_count manual"

    # Final decision
    if [[ $failed_count -eq 0 && $manual_count -eq 0 ]]; then
        log_success "🚀 GO DECISION: All gates passed!"
        return 0
    elif [[ $failed_count -gt 0 ]]; then
        log_error "🛑 NO-GO DECISION: $failed_count gates failed"
        return 1
    else
        log_warning "⏳ PENDING: $manual_count gates require manual approval"
        return 2
    fi
}

# Validate specific gate
validate_specific_gate() {
    local gate="$1"

    case "$gate" in
        "G1"|"g1")
            validate_gate_g1
            ;;
        "G2"|"g2")
            validate_gate_g2
            ;;
        "G3"|"g3")
            validate_gate_g3
            ;;
        "G4"|"g4")
            validate_gate_g4
            ;;
        "G5"|"g5")
            validate_gate_g5
            ;;
        "G6"|"g6")
            validate_gate_g6
            ;;
        "G7"|"g7")
            validate_gate_g7
            ;;
        "G8"|"g8")
            validate_gate_g8
            ;;
        *)
            log_error "Unknown gate: $gate"
            return 1
            ;;
    esac
}

# Manual approval for G8
approve_gate_g8() {
    local approver="$1"
    local approval_file="${SCRIPT_DIR}/.g8_approval"

    if [[ -z "$approver" ]]; then
        approver="$(whoami)"
    fi

    local approval_data
    approval_data=$(cat << EOF
{
    "gate": "G8",
    "approver": "$approver",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "checklist_verified": true,
    "war_room_ready": true,
    "communication_templates_ready": true,
    "oncall_coverage_confirmed": true
}
EOF
)

    echo "$approval_data" > "$approval_file"
    log_success "G8 manually approved by $approver"
}

# Generate gate status report
generate_status_report() {
    local output_format="${1:-table}"

    case "$output_format" in
        "json")
            cat << EOF
{
    "validation_timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "validator_version": "$VALIDATOR_VERSION",
    "gates": {
$(for gate in G1 G2 G3 G4 G5 G6 G7 G8; do
    echo "        \"$gate\": {"
    echo "            \"status\": \"${GATE_STATUS[$gate]:-UNKNOWN}\","
    echo "            \"details\": \"${GATE_DETAILS[$gate]:-No details}\","
    echo "            \"last_check\": \"${GATE_LAST_CHECK[$gate]:-Never}\""
    if [[ "$gate" != "G8" ]]; then
        echo "        },"
    else
        echo "        }"
    fi
done)
    }
}
EOF
            ;;
        "table"|*)
            printf "%-4s %-25s %-15s %-20s %s\n" "Gate" "Name" "Status" "Last Check" "Details"
            printf "%-4s %-25s %-15s %-20s %s\n" "----" "-------------------------" "---------------" "--------------------" "-------"

            local gate_names=("SLO Readiness" "K6 Performance" "Provenance" "Change Freeze" "DR/Backup" "Cost Guardrails" "Security" "Support & Comms")
            local i=0

            for gate in G1 G2 G3 G4 G5 G6 G7 G8; do
                printf "%-4s %-25s %-15s %-20s %s\n" \
                    "$gate" \
                    "${gate_names[$i]}" \
                    "${GATE_STATUS[$gate]:-UNKNOWN}" \
                    "${GATE_LAST_CHECK[$gate]:-Never}" \
                    "${GATE_DETAILS[$gate]:-No details}"
                ((i++))
            done
            ;;
    esac
}

# Main function
main() {
    case "${1:-validate-all}" in
        "validate-all")
            validate_all_gates
            ;;
        "validate")
            if [[ $# -lt 2 ]]; then
                log_error "Gate ID required"
                exit 1
            fi
            validate_specific_gate "$2"
            ;;
        "approve-g8")
            approve_gate_g8 "${2:-}"
            ;;
        "status")
            generate_status_report "${2:-table}"
            ;;
        "help"|"--help"|"-h")
            cat << EOF
Gate Validator - GA Cutover Go/No-Go Gate Validation

USAGE:
    gate-validator.sh <command> [options]

COMMANDS:
    validate-all                 Validate all gates (default)
    validate <gate-id>          Validate specific gate (G1-G8)
    approve-g8 [approver]       Manually approve G8 gate
    status [format]             Show gate status (table/json)
    help                        Show this help

EXAMPLES:
    ./gate-validator.sh validate-all
    ./gate-validator.sh validate G1
    ./gate-validator.sh approve-g8 alice
    ./gate-validator.sh status json

GATES:
    G1 - SLO Readiness          P0-P2 SLOs with error budget
    G2 - K6 Performance         Load test scenarios pass
    G3 - Provenance             SLSA-3 attestations verified
    G4 - Change Freeze          Freeze active, no exceptions
    G5 - DR/Backup              Recent drill successful
    G6 - Cost Guardrails        Budget within limits
    G7 - Security               OPA policies, WebAuthn enabled
    G8 - Support & Comms        Manual approval required
EOF
            ;;
        *)
            log_error "Unknown command: $1"
            echo "Run 'gate-validator.sh help' for usage"
            exit 1
            ;;
    esac
}

# Check dependencies
check_dependencies() {
    local deps=("curl" "jq" "bc")
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            log_error "Required dependency not found: $dep"
            exit 1
        fi
    done
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    check_dependencies
    main "$@"
fi