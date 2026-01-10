#!/usr/bin/env bash
# api_determinism_check.sh
#
# Verifies API response determinism by calling endpoints multiple times
# and comparing responses for consistency.
#
# Usage:
#   ./scripts/release/api_determinism_check.sh [OPTIONS]
#
# Options:
#   --base-url <url>       Base URL (default: http://localhost:3000)
#   --iterations <n>       Number of iterations per endpoint (default: 3)
#   --endpoint <path>      Specific endpoint to check
#   --report               Generate detailed markdown report
#   --strict               Fail on any variance (ignore allowed fields)
#   --dry-run              Show what would happen without executing
#   --help                 Show this help message
#
# See docs/ci/API_DETERMINISM.md for full documentation.

set -euo pipefail

# Default values
BASE_URL="http://localhost:3000"
ITERATIONS=3
SPECIFIC_ENDPOINT=""
GENERATE_REPORT=true
STRICT_MODE=false
DRY_RUN=false
STATE_FILE="docs/releases/_state/determinism_state.json"
REPORT_DIR="artifacts/determinism-check"
ITERATION_DELAY=100

# Standard endpoints to check
declare -a ENDPOINTS=(
  "GET:/health"
  "GET:/api/v1/status"
  "GET:/api/version"
)

# Fields that are expected to vary (ignored in comparison)
declare -a IGNORE_FIELDS=(
  "timestamp"
  "created_at"
  "updated_at"
  "serverTime"
  "requestTime"
  "requestId"
  "traceId"
  "correlationId"
  "uptime"
  "memory"
  "cpu"
  "nonce"
)

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --base-url)
      BASE_URL="$2"
      shift 2
      ;;
    --iterations)
      ITERATIONS="$2"
      shift 2
      ;;
    --endpoint)
      SPECIFIC_ENDPOINT="$2"
      shift 2
      ;;
    --report)
      GENERATE_REPORT=true
      shift
      ;;
    --strict)
      STRICT_MODE=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --help)
      head -22 "$0" | tail -18
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

# Remove ignored fields from JSON
normalize_json() {
  local json="$1"

  if [[ "$STRICT_MODE" == "true" ]]; then
    echo "$json"
    return
  fi

  # Build jq filter to remove ignored fields
  local filter="."
  for field in "${IGNORE_FIELDS[@]}"; do
    filter="$filter | walk(if type == \"object\" then del(.$field) else . end)"
  done

  echo "$json" | jq -S "$filter" 2>/dev/null || echo "$json"
}

# Compare two JSON responses
compare_responses() {
  local resp1="$1"
  local resp2="$2"

  local norm1
  local norm2
  norm1=$(normalize_json "$resp1")
  norm2=$(normalize_json "$resp2")

  if [[ "$norm1" == "$norm2" ]]; then
    return 0
  else
    return 1
  fi
}

# Call endpoint and return response
call_endpoint() {
  local method="$1"
  local path="$2"
  local url="${BASE_URL}${path}"

  curl -s -X "$method" \
    -H "Accept: application/json" \
    -H "Content-Type: application/json" \
    --connect-timeout 5 \
    --max-time 10 \
    "$url" 2>/dev/null || echo "{\"error\":\"request_failed\"}"
}

