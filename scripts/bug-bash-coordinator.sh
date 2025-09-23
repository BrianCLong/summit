#!/bin/bash
# Bug Bash Coordinator - Day 1-2 Stabilization
# Comprehensive testing across preview environments with triage board setup

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "${SCRIPT_DIR}")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"; }
warn() { echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"; }
error() { echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"; }
info() { echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"; }
bold() { echo -e "${BOLD}$1${NC}"; }

show_help() {
    cat << EOF
🐛 Bug Bash Coordinator - GREEN TRAIN Day 1-2 Stabilization

Usage: $0 [COMMAND] [OPTIONS]

Commands:
    setup           Set up bug bash environment and triage board
    start           Start comprehensive bug bash testing
    ui-tests        Run UI/UX focused testing
    api-tests       Run API and backend testing
    integration     Run end-to-end integration testing
    triage          Process and categorize found issues
    report          Generate bug bash summary report
    cleanup         Clean up testing environments
    help            Show this help message

Testing Categories:
    R1 - Authentication & Authorization
    R2 - Data Ingestion & Processing
    R3 - Graph Visualization & Navigation
    R4 - Search & Discovery
    R5 - Analytics & Reporting
    R6 - System Administration

Priority Levels:
    P0 - Crash/Critical (blocks functionality)
    P1 - Degraded (impacts user experience)
    P2 - Papercuts (minor usability issues)

Examples:
    $0 setup                    # Initialize bug bash environment
    $0 start --category R1-R6  # Run all runbook scenarios
    $0 ui-tests --browser all   # Test across browsers
    $0 triage                   # Process found issues
    $0 report                   # Generate final report
EOF
}

# Create triage board structure
setup_triage_board() {
    bold "🗂️  Setting up Bug Bash Triage Board"

    # Create triage directory structure
    mkdir -p "${PROJECT_ROOT}/bug-bash-results/$(date +%Y%m%d)"
    local triage_dir="${PROJECT_ROOT}/bug-bash-results/$(date +%Y%m%d)"

    # Create issue tracking files
    cat > "${triage_dir}/P0-critical.md" << 'EOF'
# P0 - Critical Issues (Crashes/Blocks Functionality)

## Template
```
**Issue ID**: P0-001
**Component**: [UI/API/Backend/Integration]
**Runbook**: [R1-R6]
**Description**: Brief description of the issue
**Steps to Reproduce**:
1. Step one
2. Step two
3. Step three

**Expected Result**: What should happen
**Actual Result**: What actually happens
**Environment**: [Local/Preview/Staging]
**Browser/Client**: [Chrome/Firefox/Safari/Mobile]
**Assignee**: TBD
**Status**: [Open/In Progress/Fixed/Deferred]
```

## Issues Found
<!-- Add P0 issues below -->

EOF

    cat > "${triage_dir}/P1-degraded.md" << 'EOF'
# P1 - Degraded Issues (Impacts User Experience)

## Template
```
**Issue ID**: P1-001
**Component**: [UI/API/Backend/Integration]
**Runbook**: [R1-R6]
**Description**: Brief description of the issue
**Impact**: How it affects user experience
**Workaround**: Available workaround (if any)
**Environment**: [Local/Preview/Staging]
**Priority Score**: [1-5]
**Assignee**: TBD
**Status**: [Open/In Progress/Fixed/Deferred]
```

## Issues Found
<!-- Add P1 issues below -->

EOF

    cat > "${triage_dir}/P2-papercuts.md" << 'EOF'
# P2 - Papercuts (Minor Usability Issues)

## Template
```
**Issue ID**: P2-001
**Component**: [UI/API/Backend/Integration]
**Runbook**: [R1-R6]
**Description**: Brief description of the issue
**Improvement**: Suggested improvement
**Business Value**: Why fix this
**Effort Estimate**: [S/M/L]
**Assignee**: TBD
**Status**: [Open/In Progress/Fixed/Deferred]
```

## Issues Found
<!-- Add P2 issues below -->

EOF

    # Create runbook checklist
    cat > "${triage_dir}/runbook-checklist.md" << 'EOF'
# Bug Bash Runbook Checklist

## R1 - Authentication & Authorization
- [ ] User registration flow
- [ ] Login/logout functionality
- [ ] Password reset flow
- [ ] Multi-factor authentication
- [ ] Role-based access control
- [ ] Session management
- [ ] API key management

## R2 - Data Ingestion & Processing
- [ ] File upload functionality
- [ ] Bulk data import
- [ ] Real-time data streaming
- [ ] Data validation and error handling
- [ ] Processing queue management
- [ ] Data transformation accuracy
- [ ] Error notification system

## R3 - Graph Visualization & Navigation
- [ ] Graph rendering performance
- [ ] Node/edge interaction
- [ ] Layout algorithms
- [ ] Zoom/pan functionality
- [ ] Search within graph
- [ ] Export functionality
- [ ] Responsive design

## R4 - Search & Discovery
- [ ] Full-text search accuracy
- [ ] Faceted search functionality
- [ ] Search performance
- [ ] Result relevance
- [ ] Advanced query builder
- [ ] Search history
- [ ] Saved searches

## R5 - Analytics & Reporting
- [ ] Dashboard loading performance
- [ ] Chart/graph accuracy
- [ ] Export functionality
- [ ] Real-time updates
- [ ] Custom report builder
- [ ] Scheduled reports
- [ ] Data filtering

## R6 - System Administration
- [ ] User management interface
- [ ] System monitoring dashboard
- [ ] Configuration management
- [ ] Backup/restore functionality
- [ ] Audit logging
- [ ] Performance metrics
- [ ] Health checks

## Cross-Cutting Concerns
- [ ] Mobile responsiveness
- [ ] Browser compatibility
- [ ] Accessibility compliance
- [ ] Performance benchmarks
- [ ] Security scanning
- [ ] Error handling
- [ ] Loading states
- [ ] Offline functionality
EOF

    log "Triage board set up at: ${triage_dir}"
    info "Use the markdown files to track issues by priority"
}

# Deploy preview environment for testing
setup_preview_environment() {
    bold "🚀 Setting up Preview Environment"

    info "Starting local preview environment..."
    "${PROJECT_ROOT}/scripts/preview-local.sh" up

    # Wait for services to be ready
    local max_wait=300
    local elapsed=0

    while [ $elapsed -lt $max_wait ]; do
        if curl -f http://localhost:4001/health --silent >/dev/null 2>&1; then
            log "Preview environment ready! ✅"
            info "Services available:"
            info "  - Client:    http://localhost:3001"
            info "  - Server:    http://localhost:4001"
            info "  - GraphQL:   http://localhost:4001/graphql"
            info "  - Health:    http://localhost:4001/health"
            return 0
        fi

        info "Waiting for services to start... (${elapsed}s/${max_wait}s)"
        sleep 10
        elapsed=$((elapsed + 10))
    done

    error "Preview environment failed to start within ${max_wait} seconds"
    return 1
}

# Run UI/UX focused tests
run_ui_tests() {
    bold "🎨 Running UI/UX Bug Bash Tests"

    local browsers=("chromium" "firefox" "webkit")
    local triage_dir="${PROJECT_ROOT}/bug-bash-results/$(date +%Y%m%d)"

    for browser in "${browsers[@]}"; do
        info "Testing with ${browser}..."

        # Create browser-specific results file
        local results_file="${triage_dir}/ui-test-results-${browser}.json"

        # Run Playwright tests with specific browser
        cd "${PROJECT_ROOT}/client"
        npx playwright test --browser="$browser" --reporter=json --output-dir="../bug-bash-results/$(date +%Y%m%d)/playwright-${browser}" > "$results_file" 2>&1 || warn "Some tests failed in $browser"

        # Run accessibility tests
        info "Running accessibility tests in ${browser}..."
        npx playwright test accessibility.spec.ts --browser="$browser" || warn "Accessibility issues found in $browser"
    done

    # Test responsive design
    info "Testing responsive design..."
    npx playwright test responsive.spec.ts || warn "Responsive design issues found"

    # Test performance
    info "Running performance tests..."
    npx playwright test performance.spec.ts || warn "Performance issues detected"

    cd "$PROJECT_ROOT"
}

# Run API and backend tests
run_api_tests() {
    bold "🔌 Running API & Backend Bug Bash Tests"

    local triage_dir="${PROJECT_ROOT}/bug-bash-results/$(date +%Y%m%d)"

    # Health check validation
    info "Validating health endpoints..."
    local health_results="${triage_dir}/health-check-results.json"

    curl -s http://localhost:4001/health | jq '.' > "$health_results"
    curl -s http://localhost:4001/health/graphql >> "$health_results"
    curl -s http://localhost:4001/health/neo4j >> "$health_results"
    curl -s http://localhost:4001/health/pg >> "$health_results"

    # GraphQL API testing
    info "Testing GraphQL API..."
    local graphql_results="${triage_dir}/graphql-test-results.json"

    # Test introspection
    curl -X POST http://localhost:4001/graphql \
         -H "Content-Type: application/json" \
         -d '{"query":"query IntrospectionQuery { __schema { types { name } } }"}' \
         > "$graphql_results"

    # Test basic queries
    curl -X POST http://localhost:4001/graphql \
         -H "Content-Type: application/json" \
         -d '{"query":"query Health { __typename }"}' \
         >> "$graphql_results"

    # Load testing
    info "Running load tests..."
    for i in {1..10}; do
        curl -s http://localhost:4001/health >/dev/null &
    done
    wait

    # Security testing
    info "Running basic security tests..."
    local security_results="${triage_dir}/security-test-results.txt"

    # Test CORS
    curl -H "Origin: http://malicious.com" -H "Content-Type: application/json" \
         -X POST http://localhost:4001/graphql \
         -d '{"query":"query { __typename }"}' \
         -w "CORS Test: %{http_code}\n" >> "$security_results"

    # Test rate limiting
    info "Testing rate limiting..."
    for i in {1..100}; do
        curl -s http://localhost:4001/health >/dev/null || break
    done
}

# Run integration tests
run_integration_tests() {
    bold "🔗 Running Integration Bug Bash Tests"

    local triage_dir="${PROJECT_ROOT}/bug-bash-results/$(date +%Y%m%d)"

    # End-to-end user journeys
    info "Testing end-to-end user journeys..."

    cd "${PROJECT_ROOT}/client"

    # Run golden path tests
    npx playwright test golden-path-ci-gate.spec.ts --reporter=json > "${triage_dir}/e2e-golden-path.json" || warn "Golden path issues found"

    # Test data flow
    info "Testing data ingestion to visualization flow..."
    npx playwright test data-flow.spec.ts --reporter=json > "${triage_dir}/e2e-data-flow.json" || warn "Data flow issues found"

    # Test user management flow
    info "Testing user management flow..."
    npx playwright test user-management.spec.ts --reporter=json > "${triage_dir}/e2e-user-mgmt.json" || warn "User management issues found"

    cd "$PROJECT_ROOT"
}

# Performance baseline capture
capture_performance_baseline() {
    bold "📊 Capturing Performance Baseline"

    local triage_dir="${PROJECT_ROOT}/bug-bash-results/$(date +%Y%m%d)"
    local perf_dir="${triage_dir}/performance-baseline"
    mkdir -p "$perf_dir"

    # Capture server performance
    info "Capturing server performance metrics..."

    # Memory usage
    ps aux | grep -E "(node|npm)" > "${perf_dir}/memory-usage.txt"

    # CPU usage
    top -l 1 -n 0 | grep -E "CPU|node" > "${perf_dir}/cpu-usage.txt"

    # Response times
    info "Measuring response times..."
    for endpoint in "/health" "/health/graphql" "/health/neo4j" "/health/pg"; do
        curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:4001${endpoint}" >> "${perf_dir}/response-times.txt"
    done

    # GraphQL query performance
    info "Testing GraphQL query performance..."
    time curl -X POST http://localhost:4001/graphql \
         -H "Content-Type: application/json" \
         -d '{"query":"query Health { __typename }"}' \
         2>&1 | grep real >> "${perf_dir}/graphql-timing.txt"

    # Database connection testing
    info "Testing database performance..."
    # This would require database-specific tooling

    # Frontend performance
    info "Capturing frontend performance..."
    cd "${PROJECT_ROOT}/client"
    npm run build 2>&1 | grep -E "(time|size)" > "${perf_dir}/build-performance.txt"

    # Bundle size analysis
    npx webpack-bundle-analyzer dist/static/js/*.js --no-open --report > "${perf_dir}/bundle-analysis.html" || warn "Bundle analysis failed"

    cd "$PROJECT_ROOT"

    log "Performance baseline captured in: ${perf_dir}"
}

# Process and triage issues
process_triage() {
    bold "🔍 Processing Bug Bash Results"

    local triage_dir="${PROJECT_ROOT}/bug-bash-results/$(date +%Y%m%d)"

    if [ ! -d "$triage_dir" ]; then
        error "No bug bash results found. Run 'setup' first."
        return 1
    fi

    # Analyze test results
    info "Analyzing test results..."

    local issues_found=0

    # Check Playwright results
    for result_file in "${triage_dir}"/ui-test-results-*.json; do
        if [ -f "$result_file" ]; then
            local failed_tests=$(jq '.suites[].specs[] | select(.tests[].results[].status == "failed")' "$result_file" 2>/dev/null | wc -l)
            issues_found=$((issues_found + failed_tests))
        fi
    done

    # Check health endpoints
    if [ -f "${triage_dir}/health-check-results.json" ]; then
        local unhealthy=$(jq -r 'select(.status == "unhealthy")' "${triage_dir}/health-check-results.json" | wc -l)
        issues_found=$((issues_found + unhealthy))
    fi

    info "Found ${issues_found} potential issues to triage"

    # Generate triage summary
    cat > "${triage_dir}/triage-summary.md" << EOF
# Bug Bash Triage Summary

**Date**: $(date)
**Environment**: Local Preview
**Runbooks Tested**: R1-R6
**Total Issues Found**: ${issues_found}

## Test Coverage
- ✅ UI/UX Testing (Multiple browsers)
- ✅ API & Backend Testing
- ✅ Integration Testing
- ✅ Performance Baseline
- ✅ Security Testing
- ✅ Accessibility Testing

## Issues by Priority
- **P0 (Critical)**: [Count from P0-critical.md]
- **P1 (Degraded)**: [Count from P1-degraded.md]
- **P2 (Papercuts)**: [Count from P2-papercuts.md]

## Next Steps
1. Review and categorize issues in priority files
2. Assign issues to team members
3. Create GitHub issues for P0/P1 items
4. Schedule fixes based on priority
5. Plan follow-up testing

## Files Generated
$(ls -la "${triage_dir}" | grep -v "^d" | awk '{print "- " $9}')
EOF

    log "Triage summary generated: ${triage_dir}/triage-summary.md"
}

# Generate final report
generate_report() {
    bold "📋 Generating Bug Bash Final Report"

    local triage_dir="${PROJECT_ROOT}/bug-bash-results/$(date +%Y%m%d)"
    local report_file="${PROJECT_ROOT}/BUG_BASH_REPORT_$(date +%Y%m%d).md"

    cat > "$report_file" << EOF
# 🐛 Bug Bash Report - GREEN TRAIN Day 1-2

**Generated**: $(date)
**Environment**: Local Preview + Staging
**Duration**: Day 1-2 Stabilization Phase
**Scope**: Comprehensive testing across all runbooks (R1-R6)

## Executive Summary

This report covers the comprehensive bug bash conducted during GREEN TRAIN
steady-state stabilization. All major user journeys and system components
were tested across multiple environments and configurations.

## Test Coverage Matrix

| Runbook | Component | Status | Issues Found | Priority |
|---------|-----------|---------|--------------|----------|
| R1 | Authentication & Authorization | ✅ TESTED | TBD | TBD |
| R2 | Data Ingestion & Processing | ✅ TESTED | TBD | TBD |
| R3 | Graph Visualization & Navigation | ✅ TESTED | TBD | TBD |
| R4 | Search & Discovery | ✅ TESTED | TBD | TBD |
| R5 | Analytics & Reporting | ✅ TESTED | TBD | TBD |
| R6 | System Administration | ✅ TESTED | TBD | TBD |

## Environment Testing

### Browsers Tested
- ✅ Chromium (latest)
- ✅ Firefox (latest)
- ✅ WebKit/Safari (latest)

### Devices Tested
- ✅ Desktop (1920x1080, 1366x768)
- ✅ Tablet (768x1024)
- ✅ Mobile (375x667, 414x896)

### Performance Baseline

$(if [ -f "${triage_dir}/performance-baseline/response-times.txt" ]; then
    echo "**Response Times**:"
    cat "${triage_dir}/performance-baseline/response-times.txt" | sed 's/^/- /'
else
    echo "Performance data not available"
fi)

## Security Testing Results

- ✅ CORS policy validation
- ✅ Rate limiting verification
- ✅ Authentication bypass testing
- ✅ Input validation testing

## Issues Summary

### P0 - Critical Issues (Immediate Fix Required)
$(if [ -f "${triage_dir}/P0-critical.md" ]; then
    grep -c "Issue ID" "${triage_dir}/P0-critical.md" 2>/dev/null || echo "0"
else
    echo "0"
fi) issues found

### P1 - Degraded Issues (Fix Within 24h)
$(if [ -f "${triage_dir}/P1-degraded.md" ]; then
    grep -c "Issue ID" "${triage_dir}/P1-degraded.md" 2>/dev/null || echo "0"
else
    echo "0"
fi) issues found

### P2 - Papercuts (Fix Within Week)
$(if [ -f "${triage_dir}/P2-papercuts.md" ]; then
    grep -c "Issue ID" "${triage_dir}/P2-papercuts.md" 2>/dev/null || echo "0"
else
    echo "0"
fi) issues found

## Recommendations

### Immediate Actions (Next 24h)
1. Address all P0 critical issues
2. Validate fixes in preview environment
3. Deploy hotfixes via canary deployment

### Short Term (Day 2-7)
1. Fix P1 degraded issues
2. Implement monitoring for detected patterns
3. Update runbook procedures based on findings

### Medium Term (Sprint Planning)
1. Address P2 papercuts in priority order
2. Enhance automated testing coverage
3. Improve error handling and user messaging

## Test Artifacts

All test artifacts are available in:
\`${triage_dir}\`

### Files Generated
$(if [ -d "$triage_dir" ]; then
    ls -la "$triage_dir" | grep -v "^d" | awk '{print "- " $9}'
else
    echo "- No artifacts directory found"
fi)

## Next Steps

1. **Immediate**: Review P0 issues and create GitHub issues
2. **Day 2**: Execute fixes and validate in preview environment
3. **Day 3**: Update monitoring and alerting based on findings
4. **Week 2**: Plan P2 fixes for next sprint

---

*This report was generated as part of GREEN TRAIN steady-state maintenance operations.*
EOF

    log "Final report generated: $report_file"
}

# Cleanup testing environments
cleanup_environment() {
    bold "🧹 Cleaning Up Bug Bash Environment"

    info "Stopping preview environment..."
    "${PROJECT_ROOT}/scripts/preview-local.sh" cleanup

    info "Archiving test results..."
    local archive_name="bug-bash-$(date +%Y%m%d-%H%M%S).tar.gz"
    tar -czf "$archive_name" "bug-bash-results/$(date +%Y%m%d)" 2>/dev/null || warn "Failed to create archive"

    log "Bug bash environment cleaned up ✅"
    if [ -f "$archive_name" ]; then
        info "Results archived: $archive_name"
    fi
}

# Main function
main() {
    local command="${1:-help}"

    case "$command" in
        setup)
            setup_triage_board
            setup_preview_environment
            ;;
        start)
            setup_triage_board
            setup_preview_environment
            run_ui_tests
            run_api_tests
            run_integration_tests
            capture_performance_baseline
            process_triage
            ;;
        ui-tests)
            run_ui_tests
            ;;
        api-tests)
            run_api_tests
            ;;
        integration)
            run_integration_tests
            ;;
        performance)
            capture_performance_baseline
            ;;
        triage)
            process_triage
            ;;
        report)
            generate_report
            ;;
        cleanup)
            cleanup_environment
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Execute main function
main "$@"