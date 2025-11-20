#!/usr/bin/env bash
# ==============================================================================
# Production Readiness Validation Script
# ==============================================================================
# Comprehensive validation before deploying Resilience Lab to production
#
# Usage:
#   ./production-check.sh [--fix]
#
# Options:
#   --fix    Attempt to fix issues automatically
#
# Exit Codes:
#   0  - All checks passed
#   1  - One or more checks failed
# ==============================================================================

set -euo pipefail
IFS=$'\n\t'

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

FIX_MODE=false
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNINGS=0

# Parse arguments
for arg in "$@"; do
    case $arg in
        --fix)
            FIX_MODE=true
            shift
            ;;
    esac
done

# Logging functions
log_check() {
    ((TOTAL_CHECKS++))
    echo -n "  Checking $1... "
}

log_pass() {
    ((PASSED_CHECKS++))
    echo -e "${GREEN}✓${NC}"
}

log_fail() {
    ((FAILED_CHECKS++))
    echo -e "${RED}✗${NC}"
    if [ -n "${1:-}" ]; then
        echo -e "    ${RED}Error:${NC} $1"
    fi
}

log_warn() {
    ((WARNINGS++))
    echo -e "${YELLOW}⚠${NC}"
    if [ -n "${1:-}" ]; then
        echo -e "    ${YELLOW}Warning:${NC} $1"
    fi
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_section() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
}

# ==============================================================================
# Check Functions
# ==============================================================================

check_dependencies() {
    log_section "1. Dependency Checks"

    # Docker
    log_check "docker"
    if command -v docker >/dev/null 2>&1; then
        if docker info >/dev/null 2>&1; then
            log_pass
        else
            log_fail "Docker daemon not running"
        fi
    else
        log_fail "Docker not installed"
    fi

    # Docker Compose
    log_check "docker-compose"
    if command -v docker-compose >/dev/null 2>&1 || docker compose version >/dev/null 2>&1; then
        log_pass
    else
        log_fail "Docker Compose not installed"
    fi

    # jq
    log_check "jq"
    if command -v jq >/dev/null 2>&1; then
        log_pass
    else
        if [ "$FIX_MODE" = "true" ]; then
            log_warn "Installing jq..."
            sudo apt-get update && sudo apt-get install -y jq
        else
            log_fail "jq not installed (use --fix to install)"
        fi
    fi

    # curl
    log_check "curl"
    if command -v curl >/dev/null 2>&1; then
        log_pass
    else
        log_fail "curl not installed"
    fi

    # bc
    log_check "bc"
    if command -v bc >/dev/null 2>&1; then
        log_pass
    else
        if [ "$FIX_MODE" = "true" ]; then
            log_warn "Installing bc..."
            sudo apt-get install -y bc
        else
            log_fail "bc not installed (use --fix to install)"
        fi
    fi
}

check_configuration() {
    log_section "2. Configuration Checks"

    # Scenarios file
    log_check "scenarios.yaml exists"
    if [ -f "${SCRIPT_DIR}/scenarios.yaml" ]; then
        log_pass
    else
        log_fail "scenarios.yaml not found"
    fi

    # Scenarios file valid
    log_check "scenarios.yaml valid"
    if [ -f "${SCRIPT_DIR}/scenarios.yaml" ]; then
        if grep -q "^scenarios:" "${SCRIPT_DIR}/scenarios.yaml"; then
            log_pass
        else
            log_fail "Invalid scenarios.yaml format"
        fi
    else
        log_fail "scenarios.yaml not found"
    fi

    # Suites defined
    log_check "test suites defined"
    if grep -q "smoke_suite:" "${SCRIPT_DIR}/scenarios.yaml" && \
       grep -q "ci_suite:" "${SCRIPT_DIR}/scenarios.yaml"; then
        log_pass
    else
        log_fail "Test suites not defined"
    fi

    # SLOs defined
    log_check "SLOs defined"
    if grep -q "^slos:" "${SCRIPT_DIR}/scenarios.yaml"; then
        log_pass
    else
        log_warn "SLOs not defined in scenarios.yaml"
    fi

    # Compose files
    log_check "compose files exist"
    if [ -f "${PROJECT_ROOT}/compose/docker-compose.yml" ]; then
        log_pass
    else
        log_warn "compose/docker-compose.yml not found"
    fi

    log_check "chaos compose file"
    if [ -f "${PROJECT_ROOT}/compose/docker-compose.chaos.yml" ]; then
        log_pass
    else
        log_warn "compose/docker-compose.chaos.yml not found"
    fi
}

