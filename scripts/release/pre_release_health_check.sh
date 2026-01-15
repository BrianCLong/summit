#!/usr/bin/env bash
# pre_release_health_check.sh
#
# Aggregates all CI audit results into a unified release readiness status.
# Checks dependency audit, type safety, API determinism, and other gates.
#
# Usage:
#   ./scripts/release/pre_release_health_check.sh [OPTIONS]
#
# Options:
#   --strict               Fail on any warning
#   --skip-stale           Skip stale checks (> 24h old)
#   --report               Generate detailed markdown report
#   --json                 Output JSON format
#   --dry-run              Show what would happen without executing
#   --help                 Show this help message
#
# See docs/ci/PRE_RELEASE_HEALTH.md for full documentation.

set -euo pipefail

# Default values
STRICT_MODE=false
SKIP_STALE=false
GENERATE_REPORT=true
OUTPUT_JSON=false
DRY_RUN=false
STATE_DIR="docs/releases/_state"
REPORT_DIR="artifacts/health-check"
STALE_THRESHOLD_HOURS=24

# Color codes (if terminal supports it)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --strict)
      STRICT_MODE=true
      shift
      ;;
    --skip-stale)
      SKIP_STALE=true
      shift
      ;;
    --report)
      GENERATE_REPORT=true
      shift
      ;;
    --json)
      OUTPUT_JSON=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --help)
      head -20 "$0" | tail -16
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

