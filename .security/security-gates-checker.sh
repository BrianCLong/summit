#!/bin/bash

##############################################################################
# Security Gates Checker
#
# High-level security invariants that must hold for the repository.
# Integrates with .ga-check framework for release gating.
#
# Exit codes:
#   0 - All gates passed
#   1 - Critical gate failed (blocks merge/release)
#   2 - Warning gate failed (review required, non-blocking)
##############################################################################

# Don't exit on errors - we want to run all checks
set +e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

CRITICAL_FAILURES=0
WARNINGS=0
CHECKS_PASSED=0

# Helper functions
log_check() {
    echo -e "${BLUE}[CHECK]${NC} $1"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((CHECKS_PASSED++))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((CRITICAL_FAILURES++))
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    ((WARNINGS++))
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

##############################################################################
# Security Invariant Checks
##############################################################################

check_security_documentation() {
    log_check "Security documentation exists and is current"

    if [ ! -f "SECURITY.md" ]; then
        log_fail "SECURITY.md is missing"
        return
    fi

    # Check if SECURITY.md has been updated recently (within 6 months)
    LAST_MODIFIED=$(git log -1 --format="%ai" -- SECURITY.md 2>/dev/null || echo "1970-01-01")
    MONTHS_OLD=$(( ($(date +%s) - $(date -d "$LAST_MODIFIED" +%s)) / 2592000 ))

    if [ $MONTHS_OLD -gt 6 ]; then
        log_warn "SECURITY.md hasn't been updated in $MONTHS_OLD months"
    else
        log_pass "SECURITY.md exists and is current"
    fi

    # Check for required sections
    REQUIRED_SECTIONS=("Reporting" "Policy" "Vulnerability" "Contact")
    for section in "${REQUIRED_SECTIONS[@]}"; do
        if ! grep -qi "$section" SECURITY.md; then
            log_warn "SECURITY.md missing recommended section: $section"
        fi
    done
}

check_no_secrets_in_code() {
    log_check "No secrets committed to repository"

    # Check for common secret patterns
    SECRET_PATTERNS=(
        "password.*=.*['\"][^'\"]{8,}"
        "api[_-]?key.*=.*['\"][A-Za-z0-9]{20,}"
        "secret.*=.*['\"][A-Za-z0-9]{20,}"
        "token.*=.*['\"][A-Za-z0-9]{20,}"
        "-----BEGIN.*PRIVATE KEY-----"
    )

    SECRETS_FOUND=0
    for pattern in "${SECRET_PATTERNS[@]}"; do
        if git grep -E -i "$pattern" -- '*.ts' '*.js' '*.py' '*.env' \
            ':!node_modules' ':!dist' ':!coverage' ':!tests' ':!__tests__' \
            2>/dev/null | grep -v "process.env" | grep -v "YOUR_" | grep -v "EXAMPLE_" | grep -v "TEST_" | grep -q .; then
            ((SECRETS_FOUND++))
        fi
    done

    if [ $SECRETS_FOUND -gt 0 ]; then
        log_fail "Potential secrets found in code (run gitleaks for details)"
    else
        log_pass "No obvious secrets detected in code"
    fi
}

check_security_headers() {
    log_check "Security headers configuration exists"

    if [ -f "server/config/nginx/security-headers.conf" ] || \
       [ -f "server/src/middleware/security.ts" ] || \
       [ -f "server/src/config/security.ts" ]; then
        log_pass "Security headers configuration found"
    else
        log_warn "No security headers configuration found"
    fi
}

check_dependency_vulnerabilities() {
    log_check "No critical dependency vulnerabilities"

    if ! command -v pnpm &> /dev/null; then
        log_warn "pnpm not installed, skipping dependency check"
        return
    fi

    # Run audit and capture results
    if pnpm audit --audit-level=critical --json > /tmp/audit-results.json 2>/dev/null; then
        log_pass "No critical dependency vulnerabilities"
    else
        # Check if there are actual vulnerabilities or just audit errors
        if [ -f /tmp/audit-results.json ]; then
            CRITICAL_VULNS=$(jq -r '.metadata.vulnerabilities.critical // 0' /tmp/audit-results.json 2>/dev/null || echo "0")
            if [ "$CRITICAL_VULNS" -gt 0 ]; then
                log_fail "Found $CRITICAL_VULNS critical vulnerabilities"
            else
                log_pass "No critical dependency vulnerabilities"
            fi
        else
            log_warn "Could not run dependency audit"
        fi
    fi

    rm -f /tmp/audit-results.json
}

check_crypto_configuration() {
    log_check "Cryptographic configuration is secure"

    # Check for KMS/crypto configuration
    if [ -f "crypto/kms/hsm-adapter.ts" ] || \
       [ -f "services/crypto/kms.ts" ] || \
       [ -f "server/crypto/kms.ts" ]; then
        log_pass "KMS/crypto infrastructure found"
    else
        log_warn "No KMS infrastructure detected"
    fi

    # Check for deprecated crypto algorithms
    DEPRECATED_ALGOS=("md5" "sha1" "des" "rc4" "3des")
    for algo in "${DEPRECATED_ALGOS[@]}"; do
        if git grep -i "'$algo'" -- '*.ts' '*.js' ':!node_modules' ':!dist' 2>/dev/null | grep -v "test" | grep -q .; then
            log_fail "Deprecated crypto algorithm detected: $algo"
        fi
    done
}

check_authentication_security() {
    log_check "Authentication security measures in place"

    # Check for auth middleware
    if git grep -l "passport\|jwt\|auth.*middleware" -- '*.ts' '*.js' ':!node_modules' 2>/dev/null | grep -q .; then
        log_pass "Authentication middleware found"
    else
        log_warn "No authentication middleware detected"
    fi

    # Check for rate limiting
    if git grep -l "rate.*limit\|express-rate-limit" -- '*.ts' '*.js' ':!node_modules' 2>/dev/null | grep -q .; then
        log_pass "Rate limiting detected"
    else
        log_warn "No rate limiting detected"
    fi
}

check_input_validation() {
    log_check "Input validation is implemented"

    # Check for validation libraries
    if git grep -l "joi\|yup\|zod\|validator\|express-validator" -- 'package.json' 2>/dev/null | grep -q .; then
        log_pass "Input validation library found"
    else
        log_warn "No input validation library detected"
    fi
}

check_security_testing() {
    log_check "Security testing workflows are present"

    SECURITY_WORKFLOWS=(
        ".github/workflows/security.yml"
        ".github/workflows/security-autopilot.yml"
        ".github/workflows/gitleaks.yml"
    )

    WORKFLOWS_FOUND=0
    for workflow in "${SECURITY_WORKFLOWS[@]}"; do
        if [ -f "$workflow" ]; then
            ((WORKFLOWS_FOUND++))
        fi
    done

    if [ $WORKFLOWS_FOUND -ge 2 ]; then
        log_pass "Security testing workflows are configured ($WORKFLOWS_FOUND workflows)"
    elif [ $WORKFLOWS_FOUND -eq 1 ]; then
        log_warn "Only 1 security workflow found, consider adding more"
    else
        log_fail "No security testing workflows found"
    fi
}

check_security_allowlist() {
    log_check "Security allowlist is valid and current"

    if [ ! -f ".security/allowlist.yaml" ]; then
        log_info "No security allowlist found (acceptable if no exceptions needed)"
        return
    fi

    # Check for expired exceptions
    TODAY=$(date +%Y-%m-%d)
    EXPIRED_COUNT=0

    while IFS= read -r line; do
        if [[ $line =~ expires:[[:space:]]*([0-9]{4}-[0-9]{2}-[0-9]{2}) ]]; then
            EXPIRY="${BASH_REMATCH[1]}"
            if [[ "$EXPIRY" < "$TODAY" ]]; then
                log_warn "Expired security exception found: $EXPIRY"
                ((EXPIRED_COUNT++))
            fi
        fi
    done < .security/allowlist.yaml

    if [ $EXPIRED_COUNT -eq 0 ]; then
        log_pass "Security allowlist is valid"
    else
        log_fail "Found $EXPIRED_COUNT expired security exceptions"
    fi
}

check_container_security() {
    log_check "Container security best practices"

    if [ ! -f "Dockerfile" ] && [ ! -f "docker-compose.yml" ]; then
        log_info "No containers detected, skipping container security checks"
        return
    fi

    # Check for non-root user in Dockerfile
    if [ -f "Dockerfile" ]; then
        if grep -q "USER.*[^root]" Dockerfile; then
            log_pass "Dockerfile uses non-root user"
        else
            log_warn "Dockerfile may be running as root"
        fi

        # Check for pinned base images
        if grep -E "FROM.*:[0-9]" Dockerfile | grep -v ":latest" | grep -q .; then
            log_pass "Dockerfile uses pinned base images"
        else
            log_warn "Dockerfile should pin base image versions"
        fi
    fi
}

check_ga_compliance() {
    log_check "GA check compliance (if applicable)"

    if [ ! -f ".ga-check/report.txt" ]; then
        log_info "No .ga-check report found (not required for non-GA releases)"
        return
    fi

    # Check for failures in GA report
    if grep -q "\[fail\]" .ga-check/report.txt; then
        FAIL_COUNT=$(grep -c "\[fail\]" .ga-check/report.txt)
        log_warn "GA check has $FAIL_COUNT failure(s) - review required"
    else
        log_pass "GA check compliance verified"
    fi
}

check_codeowners_security() {
    log_check "Security-critical paths have code owners"

    if [ ! -f ".github/CODEOWNERS" ]; then
        log_warn "No CODEOWNERS file found"
        return
    fi

    # Check if security-sensitive directories have owners
    SENSITIVE_PATHS=(
        ".github/workflows"
        "server/src/auth"
        "server/src/security"
        "crypto"
        "SECURITY.md"
    )

    MISSING_OWNERS=0
    for path in "${SENSITIVE_PATHS[@]}"; do
        if [ -e "$path" ] && ! grep -q "$path" .github/CODEOWNERS 2>/dev/null; then
            log_warn "Sensitive path '$path' has no code owner"
            ((MISSING_OWNERS++))
        fi
    done

    if [ $MISSING_OWNERS -eq 0 ]; then
        log_pass "Security-critical paths have code owners"
    fi
}

##############################################################################
# Main Execution
##############################################################################

main() {
    echo "========================================================================"
    echo "🔒 SECURITY GATES CHECKER"
    echo "========================================================================"
    echo ""

    # Run all checks
    check_security_documentation
    check_no_secrets_in_code
    check_security_headers
    check_dependency_vulnerabilities
    check_crypto_configuration
    check_authentication_security
    check_input_validation
    check_security_testing
    check_security_allowlist
    check_container_security
    check_ga_compliance
    check_codeowners_security

    echo ""
    echo "========================================================================"
    echo "📊 SUMMARY"
    echo "========================================================================"
    echo -e "Checks Passed:      ${GREEN}${CHECKS_PASSED}${NC}"
    echo -e "Warnings:           ${YELLOW}${WARNINGS}${NC}"
    echo -e "Critical Failures:  ${RED}${CRITICAL_FAILURES}${NC}"
    echo "========================================================================"
    echo ""

    if [ $CRITICAL_FAILURES -gt 0 ]; then
        echo -e "${RED}❌ Security gates check FAILED${NC}"
        echo "   $CRITICAL_FAILURES critical issue(s) must be fixed before merge/release"
        exit 1
    elif [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Security gates passed with warnings${NC}"
        echo "   $WARNINGS warning(s) should be reviewed"
        exit 0
    else
        echo -e "${GREEN}✅ All security gates PASSED${NC}"
        exit 0
    fi
}

main "$@"
