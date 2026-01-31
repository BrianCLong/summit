#!/usr/bin/env bash
set -euo pipefail

# Conductor Evaluation Harness
# Runs golden task suite and enforces quality gates

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

say() { printf "\n${BLUE}== %s ==${NC}\n" "$*"; }
pass() { printf "${GREEN}✅ %s${NC}\n" "$*"; }
fail() { printf "${RED}❌ %s${NC}\n" "$*"; }
warn() { printf "${YELLOW}⚠️  %s${NC}\n" "$*"; }
info() { printf "${PURPLE}📋 %s${NC}\n" "$*"; }

# Configuration
CONDUCTOR_URL="${CONDUCTOR_URL:-http://localhost:3000}"
TIMEOUT="${TIMEOUT:-300}"
PARALLEL="${PARALLEL:-true}"
MAX_CONCURRENCY="${MAX_CONCURRENCY:-5}"
UPDATE_BASELINES="${UPDATE_BASELINES:-false}"
FAIL_ON_REGRESSION="${FAIL_ON_REGRESSION:-true}"
REGRESSION_THRESHOLD="${REGRESSION_THRESHOLD:-0.1}"
QUALITY_THRESHOLD="${QUALITY_THRESHOLD:-0.8}"
PASS_RATE_THRESHOLD="${PASS_RATE_THRESHOLD:-0.85}"

# CI/CD Integration
CI_MODE="${CI:-false}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
PR_NUMBER="${PR_NUMBER:-}"
BRANCH_NAME="${BRANCH_NAME:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')}"
COMMIT_SHA="${COMMIT_SHA:-$(git rev-parse HEAD 2>/dev/null || echo 'unknown')}"

# Results
EVALUATION_ID=""
RESULTS_FILE=""
QUALITY_GATE_STATUS=""

# Run evaluation suite
run_evaluation() {
    say "🧪 Running Conductor Evaluation Suite"
    
    local filters=""
    local config_params=""
    
    # Build filter parameters
    if [ -n "${TASK_FILTER:-}" ]; then
        filters="taskFilter=$(echo $TASK_FILTER | tr ',' '&taskFilter=')"
    fi
    
    if [ -n "${TENANT_FILTER:-}" ]; then
        if [ -n "$filters" ]; then
            filters="$filters&"
        fi
        filters="${filters}tenantFilter=$(echo $TENANT_FILTER | tr ',' '&tenantFilter=')"
    fi
    
    # Build configuration
    config_params="parallel=$PARALLEL&maxConcurrency=$MAX_CONCURRENCY&timeoutMs=${TIMEOUT}000&updateBaselines=$UPDATE_BASELINES"
    
    # Construct request URL
    local eval_url="$CONDUCTOR_URL/api/evaluation/run"
    if [ -n "$filters" ] || [ -n "$config_params" ]; then
        eval_url="$eval_url?"
        if [ -n "$filters" ]; then
            eval_url="$eval_url$filters"
        fi
        if [ -n "$config_params" ]; then
            if [ -n "$filters" ]; then
                eval_url="$eval_url&"
            fi
            eval_url="$eval_url$config_params"
        fi
    fi
    
    info "Starting evaluation with URL: $eval_url"
    info "Configuration: Parallel=$PARALLEL, Concurrency=$MAX_CONCURRENCY, Timeout=${TIMEOUT}s"
    
    # Make API call
    local response
    if ! response=$(curl -s -f -X POST "$eval_url" \
        -H "Content-Type: application/json" \
        -H "User-Agent: conductor-eval/1.0" \
        --max-time $((TIMEOUT + 60))); then
        fail "Failed to start evaluation"
        echo "Response: $response"
        exit 1
    fi
    
    # Extract evaluation ID
    EVALUATION_ID=$(echo "$response" | jq -r '.id // empty')
    if [ -z "$EVALUATION_ID" ]; then
        fail "No evaluation ID returned"
        echo "Response: $response"
        exit 1
    fi
    
    pass "Evaluation started: $EVALUATION_ID"
    
    # Wait for completion
    wait_for_completion
}