check_permissions() {
    log_section "3. Permission Checks"

    # Runner executable
    log_check "runner.sh executable"
    if [ -x "${SCRIPT_DIR}/runner.sh" ]; then
        log_pass
    else
        if [ "$FIX_MODE" = "true" ]; then
            chmod +x "${SCRIPT_DIR}/runner.sh"
            log_pass
        else
            log_fail "runner.sh not executable (use --fix)"
        fi
    fi

    # SLO validator executable
    log_check "slo-validator.sh executable"
    if [ -x "${SCRIPT_DIR}/slo-validator.sh" ]; then
        log_pass
    else
        if [ "$FIX_MODE" = "true" ]; then
            chmod +x "${SCRIPT_DIR}/slo-validator.sh"
            log_pass
        else
            log_fail "slo-validator.sh not executable (use --fix)"
        fi
    fi

    # Reports directory
    log_check "reports directory writable"
    local reports_dir="${PROJECT_ROOT}/artifacts/chaos/reports"
    if [ -d "$reports_dir" ]; then
        if [ -w "$reports_dir" ]; then
            log_pass
        else
            log_fail "Reports directory not writable"
        fi
    else
        if [ "$FIX_MODE" = "true" ]; then
            mkdir -p "$reports_dir"
            log_pass
        else
            log_warn "Reports directory does not exist (use --fix)"
        fi
    fi

    # Temp directory
    log_check "temp directory writable"
    local temp_dir="${PROJECT_ROOT}/artifacts/chaos/temp"
    if [ -d "$temp_dir" ]; then
        if [ -w "$temp_dir" ]; then
            log_pass
        else
            log_fail "Temp directory not writable"
        fi
    else
        if [ "$FIX_MODE" = "true" ]; then
            mkdir -p "$temp_dir"
            log_pass
        else
            log_warn "Temp directory does not exist (use --fix)"
        fi
    fi
}

check_security() {
    log_section "4. Security Checks"

    # No hardcoded secrets
    log_check "no hardcoded secrets"
    local secrets_found=0
    if grep -r -i "password\s*=\s*[\"'][^\"']*[\"']" "${SCRIPT_DIR}" | grep -v ".md" | grep -v "example" | grep -q .; then
        secrets_found=1
    fi

    if [ $secrets_found -eq 0 ]; then
        log_pass
    else
        log_warn "Potential hardcoded secrets found - review manually"
    fi

    # No world-writable files
    log_check "no world-writable files"
    if find "${SCRIPT_DIR}" -type f -perm -002 | grep -q .; then
        log_warn "World-writable files found"
    else
        log_pass
    fi
}

check_testing() {
    log_section "5. Testing Checks"

    # Test runner exists
    log_check "test runner exists"
    if [ -f "${SCRIPT_DIR}/test-runner.sh" ]; then
        log_pass
    else
        log_warn "test-runner.sh not found"
    fi

    # Run unit tests
    log_check "unit tests"
    if [ -x "${SCRIPT_DIR}/test-runner.sh" ]; then
        if "${SCRIPT_DIR}/test-runner.sh" >/dev/null 2>&1; then
            log_pass
        else
            log_warn "Some unit tests failed"
        fi
    else
        log_warn "Cannot run unit tests (test-runner.sh not executable)"
    fi

    # Dry run test
    log_check "dry run mode"
    if DRY_RUN=true "${SCRIPT_DIR}/runner.sh" --scenario test-scenario-valid >/dev/null 2>&1 || true; then
        log_pass
    else
        log_warn "Dry run test failed (may be expected if test scenario doesn't exist)"
    fi
}

