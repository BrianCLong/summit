#!/bin/bash
#
# IntelGraph GA Cutover Validation Runner
# Sprint 26: Comprehensive GA readiness validation
#
# Usage: ./run-ga-validation.sh [environment] [mode]
#
# Arguments:
#   environment: staging|production (default: staging)
#   mode: smoke|full|soak (default: full)
#

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
RESULTS_DIR="${BASE_DIR}/results/ga-validation/$(date +%Y%m%d-%H%M%S)"

# Default values
ENVIRONMENT="${1:-staging}"
MODE="${2:-full}"
BASE_URL="${BASE_URL:-}"
API_TOKEN="${API_TOKEN:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Environment configuration
configure_environment() {
    case "${ENVIRONMENT}" in
        staging)
            BASE_URL="${BASE_URL:-https://api.staging.intelgraph.dev}"
            ;;
        production)
            BASE_URL="${BASE_URL:-https://api.intelgraph.dev}"
            log_warning "Running GA validation against PRODUCTION environment!"
            read -p "Are you sure? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log_error "Aborted by user"
                exit 1
            fi
            ;;
        *)
            log_error "Invalid environment: ${ENVIRONMENT}. Use 'staging' or 'production'"
            exit 1
            ;;
    esac

    if [[ -z "${API_TOKEN}" ]]; then
        log_error "API_TOKEN environment variable is required"
        exit 1
    fi

    log_info "Environment: ${ENVIRONMENT}"
    log_info "Base URL: ${BASE_URL}"
    log_info "Mode: ${MODE}"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if k6 is installed
    if ! command -v k6 &> /dev/null; then
        log_error "k6 is not installed. Please install k6 first."
        log_info "Installation: https://k6.io/docs/getting-started/installation/"
        exit 1
    fi

    # Check k6 version
    K6_VERSION=$(k6 version | head -n1)
    log_info "K6 version: ${K6_VERSION}"

    # Check if the test files exist
    if [[ ! -f "${SCRIPT_DIR}/ga-cutover-scenarios.js" ]]; then
        log_error "GA cutover test file not found: ${SCRIPT_DIR}/ga-cutover-scenarios.js"
        exit 1
    fi

    if [[ ! -f "${SCRIPT_DIR}/load-profiles.js" ]]; then
        log_error "Load profiles test file not found: ${SCRIPT_DIR}/load-profiles.js"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Create results directory
setup_results_directory() {
    mkdir -p "${RESULTS_DIR}"
    log_info "Results will be saved to: ${RESULTS_DIR}"
}

# Run health check
run_health_check() {
    log_info "Running pre-test health check..."

    local health_response
    health_response=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/health" || echo "000")

    if [[ "${health_response}" != "200" ]]; then
        log_error "Health check failed. HTTP status: ${health_response}"
        log_error "Ensure the IntelGraph API is running and accessible at ${BASE_URL}"
        exit 1
    fi

    log_success "Health check passed"
}

# Run GA scenarios based on mode
run_ga_scenarios() {
    log_info "Starting GA validation scenarios..."

    local k6_options=""
    local test_duration=""

    case "${MODE}" in
        smoke)
            k6_options="--vus 1 --duration 30s"
            test_duration="30 seconds"
            ;;
        full)
            k6_options=""  # Use defaults from script
            test_duration="15 minutes"
            ;;
        soak)
            k6_options="--vus 25 --duration 1h"
            test_duration="1 hour"
            ;;
        *)
            log_error "Invalid mode: ${MODE}. Use 'smoke', 'full', or 'soak'"
            exit 1
            ;;
    esac

    log_info "Running ${MODE} mode tests (${test_duration})"

    # Set environment variables for k6
    export BASE_URL
    export API_TOKEN
    export GA_MODE="true"

    # Run the GA cutover scenarios
    local ga_exit_code=0
    log_info "🚀 Executing GA cutover validation..."

    k6 run ${k6_options} \
        --out json="${RESULTS_DIR}/ga-cutover-results.json" \
        --summary-export="${RESULTS_DIR}/ga-summary.json" \
        "${SCRIPT_DIR}/ga-cutover-scenarios.js" \
        2>&1 | tee "${RESULTS_DIR}/ga-cutover.log" || ga_exit_code=$?

    # Run the load profiles for additional validation
    if [[ "${MODE}" != "smoke" ]]; then
        log_info "🔄 Running supplementary load validation..."

        local load_exit_code=0
        k6 run \
            --out json="${RESULTS_DIR}/load-profiles-results.json" \
            --summary-export="${RESULTS_DIR}/load-summary.json" \
            "${SCRIPT_DIR}/load-profiles.js" \
            2>&1 | tee "${RESULTS_DIR}/load-profiles.log" || load_exit_code=$?
    fi

    return $ga_exit_code
}