# Check if a timestamp is stale (older than threshold)
is_stale() {
  local timestamp="$1"
  if [[ -z "$timestamp" || "$timestamp" == "null" ]]; then
    return 0  # No timestamp = stale
  fi

  local now
  now=$(date +%s)
  local check_time
  check_time=$(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$timestamp" +%s 2>/dev/null || date -d "$timestamp" +%s 2>/dev/null || echo 0)

  local age_hours=$(( (now - check_time) / 3600 ))
  [[ $age_hours -gt $STALE_THRESHOLD_HOURS ]]
}

# Read state file and extract result
read_check_state() {
  local state_file="$1"
  local failed_field="$2"
  local time_field="${3:-last_audit}"

  if [[ ! -f "$state_file" ]]; then
    echo "MISSING"
    return
  fi

  local failed
  failed=$(jq -r ".last_result.$failed_field // \"unknown\"" "$state_file" 2>/dev/null || echo "unknown")

  local timestamp
  timestamp=$(jq -r ".$time_field // null" "$state_file" 2>/dev/null || echo "null")

  if [[ "$SKIP_STALE" == "true" ]] && is_stale "$timestamp"; then
    echo "STALE"
    return
  fi

  if [[ "$failed" == "true" ]]; then
    echo "FAIL"
  elif [[ "$failed" == "false" ]]; then
    echo "PASS"
  else
    echo "UNKNOWN"
  fi
}

# Main health check function
main() {
  echo "Running Pre-Release Health Check..." >&2
  echo "" >&2

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[DRY RUN] Would check the following:" >&2
    echo "  - Dependency Security Audit" >&2
    echo "  - Type Safety Audit" >&2
    echo "  - API Determinism Check" >&2
    echo "  - Test Quarantine Status" >&2
    echo "  - Release Blockers" >&2
    return 0
  fi

  # Create report directory
  mkdir -p "$REPORT_DIR"

  # Initialize results
  declare -A check_results
  declare -A check_details
  local total_checks=0
  local passed_checks=0
  local failed_checks=0
  local warning_checks=0

  # Check 1: Dependency Security Audit
  echo "Checking Dependency Security Audit..." >&2
  total_checks=$((total_checks + 1))
  check_results["dependency_audit"]=$(read_check_state "$STATE_DIR/audit_state.json" "failed" "last_audit")
  case "${check_results["dependency_audit"]}" in
    PASS) passed_checks=$((passed_checks + 1)); check_details["dependency_audit"]="No critical/high vulnerabilities" ;;
    FAIL) failed_checks=$((failed_checks + 1)); check_details["dependency_audit"]="Critical/high vulnerabilities detected" ;;
    STALE) warning_checks=$((warning_checks + 1)); check_details["dependency_audit"]="Check is stale (>24h)" ;;
    *) warning_checks=$((warning_checks + 1)); check_details["dependency_audit"]="No audit data available" ;;
  esac

  # Check 2: Type Safety Audit
  echo "Checking Type Safety Audit..." >&2
  total_checks=$((total_checks + 1))
  check_results["type_safety"]=$(read_check_state "$STATE_DIR/type_safety_state.json" "failed" "last_audit")
  case "${check_results["type_safety"]}" in
    PASS) passed_checks=$((passed_checks + 1)); check_details["type_safety"]="Any types within threshold" ;;
    FAIL) failed_checks=$((failed_checks + 1)); check_details["type_safety"]="Too many any types detected" ;;
    STALE) warning_checks=$((warning_checks + 1)); check_details["type_safety"]="Check is stale (>24h)" ;;
    *) warning_checks=$((warning_checks + 1)); check_details["type_safety"]="No audit data available" ;;
  esac

  # Check 3: API Determinism
  echo "Checking API Determinism..." >&2
  total_checks=$((total_checks + 1))
  local det_status
  det_status=$(jq -r '.last_result.status // "unknown"' "$STATE_DIR/determinism_state.json" 2>/dev/null || echo "unknown")
  case "$det_status" in
    passed) check_results["api_determinism"]="PASS"; passed_checks=$((passed_checks + 1)); check_details["api_determinism"]="All endpoints deterministic" ;;
    failed) check_results["api_determinism"]="FAIL"; failed_checks=$((failed_checks + 1)); check_details["api_determinism"]="Non-deterministic responses detected" ;;
    skipped) check_results["api_determinism"]="WARN"; warning_checks=$((warning_checks + 1)); check_details["api_determinism"]="Check skipped (server unavailable)" ;;
    *) check_results["api_determinism"]="UNKNOWN"; warning_checks=$((warning_checks + 1)); check_details["api_determinism"]="No check data available" ;;
  esac

  # Check 4: Test Quarantine
  echo "Checking Test Quarantine Status..." >&2
  total_checks=$((total_checks + 1))
  local quarantine_count=0
  if [[ -f "$STATE_DIR/quarantine_state.json" ]]; then
    quarantine_count=$(jq -r '.quarantined_tests | length // 0' "$STATE_DIR/quarantine_state.json" 2>/dev/null || echo 0)
  fi
  if [[ $quarantine_count -eq 0 ]]; then
    check_results["test_quarantine"]="PASS"
    passed_checks=$((passed_checks + 1))
    check_details["test_quarantine"]="No quarantined tests"
  elif [[ $quarantine_count -lt 5 ]]; then
    check_results["test_quarantine"]="WARN"
    warning_checks=$((warning_checks + 1))
    check_details["test_quarantine"]="$quarantine_count tests quarantined"
  else
    check_results["test_quarantine"]="FAIL"
    failed_checks=$((failed_checks + 1))
    check_details["test_quarantine"]="$quarantine_count tests quarantined (too many)"
  fi

  # Check 5: Release Blockers (via GitHub if GITHUB_TOKEN available)
  echo "Checking Release Blockers..." >&2
  total_checks=$((total_checks + 1))
  local blocker_count=0
  if [[ -n "${GITHUB_TOKEN:-}" ]]; then
    blocker_count=$(gh issue list --label "release-blocker" --state open --json number 2>/dev/null | jq 'length' || echo 0)
  fi
  if [[ $blocker_count -eq 0 ]]; then
    check_results["release_blockers"]="PASS"
    passed_checks=$((passed_checks + 1))
    check_details["release_blockers"]="No open release blockers"
  else
    check_results["release_blockers"]="FAIL"
    failed_checks=$((failed_checks + 1))
    check_details["release_blockers"]="$blocker_count open release blockers"
  fi

  # Calculate overall status
  local overall_status="PASS"
  local health_score=$((passed_checks * 100 / total_checks))

  if [[ $failed_checks -gt 0 ]]; then
    overall_status="FAIL"
  elif [[ "$STRICT_MODE" == "true" && $warning_checks -gt 0 ]]; then
    overall_status="FAIL"
  elif [[ $warning_checks -gt 0 ]]; then
    overall_status="WARN"
  fi

  # Output summary
  echo "" >&2
  echo "========================================" >&2
  echo "PRE-RELEASE HEALTH CHECK SUMMARY" >&2
  echo "========================================" >&2
  echo "" >&2

  for check in dependency_audit type_safety api_determinism test_quarantine release_blockers; do
    local result="${check_results[$check]:-UNKNOWN}"
    local detail="${check_details[$check]:-No details}"
    local icon="?"

    case "$result" in
      PASS) icon="✓" ;;
      FAIL) icon="✗" ;;
      WARN|STALE) icon="!" ;;
      *) icon="?" ;;
    esac

    printf "  [%s] %-20s %s\n" "$icon" "$check" "$detail" >&2
  done

  echo "" >&2
  echo "----------------------------------------" >&2
  echo "  Total:    $total_checks checks" >&2
  echo "  Passed:   $passed_checks" >&2
  echo "  Failed:   $failed_checks" >&2
  echo "  Warnings: $warning_checks" >&2
  echo "  Score:    $health_score%" >&2
  echo "" >&2
  echo "  Overall:  $overall_status" >&2
  echo "========================================" >&2

  # Generate report
  if [[ "$GENERATE_REPORT" == "true" ]]; then
    generate_report "$overall_status" "$health_score" "$total_checks" "$passed_checks" "$failed_checks" "$warning_checks"
  fi

  # Output JSON if requested
  if [[ "$OUTPUT_JSON" == "true" ]]; then
    jq -n \
      --arg status "$overall_status" \
      --argjson score "$health_score" \
      --argjson total "$total_checks" \
      --argjson passed "$passed_checks" \
      --argjson failed "$failed_checks" \
      --argjson warnings "$warning_checks" \
      --arg dep "${check_results["dependency_audit"]}" \
      --arg type "${check_results["type_safety"]}" \
      --arg det "${check_results["api_determinism"]}" \
      --arg quar "${check_results["test_quarantine"]}" \
      --arg block "${check_results["release_blockers"]}" \
      '{
        status: $status,
        health_score: $score,
        summary: {
          total: $total,
          passed: $passed,
          failed: $failed,
          warnings: $warnings
        },
        checks: {
          dependency_audit: $dep,
          type_safety: $type,
          api_determinism: $det,
          test_quarantine: $quar,
          release_blockers: $block
        }
      }'
  fi

  # Update state
  update_state "$overall_status" "$health_score" "$passed_checks" "$failed_checks" "$warning_checks"

  # Return appropriate exit code
  if [[ "$overall_status" == "FAIL" ]]; then
    return 1
  else
    return 0
  fi
}