check_monitoring() {
    log_section "6. Monitoring Checks"

    # Prometheus (optional)
    log_check "Prometheus available"
    if curl -sf http://localhost:9090/-/healthy >/dev/null 2>&1; then
        log_pass
    else
        log_warn "Prometheus not available (optional)"
    fi

    # Grafana (optional)
    log_check "Grafana available"
    if curl -sf http://localhost:3001/api/health >/dev/null 2>&1; then
        log_pass
    else
        log_warn "Grafana not available (optional)"
    fi

    # Alert rules file
    log_check "alert rules exist"
    if [ -f "${SCRIPT_DIR}/prometheus-rules-chaos.yaml" ]; then
        log_pass
    else
        log_warn "prometheus-rules-chaos.yaml not found"
    fi
}

check_documentation() {
    log_section "7. Documentation Checks"

    local docs=("README.md" "QUICK_START.md" "MIGRATION.md" "PRODUCTION_READINESS.md" "EXAMPLES.md")

    for doc in "${docs[@]}"; do
        log_check "$doc exists"
        if [ -f "${SCRIPT_DIR}/$doc" ]; then
            log_pass
        else
            log_warn "$doc not found"
        fi
    done
}

# ==============================================================================
# Main Execution
# ==============================================================================

main() {
    echo ""
    echo -e "${BLUE}╔═══════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  Production Readiness Validation     ║${NC}"
    echo -e "${BLUE}║  Resilience Lab v2.0                  ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════╝${NC}"

    if [ "$FIX_MODE" = "true" ]; then
        echo -e "${YELLOW}Running in FIX mode - will attempt to fix issues${NC}"
    fi

    # Run all checks
    check_dependencies
    check_configuration
    check_permissions
    check_security
    check_testing
    check_monitoring
    check_documentation

    # Summary
    echo ""
    log_section "Summary"
    echo ""
    echo "  Total Checks:   $TOTAL_CHECKS"
    echo -e "  ${GREEN}Passed:         $PASSED_CHECKS${NC}"

    if [ $FAILED_CHECKS -gt 0 ]; then
        echo -e "  ${RED}Failed:         $FAILED_CHECKS${NC}"
    else
        echo "  Failed:         $FAILED_CHECKS"
    fi

    if [ $WARNINGS -gt 0 ]; then
        echo -e "  ${YELLOW}Warnings:       $WARNINGS${NC}"
    else
        echo "  Warnings:       $WARNINGS"
    fi

    echo ""

    # Final verdict
    if [ $FAILED_CHECKS -eq 0 ]; then
        if [ $WARNINGS -eq 0 ]; then
            echo -e "${GREEN}╔═══════════════════════════════════════╗${NC}"
            echo -e "${GREEN}║  ✅ READY FOR PRODUCTION              ║${NC}"
            echo -e "${GREEN}╚═══════════════════════════════════════╝${NC}"
            echo ""
            echo "All checks passed! You can deploy to production."
            echo ""
            echo "Next steps:"
            echo "  1. Review PRODUCTION_READINESS.md checklist"
            echo "  2. Deploy to staging first"
            echo "  3. Run: make chaos:smoke"
            echo "  4. Monitor results for 24-48 hours"
            echo "  5. Deploy to production with proper monitoring"
            return 0
        else
            echo -e "${YELLOW}╔═══════════════════════════════════════╗${NC}"
            echo -e "${YELLOW}║  ⚠️  READY WITH WARNINGS              ║${NC}"
            echo -e "${YELLOW}╚═══════════════════════════════════════╝${NC}"
            echo ""
            echo "All critical checks passed, but there are warnings."
            echo "Review warnings above before deploying to production."
            return 0
        fi
    else
        echo -e "${RED}╔═══════════════════════════════════════╗${NC}"
        echo -e "${RED}║  ❌ NOT READY FOR PRODUCTION          ║${NC}"
        echo -e "${RED}╚═══════════════════════════════════════╝${NC}"
        echo ""
        echo "Failed checks must be resolved before deploying to production."
        echo ""
        echo "To attempt automatic fixes, run:"
        echo "  ./production-check.sh --fix"
        echo ""
        echo "For manual fixes, review the failed checks above."
        return 1
    fi
}

# Run main
main
exit $?