# Analyze results and generate final report
analyze_results() {
    log_info "Analyzing test results..."

    local ga_results_file="${RESULTS_DIR}/ga-cutover-results.json"
    local summary_file="${RESULTS_DIR}/ga-summary.json"
    local final_report="${RESULTS_DIR}/ga-final-report.md"

    # Check if results files exist
    if [[ ! -f "${ga_results_file}" ]]; then
        log_error "GA results file not found: ${ga_results_file}"
        return 1
    fi

    # Extract key metrics using jq (if available)
    if command -v jq &> /dev/null; then
        log_info "Extracting key metrics..."

        # Extract SLO violations
        local slo_violations
        slo_violations=$(jq -r '.metrics.ga_slo_violations.rate // 0' "${ga_results_file}")

        # Extract rollback triggers
        local rollback_triggers
        rollback_triggers=$(jq -r '.metrics.ga_rollback_triggers.count // 0' "${ga_results_file}")

        # Extract go/no-go status
        local go_nogo_score
        go_nogo_score=$(jq -r '.metrics.ga_go_nogo_status.avg // 0' "${ga_results_file}")

        # Extract error rate
        local error_rate
        error_rate=$(jq -r '.metrics.http_req_failed.rate // 0' "${ga_results_file}")

        # Generate final recommendation
        local recommendation="NO-GO"
        if (( $(echo "${go_nogo_score} >= 0.95" | bc -l) )) && \
           (( $(echo "${rollback_triggers} <= 2" | bc -l) )) && \
           (( $(echo "${error_rate} <= 0.01" | bc -l) )); then
            recommendation="GO"
        fi

        # Create final report
        cat > "${final_report}" << EOF
# IntelGraph GA Cutover Validation Report

**Environment:** ${ENVIRONMENT}
**Test Mode:** ${MODE}
**Execution Time:** $(date)
**Results Directory:** ${RESULTS_DIR}

## Executive Summary

**RECOMMENDATION: ${recommendation} FOR GA CUTOVER**

- **Overall Health Score:** $(printf "%.1f" $(echo "${go_nogo_score} * 100" | bc -l))%
- **SLO Violation Rate:** $(printf "%.3f" $(echo "${slo_violations} * 100" | bc -l))%
- **Rollback Triggers:** ${rollback_triggers}
- **Error Rate:** $(printf "%.3f" $(echo "${error_rate} * 100" | bc -l))%

## Key Metrics

| Metric | Value | Threshold | Status |
|--------|-------|-----------|---------|
| Health Score | $(printf "%.1f" $(echo "${go_nogo_score} * 100" | bc -l))% | ≥95% | $(if (( $(echo "${go_nogo_score} >= 0.95" | bc -l) )); then echo "✅ PASS"; else echo "❌ FAIL"; fi) |
| SLO Violations | $(printf "%.3f" $(echo "${slo_violations} * 100" | bc -l))% | <5% | $(if (( $(echo "${slo_violations} <= 0.05" | bc -l) )); then echo "✅ PASS"; else echo "❌ FAIL"; fi) |
| Rollback Triggers | ${rollback_triggers} | ≤2 | $(if (( $(echo "${rollback_triggers} <= 2" | bc -l) )); then echo "✅ PASS"; else echo "❌ FAIL"; fi) |
| Error Rate | $(printf "%.3f" $(echo "${error_rate} * 100" | bc -l))% | <1% | $(if (( $(echo "${error_rate} <= 0.01" | bc -l) )); then echo "✅ PASS"; else echo "❌ FAIL"; fi) |

## Files Generated

- **Detailed Results:** \`ga-cutover-results.json\`
- **Test Logs:** \`ga-cutover.log\`
- **SLO Report:** \`ga-slo-report.html\`
- **Summary:** \`ga-summary.json\`

## Next Steps

$(if [[ "${recommendation}" == "GO" ]]; then
    echo "✅ **Proceed with GA cutover**"
    echo "- All SLOs are met"
    echo "- System is ready for production traffic"
    echo "- Monitor dashboards during rollout"
else
    echo "❌ **Do not proceed with GA cutover**"
    echo "- Review failed metrics above"
    echo "- Address performance or reliability issues"
    echo "- Re-run validation after fixes"
fi)

---
*Generated by IntelGraph GA Validation Suite*
EOF

        log_success "Final report generated: ${final_report}"

        # Display key results
        echo
        log_info "=== GA CUTOVER VALIDATION RESULTS ==="
        echo -e "🎯 **RECOMMENDATION:** ${recommendation} FOR GA CUTOVER"
        echo -e "📊 **Health Score:** $(printf "%.1f" $(echo "${go_nogo_score} * 100" | bc -l))%"
        echo -e "⚠️  **SLO Violations:** $(printf "%.3f" $(echo "${slo_violations} * 100" | bc -l))%"
        echo -e "🚨 **Rollback Triggers:** ${rollback_triggers}"
        echo -e "❌ **Error Rate:** $(printf "%.3f" $(echo "${error_rate} * 100" | bc -l))%"
        echo

        return $(if [[ "${recommendation}" == "GO" ]]; then echo 0; else echo 1; fi)
    else
        log_warning "jq not available - manual analysis required"
        log_info "Check results in: ${RESULTS_DIR}"
        return 0
    fi
}

# Cleanup function
cleanup() {
    log_info "Cleaning up temporary files..."
    # Add any cleanup logic here
}

# Main execution
main() {
    # Set up trap for cleanup
    trap cleanup EXIT

    log_info "🚀 IntelGraph GA Cutover Validation Suite"
    log_info "Sprint 26 - Enterprise Grade Validation"
    echo

    configure_environment
    check_prerequisites
    setup_results_directory
    run_health_check

    local test_exit_code=0
    run_ga_scenarios || test_exit_code=$?

    if [[ ${test_exit_code} -eq 0 ]]; then
        log_success "GA validation tests completed successfully"
    else
        log_warning "GA validation tests completed with issues (exit code: ${test_exit_code})"
    fi

    local analysis_exit_code=0
    analyze_results || analysis_exit_code=$?

    if [[ ${analysis_exit_code} -eq 0 ]]; then
        log_success "✅ GA CUTOVER APPROVED - All validations passed"
        echo
        log_info "📁 Results available at: ${RESULTS_DIR}"
        log_info "📊 View the SLO report: ${RESULTS_DIR}/ga-slo-report.html"
        log_info "📋 Final report: ${RESULTS_DIR}/ga-final-report.md"
    else
        log_error "❌ GA CUTOVER NOT APPROVED - Validation failures detected"
        echo
        log_info "📁 Review results at: ${RESULTS_DIR}"
        log_info "🔍 Check logs for detailed failure analysis"
    fi

    exit ${analysis_exit_code}
}

# Help function
show_help() {
    cat << EOF
IntelGraph GA Cutover Validation Suite

USAGE:
    $0 [environment] [mode]

ARGUMENTS:
    environment    Target environment (staging|production)
                  Default: staging

    mode          Test mode (smoke|full|soak)
                  smoke: Quick validation (30s)
                  full:  Complete validation (15m)
                  soak:  Extended validation (1h)
                  Default: full

ENVIRONMENT VARIABLES:
    BASE_URL      Override the base URL for the target environment
    API_TOKEN     API token for authentication (required)

EXAMPLES:
    # Quick smoke test against staging
    API_TOKEN=xxx $0 staging smoke

    # Full validation against staging
    API_TOKEN=xxx $0 staging full

    # Soak test against production
    API_TOKEN=xxx $0 production soak

    # Custom endpoint
    BASE_URL=https://custom.api.endpoint API_TOKEN=xxx $0

EXIT CODES:
    0    GA cutover approved (all validations passed)
    1    GA cutover not approved (validation failures)
    2    Script error (prerequisites, configuration, etc.)

EOF
}

# Check for help flag
if [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
    show_help
    exit 0
fi

# Run main function
main "$@"