# Wait for evaluation completion
wait_for_completion() {
    say "⏳ Waiting for Evaluation Completion"
    
    local max_wait=$((TIMEOUT + 120)) # Extra 2 minutes buffer
    local elapsed=0
    local check_interval=10
    
    while [ $elapsed -lt $max_wait ]; do
        local status_response
        if status_response=$(curl -s -f "$CONDUCTOR_URL/api/evaluation/runs/$EVALUATION_ID"); then
            local status=$(echo "$status_response" | jq -r '.summary.qualityGate // "running"')
            local completed=$(echo "$status_response" | jq -r '.duration // 0')
            
            if [ "$completed" != "0" ]; then
                # Evaluation completed
                RESULTS_FILE="evaluation-results-$EVALUATION_ID.json"
                echo "$status_response" > "$RESULTS_FILE"
                
                QUALITY_GATE_STATUS="$status"
                pass "Evaluation completed in ${completed}ms"
                break
            else
                # Still running
                local progress=$(echo "$status_response" | jq -r '(.summary.passed + .summary.failed + .summary.skipped) // 0')
                local total=$(echo "$status_response" | jq -r '.summary.totalTasks // 0')
                
                if [ "$total" -gt 0 ]; then
                    info "Progress: $progress/$total tasks completed"
                else
                    info "Evaluation in progress..."
                fi
            fi
        else
            warn "Failed to get evaluation status, retrying..."
        fi
        
        sleep $check_interval
        elapsed=$((elapsed + check_interval))
    done
    
    if [ $elapsed -ge $max_wait ]; then
        fail "Evaluation timed out after ${max_wait}s"
        exit 1
    fi
}

# Analyze results
analyze_results() {
    say "📊 Analyzing Evaluation Results"
    
    if [ ! -f "$RESULTS_FILE" ]; then
        fail "Results file not found: $RESULTS_FILE"
        exit 1
    fi
    
    # Extract key metrics
    local total_tasks=$(jq -r '.summary.totalTasks' "$RESULTS_FILE")
    local passed=$(jq -r '.summary.passed' "$RESULTS_FILE")
    local failed=$(jq -r '.summary.failed' "$RESULTS_FILE")
    local skipped=$(jq -r '.summary.skipped' "$RESULTS_FILE")
    local avg_score=$(jq -r '.summary.avgScore' "$RESULTS_FILE")
    local avg_duration=$(jq -r '.summary.avgDuration' "$RESULTS_FILE")
    local regression_detected=$(jq -r '.summary.regressionDetected' "$RESULTS_FILE")
    local quality_gate=$(jq -r '.summary.qualityGate' "$RESULTS_FILE")
    
    # Calculate pass rate
    local pass_rate
    if [ "$total_tasks" -gt 0 ]; then
        pass_rate=$(echo "scale=3; $passed / $total_tasks" | bc)
    else
        pass_rate="0"
    fi
    
    info "📈 Evaluation Summary:"
    echo "  Total Tasks: $total_tasks"
    echo "  Passed: $passed"
    echo "  Failed: $failed" 
    echo "  Skipped: $skipped"
    echo "  Pass Rate: $(echo "$pass_rate * 100" | bc)%"
    echo "  Average Score: $(echo "scale=3; $avg_score * 100" | bc)%"
    echo "  Average Duration: ${avg_duration}ms"
    echo "  Quality Gate: $quality_gate"
    echo "  Regression Detected: $regression_detected"
    
    # Category breakdown
    echo ""
    info "📋 Category Breakdown:"
    jq -r '.results | group_by(.metadata.category) | .[] | "\(.[0].metadata.category): \(map(select(.status == "passed")) | length)/\(length) passed"' "$RESULTS_FILE"
    
    # Tenant breakdown  
    echo ""
    info "🏢 Tenant Breakdown:"
    jq -r '.results | group_by(.metadata.tenant) | .[] | "\(.[0].metadata.tenant): \(map(select(.status == "passed")) | length)/\(length) passed"' "$RESULTS_FILE"
    
    # Expert performance
    echo ""
    info "🤖 Expert Performance:"
    jq -r '.results | group_by(.expert) | .[] | "\(.[0].expert): \(map(select(.status == "passed")) | length)/\(length) passed (avg score: \((map(.score) | add / length) * 100 | floor)%)"' "$RESULTS_FILE"
    
    # Failed tasks details
    local failed_count=$(jq -r '[.results[] | select(.status == "failed")] | length' "$RESULTS_FILE")
    if [ "$failed_count" -gt 0 ]; then
        echo ""
        warn "❌ Failed Tasks:"
        jq -r '.results[] | select(.status == "failed") | "  - \(.taskId) (\(.metadata.category)): \(.scoringDetails.feedback // .error // "No details")"' "$RESULTS_FILE"
    fi
    
    # Regression details
    if [ "$regression_detected" = "true" ]; then
        echo ""
        warn "⚠️  Regressions Detected:"
        jq -r '.regressions[]? // empty | "  - \(.tenant)/\(.category): \(.scoreDrop * 100 | floor)% drop (from \(.baselineScore * 100 | floor)% to \(.currentScore * 100 | floor)%)"' "$RESULTS_FILE"
    fi
}

