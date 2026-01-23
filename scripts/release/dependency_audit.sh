#!/usr/bin/env bash
# dependency_audit.sh
#
# Runs dependency security audit using pnpm audit.
# Generates reports and enforces vulnerability thresholds.
#
# Usage:
#   ./scripts/release/dependency_audit.sh [OPTIONS]
#
# Options:
#   --threshold <level>    Fail threshold: critical, high, moderate, low (default: high)
#   --production           Only audit production dependencies
#   --json                 Output JSON format
#   --report               Generate detailed markdown report
#   --fix                  Attempt to fix vulnerabilities
#   --dry-run              Show what would happen without executing
#   --help                 Show this help message
#
# See docs/ci/DEPENDENCY_AUDIT.md for full documentation.

set -euo pipefail

# Default values
THRESHOLD="high"
PRODUCTION_ONLY=false
OUTPUT_JSON=false
GENERATE_REPORT=true
FIX_MODE=false
DRY_RUN=false
STATE_FILE="docs/releases/_state/audit_state.json"
REPORT_DIR="artifacts/security-audit"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --threshold)
      THRESHOLD="$2"
      shift 2
      ;;
    --production)
      PRODUCTION_ONLY=true
      shift
      ;;
    --json)
      OUTPUT_JSON=true
      shift
      ;;
    --report)
      GENERATE_REPORT=true
      shift
      ;;
    --fix)
      FIX_MODE=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --help)
      head -20 "$0" | tail -17
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

# Validate threshold
case "$THRESHOLD" in
  critical|high|moderate|low) ;;
  *)
    echo "Invalid threshold: $THRESHOLD" >&2
    echo "Valid options: critical, high, moderate, low" >&2
    exit 1
    ;;
esac

# Get severity level number for comparison
get_severity_level() {
  case "$1" in
    critical) echo 4 ;;
    high) echo 3 ;;
    moderate) echo 2 ;;
    low) echo 1 ;;
    *) echo 0 ;;
  esac
}

# Main audit function
main() {
  echo "Running dependency security audit..." >&2
  echo "  Threshold: $THRESHOLD" >&2
  echo "  Production only: $PRODUCTION_ONLY" >&2

  # Build pnpm audit command
  local audit_cmd="pnpm audit --json"
  if [[ "$PRODUCTION_ONLY" == "true" ]]; then
    audit_cmd="$audit_cmd --prod"
  fi

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[DRY RUN] Would execute: $audit_cmd" >&2
    return 0
  fi

  # Create report directory
  mkdir -p "$REPORT_DIR"

  # Run audit and capture output
  local audit_output
  local audit_exit_code=0
  audit_output=$($audit_cmd 2>/dev/null) || audit_exit_code=$?

  # Parse results
  local critical_count=0
  local high_count=0
  local moderate_count=0
  local low_count=0
  local info_count=0

  if echo "$audit_output" | jq -e '.metadata.vulnerabilities' > /dev/null 2>&1; then
    critical_count=$(echo "$audit_output" | jq -r '.metadata.vulnerabilities.critical // 0')
    high_count=$(echo "$audit_output" | jq -r '.metadata.vulnerabilities.high // 0')
    moderate_count=$(echo "$audit_output" | jq -r '.metadata.vulnerabilities.moderate // 0')
    low_count=$(echo "$audit_output" | jq -r '.metadata.vulnerabilities.low // 0')
    info_count=$(echo "$audit_output" | jq -r '.metadata.vulnerabilities.info // 0')
  fi

  local total_count=$((critical_count + high_count + moderate_count + low_count))

  echo "" >&2
  echo "Vulnerability Summary:" >&2
  echo "  Critical: $critical_count" >&2
  echo "  High:     $high_count" >&2
  echo "  Moderate: $moderate_count" >&2
  echo "  Low:      $low_count" >&2
  echo "  Total:    $total_count" >&2

  # Determine if we should fail
  local should_fail=false
  local threshold_level=$(get_severity_level "$THRESHOLD")

  if [[ $critical_count -gt 0 && $threshold_level -ge 4 ]]; then
    should_fail=true
  elif [[ $high_count -gt 0 && $threshold_level -ge 3 ]]; then
    should_fail=true
  elif [[ $moderate_count -gt 0 && $threshold_level -ge 2 ]]; then
    should_fail=true
  elif [[ $low_count -gt 0 && $threshold_level -ge 1 ]]; then
    should_fail=true
  fi

  # Generate JSON report
  if [[ "$OUTPUT_JSON" == "true" ]]; then
    echo "$audit_output"
  fi

  # Generate markdown report
  if [[ "$GENERATE_REPORT" == "true" ]]; then
    generate_markdown_report "$audit_output" "$critical_count" "$high_count" "$moderate_count" "$low_count"
  fi

  # Update state
  update_state "$critical_count" "$high_count" "$moderate_count" "$low_count" "$should_fail"

  # Output result
  if [[ "$should_fail" == "true" ]]; then
    echo "" >&2
    echo "AUDIT FAILED: Vulnerabilities exceed threshold ($THRESHOLD)" >&2
    echo "" >&2

    # Show remediation hints
    if [[ $critical_count -gt 0 || $high_count -gt 0 ]]; then
      echo "Remediation:" >&2
      echo "  1. Run 'pnpm audit --fix' to attempt automatic fixes" >&2
      echo "  2. Run 'pnpm update' to update packages" >&2
      echo "  3. Check individual packages for security patches" >&2
      echo "  4. See $REPORT_DIR/audit-report.md for details" >&2
    fi

    return 1
  else
    echo "" >&2
    echo "AUDIT PASSED: No vulnerabilities above threshold ($THRESHOLD)" >&2
    return 0
  fi
}