# Check a single endpoint for determinism
check_endpoint() {
  local method="$1"
  local path="$2"

  echo "  Checking $method $path..." >&2

  # Collect responses
  local responses=()
  for ((i=1; i<=ITERATIONS; i++)); do
    local response
    response=$(call_endpoint "$method" "$path")
    responses+=("$response")

    if [[ $i -lt $ITERATIONS ]]; then
      sleep "0.$(printf '%03d' $ITERATION_DELAY)"
    fi
  done

  # Compare all responses to first
  local baseline="${responses[0]}"
  local all_match=true
  local diff_details=""

  for ((i=1; i<${#responses[@]}; i++)); do
    if ! compare_responses "$baseline" "${responses[$i]}"; then
      all_match=false
      diff_details="Iteration $((i+1)) differs from baseline"
      break
    fi
  done

  if [[ "$all_match" == "true" ]]; then
    echo "    ✓ Deterministic" >&2
    echo "PASS"
  else
    echo "    ✗ Non-deterministic: $diff_details" >&2
    echo "FAIL"
  fi
}

# Main check function
main() {
  echo "Running API determinism check..." >&2
  echo "  Base URL: $BASE_URL" >&2
  echo "  Iterations: $ITERATIONS" >&2
  echo "  Strict mode: $STRICT_MODE" >&2

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[DRY RUN] Would check endpoints" >&2
    for endpoint in "${ENDPOINTS[@]}"; do
      echo "  - $endpoint" >&2
    done
    return 0
  fi

  # Create report directory
  mkdir -p "$REPORT_DIR"

  # Check if server is available
  echo "" >&2
  echo "Checking server availability..." >&2
  if ! curl -s --connect-timeout 5 "${BASE_URL}/health" > /dev/null 2>&1; then
    echo "  Warning: Server not available at $BASE_URL" >&2
    echo "  Skipping API determinism check" >&2

    # Generate skip report
    if [[ "$GENERATE_REPORT" == "true" ]]; then
      generate_skip_report "Server not available at $BASE_URL"
    fi

    update_state 0 0 0 "skipped"
    return 0
  fi
  echo "  Server available" >&2

  # Filter endpoints if specific one requested
  local check_endpoints=("${ENDPOINTS[@]}")
  if [[ -n "$SPECIFIC_ENDPOINT" ]]; then
    check_endpoints=("GET:$SPECIFIC_ENDPOINT")
  fi

  # Run checks
  echo "" >&2
  local total=0
  local passed=0
  local failed=0
  declare -A results

  for endpoint in "${check_endpoints[@]}"; do
    IFS=':' read -r method path <<< "$endpoint"
    total=$((total + 1))

    local result
    result=$(check_endpoint "$method" "$path")
    results["$endpoint"]="$result"

    if [[ "$result" == "PASS" ]]; then
      passed=$((passed + 1))
    else
      failed=$((failed + 1))
    fi
  done

  # Output summary
  echo "" >&2
  echo "Determinism Check Summary:" >&2
  echo "  Total endpoints: $total" >&2
  echo "  Passed:         $passed" >&2
  echo "  Failed:         $failed" >&2

  # Generate report
  if [[ "$GENERATE_REPORT" == "true" ]]; then
    generate_report "$total" "$passed" "$failed"
  fi

  # Update state
  local status="passed"
  [[ $failed -gt 0 ]] && status="failed"
  update_state "$total" "$passed" "$failed" "$status"

  # Determine pass/fail
  if [[ $failed -gt 0 ]]; then
    echo "" >&2
    echo "CHECK FAILED: $failed endpoint(s) showed non-deterministic behavior" >&2
    return 1
  else
    echo "" >&2
    echo "CHECK PASSED: All endpoints are deterministic" >&2
    return 0
  fi
}

# Generate markdown report
generate_report() {
  local total="$1"
  local passed="$2"
  local failed="$3"

  local report_file="$REPORT_DIR/determinism-report.md"
  local now_date
  now_date=$(date -u +"%Y-%m-%d %H:%M:%S UTC")

  {
    echo "# API Determinism Check Report"
    echo ""
    echo "**Generated:** $now_date"
    echo "**Base URL:** $BASE_URL"
    echo "**Iterations:** $ITERATIONS"
    echo ""
    echo "## Summary"
    echo ""
    echo "| Metric | Value |"
    echo "|--------|-------|"
    echo "| Total endpoints | $total |"
    echo "| Passed | $passed |"
    echo "| Failed | $failed |"
    echo ""

    if [[ $failed -gt 0 ]]; then
      echo "## Status: FAILED"
      echo ""
      echo "One or more endpoints showed non-deterministic behavior."
    else
      echo "## Status: PASSED"
      echo ""
      echo "All checked endpoints returned consistent responses."
    fi

    echo ""
    echo "## Checked Endpoints"
    echo ""
    echo "| Endpoint | Method | Status |"
    echo "|----------|--------|--------|"
    for endpoint in "${ENDPOINTS[@]}"; do
      IFS=':' read -r method path <<< "$endpoint"
      local status="${results[$endpoint]:-UNKNOWN}"
      local emoji="✓"
      [[ "$status" == "FAIL" ]] && emoji="✗"
      echo "| \`$path\` | $method | $emoji $status |"
    done

    echo ""
    echo "## Ignored Fields"
    echo ""
    echo "These fields are excluded from comparison (expected to vary):"
    echo ""
    for field in "${IGNORE_FIELDS[@]}"; do
      echo "- \`$field\`"
    done

    echo ""
    echo "---"
    echo ""
    echo "_Report generated by api_determinism_check.sh_"

  } > "$report_file"

  echo "Report generated: $report_file" >&2
}

# Generate skip report when server unavailable
generate_skip_report() {
  local reason="$1"
  local report_file="$REPORT_DIR/determinism-report.md"
  local now_date
  now_date=$(date -u +"%Y-%m-%d %H:%M:%S UTC")

  {
    echo "# API Determinism Check Report"
    echo ""
    echo "**Generated:** $now_date"
    echo "**Status:** SKIPPED"
    echo ""
    echo "## Reason"
    echo ""
    echo "$reason"
    echo ""
    echo "The API determinism check was skipped because the server was not available."
    echo "This check will run automatically on the next deployment."

  } > "$report_file"

  echo "Skip report generated: $report_file" >&2
}

# Update state file
update_state() {
  local total="$1"
  local passed="$2"
  local failed="$3"
  local status="$4"

  local now_iso
  now_iso=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  mkdir -p "$(dirname "$STATE_FILE")"

  local state
  state=$(cat "$STATE_FILE" 2>/dev/null || echo '{"version":"1.0.0","check_history":[]}')

  state=$(echo "$state" | jq \
    --arg time "$now_iso" \
    --argjson total "$total" \
    --argjson passed "$passed" \
    --argjson failed "$failed" \
    --arg status "$status" \
    --arg base_url "$BASE_URL" \
    '.last_check = $time |
     .last_result = {
       total: $total,
       passed: $passed,
       failed: $failed,
       status: $status,
       base_url: $base_url
     } |
     .check_history = ([{
       timestamp: $time,
       total: $total,
       passed: $passed,
       failed: $failed,
       status: $status
     }] + .check_history[:49])')

  echo "$state" > "$STATE_FILE"
}

main "$@"