# Check quality gates
check_quality_gates() {
    say "🚪 Checking Quality Gates"
    
    local quality_gate=$(jq -r '.summary.qualityGate' "$RESULTS_FILE")
    local pass_rate=$(echo "scale=3; $(jq -r '.summary.passed') / $(jq -r '.summary.totalTasks')" "$RESULTS_FILE" | bc)
    local avg_score=$(jq -r '.summary.avgScore' "$RESULTS_FILE")
    local regression_detected=$(jq -r '.summary.regressionDetected' "$RESULTS_FILE")
    
    local gates_passed=true
    
    # Check pass rate threshold
    if (( $(echo "$pass_rate < $PASS_RATE_THRESHOLD" | bc -l) )); then
        fail "Pass rate below threshold: $(echo "$pass_rate * 100" | bc)% < $(echo "$PASS_RATE_THRESHOLD * 100" | bc)%"
        gates_passed=false
    else
        pass "Pass rate threshold met: $(echo "$pass_rate * 100" | bc)%"
    fi
    
    # Check quality score threshold
    if (( $(echo "$avg_score < $QUALITY_THRESHOLD" | bc -l) )); then
        fail "Quality score below threshold: $(echo "$avg_score * 100" | bc)% < $(echo "$QUALITY_THRESHOLD * 100" | bc)%"
        gates_passed=false
    else
        pass "Quality score threshold met: $(echo "$avg_score * 100" | bc)%"
    fi
    
    # Check regression policy
    if [ "$FAIL_ON_REGRESSION" = "true" ] && [ "$regression_detected" = "true" ]; then
        fail "Regressions detected and fail-on-regression is enabled"
        gates_passed=false
    elif [ "$regression_detected" = "true" ]; then
        warn "Regressions detected but not blocking"
    else
        pass "No regressions detected"
    fi
    
    # Overall quality gate
    if [ "$quality_gate" = "pass" ]; then
        pass "Overall quality gate: PASS"
    elif [ "$quality_gate" = "warning" ]; then
        warn "Overall quality gate: WARNING"
        if [ "$CI_MODE" = "true" ]; then
            gates_passed=false  # Treat warnings as failures in CI
        fi
    else
        fail "Overall quality gate: FAIL"
        gates_passed=false
    fi
    
    if [ "$gates_passed" = "false" ]; then
        fail "Quality gates FAILED"
        return 1
    else
        pass "Quality gates PASSED"
        return 0
    fi
}