# Generate markdown report
generate_markdown_report() {
  local audit_output="$1"
  local critical="$2"
  local high="$3"
  local moderate="$4"
  local low="$5"

  local report_file="$REPORT_DIR/audit-report.md"
  local now_date
  now_date=$(date -u +"%Y-%m-%d %H:%M:%S UTC")

  {
    echo "# Dependency Security Audit Report"
    echo ""
    echo "**Generated:** $now_date"
    echo "**Threshold:** $THRESHOLD"
    echo ""
    echo "## Summary"
    echo ""
    echo "| Severity | Count | Status |"
    echo "|----------|-------|--------|"

    local critical_status="N/A"
    local high_status="N/A"
    local moderate_status="N/A"
    local low_status="N/A"

    if [[ $critical -gt 0 ]]; then critical_status="FAIL"; else critical_status="PASS"; fi
    if [[ $high -gt 0 ]]; then high_status="FAIL"; else high_status="PASS"; fi
    if [[ $moderate -gt 0 ]]; then moderate_status="WARN"; else moderate_status="PASS"; fi
    if [[ $low -gt 0 ]]; then low_status="INFO"; else low_status="PASS"; fi

    echo "| Critical | $critical | $critical_status |"
    echo "| High | $high | $high_status |"
    echo "| Moderate | $moderate | $moderate_status |"
    echo "| Low | $low | $low_status |"
    echo ""

    # Extract vulnerability details
    local total=$((critical + high + moderate + low))
    if [[ $total -gt 0 ]]; then
      echo "## Vulnerabilities"
      echo ""

      # Parse advisories from audit output
      if echo "$audit_output" | jq -e '.advisories' > /dev/null 2>&1; then
        echo "$audit_output" | jq -r '
          .advisories | to_entries[] |
          "### \(.value.title)\n\n" +
          "- **Severity:** \(.value.severity)\n" +
          "- **Package:** \(.value.module_name)\n" +
          "- **Vulnerable versions:** \(.value.vulnerable_versions)\n" +
          "- **Patched versions:** \(.value.patched_versions // "None")\n" +
          "- **Advisory:** \(.value.url // "N/A")\n\n" +
          "> \(.value.overview // "No description")\n\n---\n"
        ' 2>/dev/null || echo "_No advisory details available_"
      fi
    else
      echo "## Status"
      echo ""
      echo "No vulnerabilities found above threshold."
    fi

    echo ""
    echo "## Remediation Commands"
    echo ""
    echo '```bash'
    echo "# Attempt automatic fixes"
    echo "pnpm audit --fix"
    echo ""
    echo "# Update all packages"
    echo "pnpm update"
    echo ""
    echo "# Update specific package"
    echo "pnpm update <package-name>"
    echo '```'
    echo ""
    echo "---"
    echo ""
    echo "_Report generated by dependency_audit.sh_"

  } > "$report_file"

  echo "Report generated: $report_file" >&2
}

# Update state file
update_state() {
  local critical="$1"
  local high="$2"
  local moderate="$3"
  local low="$4"
  local failed="$5"

  local now_iso
  now_iso=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  mkdir -p "$(dirname "$STATE_FILE")"

  local state
  state=$(cat "$STATE_FILE" 2>/dev/null || echo '{"version":"1.0.0","audit_history":[]}')

  state=$(echo "$state" | jq \
    --arg time "$now_iso" \
    --argjson critical "$critical" \
    --argjson high "$high" \
    --argjson moderate "$moderate" \
    --argjson low "$low" \
    --arg threshold "$THRESHOLD" \
    --argjson failed "$([[ "$failed" == "true" ]] && echo "true" || echo "false")" \
    '.last_audit = $time |
     .last_result = {
       critical: $critical,
       high: $high,
       moderate: $moderate,
       low: $low,
       threshold: $threshold,
       failed: $failed
     } |
     .audit_history = ([{
       timestamp: $time,
       critical: $critical,
       high: $high,
       moderate: $moderate,
       low: $low,
       threshold: $threshold,
       failed: $failed
     }] + .audit_history[:49])')

  echo "$state" > "$STATE_FILE"
}

main "$@"