# Generate markdown report
generate_report() {
  local status="$1"
  local score="$2"
  local total="$3"
  local passed="$4"
  local failed="$5"
  local warnings="$6"

  local report_file="$REPORT_DIR/health-check-report.md"
  local now_date
  now_date=$(date -u +"%Y-%m-%d %H:%M:%S UTC")

  local status_emoji="✅"
  [[ "$status" == "FAIL" ]] && status_emoji="❌"
  [[ "$status" == "WARN" ]] && status_emoji="⚠️"

  {
    echo "# Pre-Release Health Check Report"
    echo ""
    echo "**Generated:** $now_date"
    echo "**Status:** $status_emoji $status"
    echo "**Health Score:** $score%"
    echo ""
    echo "## Summary"
    echo ""
    echo "| Metric | Value |"
    echo "|--------|-------|"
    echo "| Total Checks | $total |"
    echo "| Passed | $passed |"
    echo "| Failed | $failed |"
    echo "| Warnings | $warnings |"
    echo ""
    echo "## Check Results"
    echo ""
    echo "| Check | Status | Details |"
    echo "|-------|--------|---------|"
    echo "| Dependency Audit | ${check_results["dependency_audit"]} | ${check_details["dependency_audit"]} |"
    echo "| Type Safety | ${check_results["type_safety"]} | ${check_details["type_safety"]} |"
    echo "| API Determinism | ${check_results["api_determinism"]} | ${check_details["api_determinism"]} |"
    echo "| Test Quarantine | ${check_results["test_quarantine"]} | ${check_details["test_quarantine"]} |"
    echo "| Release Blockers | ${check_results["release_blockers"]} | ${check_details["release_blockers"]} |"
    echo ""

    if [[ "$status" == "FAIL" ]]; then
      echo "## Action Required"
      echo ""
      echo "The following checks must be addressed before release:"
      echo ""
      for check in dependency_audit type_safety api_determinism test_quarantine release_blockers; do
        if [[ "${check_results[$check]}" == "FAIL" ]]; then
          echo "- **$check**: ${check_details[$check]}"
        fi
      done
      echo ""
    fi

    echo "## Next Steps"
    echo ""
    if [[ "$status" == "PASS" ]]; then
      echo "All checks passed. The release is ready to proceed."
    elif [[ "$status" == "WARN" ]]; then
      echo "Some checks have warnings. Review and address if possible, but release can proceed."
    else
      echo "1. Review failed checks above"
      echo "2. Run individual audit scripts to get detailed information"
      echo "3. Address issues and re-run health check"
      echo "4. Once all checks pass, proceed with release"
    fi
    echo ""
    echo "---"
    echo ""
    echo "_Report generated by pre_release_health_check.sh_"

  } > "$report_file"

  echo "Report generated: $report_file" >&2
}

# Update state file
update_state() {
  local status="$1"
  local score="$2"
  local passed="$3"
  local failed="$4"
  local warnings="$5"

  local state_file="$STATE_DIR/health_check_state.json"
  local now_iso
  now_iso=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  mkdir -p "$(dirname "$state_file")"

  local state
  state=$(cat "$state_file" 2>/dev/null || echo '{"version":"1.0.0","check_history":[]}')

  state=$(echo "$state" | jq \
    --arg time "$now_iso" \
    --arg status "$status" \
    --argjson score "$score" \
    --argjson passed "$passed" \
    --argjson failed "$failed" \
    --argjson warnings "$warnings" \
    '.last_check = $time |
     .last_result = {
       status: $status,
       health_score: $score,
       passed: $passed,
       failed: $failed,
       warnings: $warnings
     } |
     .check_history = ([{
       timestamp: $time,
       status: $status,
       health_score: $score,
       passed: $passed,
       failed: $failed,
       warnings: $warnings
     }] + .check_history[:49])')

  echo "$state" > "$state_file"
}

main "$@"