# Post results to Prometheus
post_to_prometheus() {
    say "📊 Posting Metrics to Prometheus"
    
    # Extract metrics
    local pass_rate=$(echo "scale=3; $(jq -r '.summary.passed') / $(jq -r '.summary.totalTasks')" "$RESULTS_FILE" | bc)
    local avg_score=$(jq -r '.summary.avgScore' "$RESULTS_FILE")
    local duration=$(jq -r '.duration' "$RESULTS_FILE")
    local regression_count=$(jq -r '.regressions | length' "$RESULTS_FILE" 2>/dev/null || echo "0")
    
    # Push to pushgateway if available
    if command -v curl >/dev/null && [ -n "${PUSHGATEWAY_URL:-}" ]; then
        info "Pushing metrics to Pushgateway: $PUSHGATEWAY_URL"
        
        {
            echo "# TYPE conductor_eval_pass_rate gauge"
            echo "conductor_eval_pass_rate{branch=\"$BRANCH_NAME\",commit=\"${COMMIT_SHA:0:8}\"} $pass_rate"
            echo "# TYPE conductor_eval_quality_score gauge"
            echo "conductor_eval_quality_score{branch=\"$BRANCH_NAME\",commit=\"${COMMIT_SHA:0:8}\"} $avg_score"
            echo "# TYPE conductor_eval_duration_ms gauge"
            echo "conductor_eval_duration_ms{branch=\"$BRANCH_NAME\",commit=\"${COMMIT_SHA:0:8}\"} $duration"
            echo "# TYPE conductor_eval_regressions gauge"
            echo "conductor_eval_regressions{branch=\"$BRANCH_NAME\",commit=\"${COMMIT_SHA:0:8}\"} $regression_count"
        } | curl -s --data-binary @- "$PUSHGATEWAY_URL/metrics/job/conductor-eval/instance/$EVALUATION_ID" || true
        
        pass "Metrics pushed to Pushgateway"
    else
        info "Pushgateway not configured, skipping metric push"
    fi
}

# Post PR comment
post_pr_comment() {
    if [ "$CI_MODE" = "false" ] || [ -z "$GITHUB_TOKEN" ] || [ -z "$PR_NUMBER" ]; then
        info "Skipping PR comment (not in CI or missing configuration)"
        return 0
    fi
    
    say "💬 Posting PR Comment"
    
    # Extract results
    local total_tasks=$(jq -r '.summary.totalTasks' "$RESULTS_FILE")
    local passed=$(jq -r '.summary.passed' "$RESULTS_FILE")
    local failed=$(jq -r '.summary.failed' "$RESULTS_FILE")
    local pass_rate=$(echo "scale=1; $passed * 100 / $total_tasks" | bc)
    local avg_score=$(echo "scale=1; $(jq -r '.summary.avgScore') * 100" | bc)
    local quality_gate=$(jq -r '.summary.qualityGate' "$RESULTS_FILE")
    local regression_detected=$(jq -r '.summary.regressionDetected' "$RESULTS_FILE")
    
    # Determine status emoji
    local status_emoji="✅"
    if [ "$quality_gate" = "fail" ]; then
        status_emoji="❌"
    elif [ "$quality_gate" = "warning" ]; then
        status_emoji="⚠️"
    fi
    
    # Build comment body
    local comment_body
    comment_body=$(cat << EOF
## ${status_emoji} Conductor Evaluation Results

| Metric | Value |
|--------|-------|
| **Quality Gate** | \`${quality_gate}\` |
| **Pass Rate** | ${pass_rate}% (${passed}/${total_tasks}) |
| **Quality Score** | ${avg_score}% |
| **Regressions** | ${regression_detected} |

### Category Performance
$(jq -r '.results | group_by(.metadata.category) | .[] | "| \(.[0].metadata.category) | \(map(select(.status == "passed")) | length)/\(length) | \((map(.score) | add / length) * 100 | floor)% |"' "$RESULTS_FILE")

EOF
)
    
    # Add regression details if present
    if [ "$regression_detected" = "true" ]; then
        comment_body="$comment_body"$'\n### ⚠️ Regressions Detected\n'
        comment_body="$comment_body"$(jq -r '.regressions[]? // empty | "- **\(.tenant)/\(.category)**: \(.scoreDrop * 100 | floor)% drop"' "$RESULTS_FILE")
    fi
    
    comment_body="$comment_body"$'\n\n---\n'
    comment_body="$comment_body*Evaluation ID: `'"$EVALUATION_ID"'` | Commit: `'"${COMMIT_SHA:0:8}"'`*'
    
    # Post comment
    local github_api_url="https://api.github.com/repos/${GITHUB_REPOSITORY}/issues/${PR_NUMBER}/comments"
    
    if curl -s -f \
        -X POST \
        -H "Authorization: token $GITHUB_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"body\": $(echo "$comment_body" | jq -Rs .)}" \
        "$github_api_url" >/dev/null; then
        pass "PR comment posted successfully"
    else
        warn "Failed to post PR comment"
    fi
}

# Generate report
generate_report() {
    say "📄 Generating Evaluation Report"
    
    local report_file="conductor-eval-report-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$report_file" << EOF
# Conductor Evaluation Report

**Evaluation ID:** $EVALUATION_ID  
**Timestamp:** $(date -u "+%Y-%m-%d %H:%M:%S UTC")  
**Branch:** $BRANCH_NAME  
**Commit:** $COMMIT_SHA  
**Environment:** ${NODE_ENV:-development}  

## Summary

$(jq -r '
  "- **Total Tasks:** \(.summary.totalTasks)",
  "- **Passed:** \(.summary.passed)",
  "- **Failed:** \(.summary.failed)",
  "- **Pass Rate:** \((.summary.passed / .summary.totalTasks * 100) | floor)%",
  "- **Quality Score:** \((.summary.avgScore * 100) | floor)%",
  "- **Quality Gate:** \(.summary.qualityGate)",
  "- **Duration:** \(.duration)ms",
  "- **Regressions:** \(.summary.regressionDetected)"
' "$RESULTS_FILE")

## Category Performance

| Category | Pass Rate | Avg Score | Tasks |
|----------|-----------|-----------|-------|
$(jq -r '.results | group_by(.metadata.category) | .[] | "| \(.[0].metadata.category) | \(map(select(.status == "passed")) | length)/\(length) | \((map(.score) | add / length) * 100 | floor)% | \(length) |"' "$RESULTS_FILE")

## Expert Performance

| Expert | Pass Rate | Avg Score | Tasks |
|--------|-----------|-----------|-------|
$(jq -r '.results | group_by(.expert) | .[] | "| \(.[0].expert) | \(map(select(.status == "passed")) | length)/\(length) | \((map(.score) | add / length) * 100 | floor)% | \(length) |"' "$RESULTS_FILE")

$(if [ "$(jq -r '.summary.regressionDetected' "$RESULTS_FILE")" = "true" ]; then
    echo "## Regressions Detected"
    echo ""
    jq -r '.regressions[]? // empty | "### \(.tenant)/\(.category)\n\n- **Score Drop:** \(.scoreDrop * 100 | floor)%\n- **From:** \(.baselineScore * 100 | floor)% → **To:** \(.currentScore * 100 | floor)%\n- **Affected Tasks:** \(.affectedTasks | join(", "))\n"' "$RESULTS_FILE"
fi)

$(if [ "$(jq -r '[.results[] | select(.status == "failed")] | length' "$RESULTS_FILE")" -gt 0 ]; then
    echo "## Failed Tasks"
    echo ""
    jq -r '.results[] | select(.status == "failed") | "### \(.taskId)\n\n- **Category:** \(.metadata.category)\n- **Expert:** \(.expert)\n- **Score:** \(.score * 100 | floor)%\n- **Error:** \(.scoringDetails.feedback // .error // "No details")\n"' "$RESULTS_FILE"
fi)

## Configuration

- **Parallel Execution:** $PARALLEL
- **Max Concurrency:** $MAX_CONCURRENCY  
- **Timeout:** ${TIMEOUT}s
- **Update Baselines:** $UPDATE_BASELINES
- **Fail on Regression:** $FAIL_ON_REGRESSION

---
*Report generated by Conductor Evaluation Harness*
EOF

    pass "Report generated: $report_file"
}

# Cleanup
cleanup() {
    info "Cleaning up temporary files"
    if [ -n "${RESULTS_FILE:-}" ] && [ -f "$RESULTS_FILE" ]; then
        # Keep results file for CI artifacts
        if [ "$CI_MODE" = "false" ]; then
            rm -f "$RESULTS_FILE"
        fi
    fi
}

# Main execution
main() {
    say "🚀 Conductor Evaluation Harness"
    
    info "Configuration:"
    echo "  Conductor URL: $CONDUCTOR_URL"
    echo "  Timeout: ${TIMEOUT}s"
    echo "  Parallel: $PARALLEL"
    echo "  Max Concurrency: $MAX_CONCURRENCY"
    echo "  CI Mode: $CI_MODE"
    echo "  Branch: $BRANCH_NAME"
    echo "  Commit: ${COMMIT_SHA:0:8}"
    
    # Run evaluation
    run_evaluation
    
    # Analyze results
    analyze_results
    
    # Post metrics
    post_to_prometheus
    
    # Check quality gates
    local gates_passed=true
    if ! check_quality_gates; then
        gates_passed=false
    fi
    
    # Post PR comment
    post_pr_comment
    
    # Generate report
    generate_report
    
    # Final status
    if [ "$gates_passed" = "true" ]; then
        pass "🎉 Evaluation completed successfully!"
        pass "Quality gates: PASSED"
        exit 0
    else
        fail "💥 Evaluation failed quality gates"
        fail "Quality gates: FAILED"
        exit 1
    fi
}

# Trap for cleanup
trap cleanup EXIT

# Handle arguments
case "${1:-}" in
    --help)
        cat << EOF
Usage: $0 [options]

Conductor Evaluation Harness - Quality gates with golden tasks

Options:
  --task-filter=CATEGORIES     Filter tasks by category (comma-separated)
  --tenant-filter=TENANTS      Filter tasks by tenant (comma-separated) 
  --timeout=SECONDS           Evaluation timeout [default: 300]
  --no-parallel              Disable parallel execution
  --max-concurrency=N         Max concurrent tasks [default: 5]
  --update-baselines          Update quality baselines with results
  --no-fail-on-regression     Don't fail on regressions
  --help                      Show this help

Environment Variables:
  CONDUCTOR_URL               Conductor API URL [default: http://localhost:3000]
  TIMEOUT                     Evaluation timeout in seconds [default: 300]
  PARALLEL                    Enable parallel execution [default: true]
  MAX_CONCURRENCY             Max concurrent tasks [default: 5] 
  UPDATE_BASELINES            Update baselines [default: false]
  FAIL_ON_REGRESSION          Fail on regressions [default: true]
  QUALITY_THRESHOLD           Minimum quality score [default: 0.8]
  PASS_RATE_THRESHOLD         Minimum pass rate [default: 0.85]
  
  # CI/CD Integration
  CI                          CI mode flag [default: false]
  GITHUB_TOKEN                GitHub token for PR comments
  PR_NUMBER                   Pull request number
  PUSHGATEWAY_URL             Prometheus Pushgateway URL

Examples:
  # Run full evaluation suite
  ./scripts/conductor-eval.sh
  
  # Run only graph and RAG tasks
  ./scripts/conductor-eval.sh --task-filter=graph_ops,rag_retrieval
  
  # Update baselines (after confirming quality)
  ./scripts/conductor-eval.sh --update-baselines
  
  # CI mode with quality gates
  CI=true PR_NUMBER=123 ./scripts/conductor-eval.sh

EOF
        exit 0
        ;;
    --task-filter=*)
        TASK_FILTER="${1#*=}"
        shift
        ;;
    --tenant-filter=*)
        TENANT_FILTER="${1#*=}"
        shift
        ;;
    --timeout=*)
        TIMEOUT="${1#*=}"
        shift
        ;;
    --no-parallel)
        PARALLEL="false"
        shift
        ;;
    --max-concurrency=*)
        MAX_CONCURRENCY="${1#*=}"
        shift
        ;;
    --update-baselines)
        UPDATE_BASELINES="true"
        shift
        ;;
    --no-fail-on-regression)
        FAIL_ON_REGRESSION="false"
        shift
        ;;
    *)
        # No arguments or unknown argument, proceed with main
        ;;
esac

# Execute main
main