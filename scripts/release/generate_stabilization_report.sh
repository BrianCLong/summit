#!/usr/bin/env bash
# generate_stabilization_report.sh
#
# Generates a comprehensive MVP-4 Stabilization Progress Report.
# Aggregates all audit results, health checks, and release readiness
# metrics into a single unified status view.
#
# Usage:
#   ./scripts/release/generate_stabilization_report.sh [OPTIONS]
#
# Options:
#   --output <file>      Output file (default: artifacts/reports/stabilization-report.md)
#   --format <format>    Output format: md, json, html (default: md)
#   --include-details    Include full audit details
#   --json-summary       Output JSON summary to stdout
#   --help               Show this help message

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
STATE_DIR="${REPO_ROOT}/docs/releases/_state"

# Defaults
OUTPUT_FILE="${REPO_ROOT}/artifacts/reports/stabilization-report.md"
OUTPUT_FORMAT="md"
INCLUDE_DETAILS=false
JSON_SUMMARY=false

# Timestamp
REPORT_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
REPORT_DATE=$(date -u +"%Y-%m-%d")

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --output)
      OUTPUT_FILE="$2"
      shift 2
      ;;
    --format)
      OUTPUT_FORMAT="$2"
      shift 2
      ;;
    --include-details)
      INCLUDE_DETAILS=true
      shift
      ;;
    --json-summary)
      JSON_SUMMARY=true
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

# Metrics collection
declare -A metrics
declare -A statuses

# Read JSON state file safely
read_state_file() {
  local file="$1"
  local default="$2"

  if [[ -f "$file" ]]; then
    cat "$file"
  else
    echo "$default"
  fi
}

# Collect dependency audit metrics
collect_dependency_metrics() {
  local state_file="${STATE_DIR}/audit_state.json"
  local state
  state=$(read_state_file "$state_file" '{"last_audit":null}')

  local last_audit
  last_audit=$(echo "$state" | jq -r '.last_audit // "never"')

  local critical=0 high=0 moderate=0 low=0
  if [[ "$last_audit" != "null" && "$last_audit" != "never" ]]; then
    critical=$(echo "$state" | jq -r '.last_result.vulnerabilities.critical // 0')
    high=$(echo "$state" | jq -r '.last_result.vulnerabilities.high // 0')
    moderate=$(echo "$state" | jq -r '.last_result.vulnerabilities.moderate // 0')
    low=$(echo "$state" | jq -r '.last_result.vulnerabilities.low // 0')
  fi

  metrics[dependency_critical]="$critical"
  metrics[dependency_high]="$high"
  metrics[dependency_moderate]="$moderate"
  metrics[dependency_low]="$low"
  metrics[dependency_last_audit]="$last_audit"

  # Status calculation
  if [[ "$critical" -gt 0 || "$high" -gt 0 ]]; then
    statuses[dependency_audit]="FAIL"
  elif [[ "$moderate" -gt 5 ]]; then
    statuses[dependency_audit]="WARN"
  else
    statuses[dependency_audit]="PASS"
  fi
}

# Collect type safety metrics
collect_type_safety_metrics() {
  local state_file="${STATE_DIR}/type_safety_state.json"
  local state
  state=$(read_state_file "$state_file" '{"last_audit":null}')

  local last_audit
  last_audit=$(echo "$state" | jq -r '.last_audit // "never"')

  local total_any=0 threshold=0 over_threshold=0
  if [[ "$last_audit" != "null" && "$last_audit" != "never" ]]; then
    total_any=$(echo "$state" | jq -r '.last_result.total_any_count // 0')
    threshold=$(echo "$state" | jq -r '.last_result.threshold // 50')
    over_threshold=$(echo "$state" | jq -r '.last_result.files_over_threshold // 0')
  fi

  metrics[type_total_any]="$total_any"
  metrics[type_threshold]="$threshold"
  metrics[type_over_threshold]="$over_threshold"
  metrics[type_last_audit]="$last_audit"

  if [[ "$over_threshold" -gt 0 ]]; then
    statuses[type_safety]="FAIL"
  elif [[ "$total_any" -gt 100 ]]; then
    statuses[type_safety]="WARN"
  else
    statuses[type_safety]="PASS"
  fi
}

# Collect API determinism metrics
collect_determinism_metrics() {
  local state_file="${STATE_DIR}/determinism_state.json"
  local state
  state=$(read_state_file "$state_file" '{"last_check":null}')

  local last_check
  last_check=$(echo "$state" | jq -r '.last_check // "never"')

  local total=0 passed=0 failed=0
  if [[ "$last_check" != "null" && "$last_check" != "never" ]]; then
    total=$(echo "$state" | jq -r '.last_result.total // 0')
    passed=$(echo "$state" | jq -r '.last_result.passed // 0')
    failed=$(echo "$state" | jq -r '.last_result.failed // 0')
  fi

  metrics[determinism_total]="$total"
  metrics[determinism_passed]="$passed"
  metrics[determinism_failed]="$failed"
  metrics[determinism_last_check]="$last_check"

  if [[ "$failed" -gt 0 ]]; then
    statuses[api_determinism]="FAIL"
  elif [[ "$total" -eq 0 ]]; then
    statuses[api_determinism]="WARN"
  else
    statuses[api_determinism]="PASS"
  fi
}

# Collect health check metrics
collect_health_metrics() {
  local state_file="${STATE_DIR}/health_check_state.json"
  local state
  state=$(read_state_file "$state_file" '{"last_check":null}')

  local last_check
  last_check=$(echo "$state" | jq -r '.last_check // "never"')

  local health_score=0 status="UNKNOWN"
  if [[ "$last_check" != "null" && "$last_check" != "never" ]]; then
    health_score=$(echo "$state" | jq -r '.last_result.health_score // 0')
    status=$(echo "$state" | jq -r '.last_result.status // "UNKNOWN"')
  fi

  metrics[health_score]="$health_score"
  metrics[health_status]="$status"
  metrics[health_last_check]="$last_check"

  statuses[health_check]="$status"
}

# Collect test quarantine metrics
collect_quarantine_metrics() {
  local state_file="${STATE_DIR}/quarantine_state.json"
  local state
  state=$(read_state_file "$state_file" '{"quarantined_tests":[]}')

  local count
  count=$(echo "$state" | jq -r '.quarantined_tests | length // 0')

  metrics[quarantine_count]="$count"

  if [[ "$count" -gt 10 ]]; then
    statuses[test_quarantine]="FAIL"
  elif [[ "$count" -gt 5 ]]; then
    statuses[test_quarantine]="WARN"
  else
    statuses[test_quarantine]="PASS"
  fi
}

# Collect evidence metrics
collect_evidence_metrics() {
  local state_file="${STATE_DIR}/evidence_state.json"
  local state
  state=$(read_state_file "$state_file" '{"last_collection":null}')

  local last_collection
  last_collection=$(echo "$state" | jq -r '.last_collection // "never"')

  local total=0 passed=0 failed=0
  if [[ "$last_collection" != "null" && "$last_collection" != "never" ]]; then
    total=$(echo "$state" | jq -r '.last_result.total // 0')
    passed=$(echo "$state" | jq -r '.last_result.passed // 0')
    failed=$(echo "$state" | jq -r '.last_result.failed // 0')
  fi

  metrics[evidence_total]="$total"
  metrics[evidence_passed]="$passed"
  metrics[evidence_failed]="$failed"
  metrics[evidence_last_collection]="$last_collection"

  if [[ "$failed" -gt 0 ]]; then
    statuses[evidence_collection]="WARN"
  elif [[ "$last_collection" == "never" ]]; then
    statuses[evidence_collection]="WARN"
  else
    statuses[evidence_collection]="PASS"
  fi
}

# Check release blockers via GitHub API
collect_blocker_metrics() {
  local count=0
  local p0_count=0

  if [[ -n "${GITHUB_TOKEN:-}" ]]; then
    local blockers
    blockers=$(gh issue list --label release-blocker --state open --json number,labels --limit 50 2>/dev/null || echo '[]')
    count=$(echo "$blockers" | jq 'length')
    p0_count=$(echo "$blockers" | jq '[.[] | select(.labels[].name == "severity:P0")] | length')
  fi

  metrics[blockers_open]="$count"
  metrics[blockers_p0]="$p0_count"

  if [[ "$p0_count" -gt 0 ]]; then
    statuses[release_blockers]="FAIL"
  elif [[ "$count" -gt 0 ]]; then
    statuses[release_blockers]="WARN"
  else
    statuses[release_blockers]="PASS"
  fi
}

# Calculate overall stabilization score
calculate_overall_score() {
  local pass_count=0
  local warn_count=0
  local fail_count=0
  local total=0

  for status in "${statuses[@]}"; do
    total=$((total + 1))
    case "$status" in
      PASS) pass_count=$((pass_count + 1)) ;;
      WARN) warn_count=$((warn_count + 1)) ;;
      FAIL) fail_count=$((fail_count + 1)) ;;
    esac
  done

  metrics[total_checks]="$total"
  metrics[pass_count]="$pass_count"
  metrics[warn_count]="$warn_count"
  metrics[fail_count]="$fail_count"

  # Score calculation: PASS=100, WARN=50, FAIL=0
  local score=0
  if [[ "$total" -gt 0 ]]; then
    score=$(( (pass_count * 100 + warn_count * 50) / total ))
  fi

  metrics[stabilization_score]="$score"

  # Overall status
  if [[ "$fail_count" -gt 0 ]]; then
    statuses[overall]="FAIL"
  elif [[ "$warn_count" -gt 0 ]]; then
    statuses[overall]="WARN"
  else
    statuses[overall]="PASS"
  fi
}

# Generate markdown report
generate_markdown_report() {
  local output="$1"

  mkdir -p "$(dirname "$output")"

  local overall_emoji="❓"
  case "${statuses[overall]}" in
    PASS) overall_emoji="✅" ;;
    WARN) overall_emoji="⚠️" ;;
    FAIL) overall_emoji="❌" ;;
  esac

  cat > "$output" <<EOF
# MVP-4 Stabilization Progress Report

**Generated:** ${REPORT_TIMESTAMP}
**Overall Status:** ${overall_emoji} ${statuses[overall]}
**Stabilization Score:** ${metrics[stabilization_score]}%

---

## Summary

| Category | Status | Score Contribution |
|----------|--------|-------------------|
| Dependency Audit | ${statuses[dependency_audit]:-UNKNOWN} | $(status_to_emoji "${statuses[dependency_audit]:-UNKNOWN}") |
| Type Safety | ${statuses[type_safety]:-UNKNOWN} | $(status_to_emoji "${statuses[type_safety]:-UNKNOWN}") |
| API Determinism | ${statuses[api_determinism]:-UNKNOWN} | $(status_to_emoji "${statuses[api_determinism]:-UNKNOWN}") |
| Health Check | ${statuses[health_check]:-UNKNOWN} | $(status_to_emoji "${statuses[health_check]:-UNKNOWN}") |
| Test Quarantine | ${statuses[test_quarantine]:-UNKNOWN} | $(status_to_emoji "${statuses[test_quarantine]:-UNKNOWN}") |
| Evidence Collection | ${statuses[evidence_collection]:-UNKNOWN} | $(status_to_emoji "${statuses[evidence_collection]:-UNKNOWN}") |
| Release Blockers | ${statuses[release_blockers]:-UNKNOWN} | $(status_to_emoji "${statuses[release_blockers]:-UNKNOWN}") |

**Checks Summary:** ${metrics[pass_count]} passed, ${metrics[warn_count]} warnings, ${metrics[fail_count]} failed

---

## Dependency Security

**Last Audit:** ${metrics[dependency_last_audit]:-never}

| Severity | Count |
|----------|-------|
| Critical | ${metrics[dependency_critical]:-0} |
| High | ${metrics[dependency_high]:-0} |
| Moderate | ${metrics[dependency_moderate]:-0} |
| Low | ${metrics[dependency_low]:-0} |

**Status:** ${statuses[dependency_audit]:-UNKNOWN}

---

## Type Safety

**Last Audit:** ${metrics[type_last_audit]:-never}

| Metric | Value |
|--------|-------|
| Total \`any\` Types | ${metrics[type_total_any]:-0} |
| Threshold | ${metrics[type_threshold]:-50} |
| Files Over Threshold | ${metrics[type_over_threshold]:-0} |

**Status:** ${statuses[type_safety]:-UNKNOWN}

---

## API Determinism

**Last Check:** ${metrics[determinism_last_check]:-never}

| Metric | Value |
|--------|-------|
| Endpoints Tested | ${metrics[determinism_total]:-0} |
| Deterministic | ${metrics[determinism_passed]:-0} |
| Non-Deterministic | ${metrics[determinism_failed]:-0} |

**Status:** ${statuses[api_determinism]:-UNKNOWN}

---

## Pre-Release Health

**Last Check:** ${metrics[health_last_check]:-never}

| Metric | Value |
|--------|-------|
| Health Score | ${metrics[health_score]:-0}% |
| Status | ${metrics[health_status]:-UNKNOWN} |

**Status:** ${statuses[health_check]:-UNKNOWN}

---

## Test Quarantine

| Metric | Value |
|--------|-------|
| Quarantined Tests | ${metrics[quarantine_count]:-0} |

**Status:** ${statuses[test_quarantine]:-UNKNOWN}

---

## Evidence Collection

**Last Collection:** ${metrics[evidence_last_collection]:-never}

| Metric | Value |
|--------|-------|
| Evidence Collected | ${metrics[evidence_passed]:-0} |
| Collection Failures | ${metrics[evidence_failed]:-0} |

**Status:** ${statuses[evidence_collection]:-UNKNOWN}

---

## Release Blockers

| Metric | Value |
|--------|-------|
| Open Blockers | ${metrics[blockers_open]:-0} |
| P0 Blockers | ${metrics[blockers_p0]:-0} |

**Status:** ${statuses[release_blockers]:-UNKNOWN}

---

## Recommendations

$(generate_recommendations)

---

## Next Steps

1. **Run fresh audits:**
   \`\`\`bash
   ./scripts/release/dependency_audit.sh
   ./scripts/release/type_safety_audit.sh
   ./scripts/release/api_determinism_check.sh
   \`\`\`

2. **Run pre-release health check:**
   \`\`\`bash
   ./scripts/release/pre_release_health_check.sh --report
   \`\`\`

3. **Collect evidence:**
   \`\`\`bash
   ./scripts/release/generate_evidence_bundle.sh --category all
   \`\`\`

4. **Review release blockers:**
   \`\`\`bash
   gh issue list --label release-blocker --state open
   \`\`\`

---

**Report Version:** 1.0.0
**Generated by:** generate_stabilization_report.sh
EOF
}

status_to_emoji() {
  case "$1" in
    PASS) echo "✅" ;;
    WARN) echo "⚠️" ;;
    FAIL) echo "❌" ;;
    *) echo "❓" ;;
  esac
}

generate_recommendations() {
  local recommendations=""

  if [[ "${statuses[dependency_audit]}" == "FAIL" ]]; then
    recommendations+="- **Critical:** Address dependency vulnerabilities before release\n"
  fi

  if [[ "${statuses[type_safety]}" == "FAIL" ]]; then
    recommendations+="- **Critical:** Reduce \`any\` types in flagged files\n"
  fi

  if [[ "${statuses[api_determinism]}" == "FAIL" ]]; then
    recommendations+="- **Critical:** Fix non-deterministic API endpoints\n"
  fi

  if [[ "${statuses[release_blockers]}" == "FAIL" ]]; then
    recommendations+="- **Critical:** Resolve P0 release blockers\n"
  fi

  if [[ "${statuses[health_check]}" == "WARN" ]]; then
    recommendations+="- **Warning:** Review health check warnings\n"
  fi

  if [[ "${statuses[test_quarantine]}" == "WARN" ]]; then
    recommendations+="- **Warning:** Investigate quarantined tests\n"
  fi

  if [[ "${statuses[evidence_collection]}" == "WARN" ]]; then
    recommendations+="- **Warning:** Run evidence collection\n"
  fi

  if [[ -z "$recommendations" ]]; then
    recommendations="No critical issues found. Release readiness looks good!"
  fi

  echo -e "$recommendations"
}

# Generate JSON summary
generate_json_summary() {
  cat <<EOF
{
  "report_timestamp": "${REPORT_TIMESTAMP}",
  "stabilization_score": ${metrics[stabilization_score]:-0},
  "overall_status": "${statuses[overall]:-UNKNOWN}",
  "summary": {
    "total_checks": ${metrics[total_checks]:-0},
    "passed": ${metrics[pass_count]:-0},
    "warnings": ${metrics[warn_count]:-0},
    "failed": ${metrics[fail_count]:-0}
  },
  "checks": {
    "dependency_audit": {
      "status": "${statuses[dependency_audit]:-UNKNOWN}",
      "critical": ${metrics[dependency_critical]:-0},
      "high": ${metrics[dependency_high]:-0},
      "last_audit": "${metrics[dependency_last_audit]:-never}"
    },
    "type_safety": {
      "status": "${statuses[type_safety]:-UNKNOWN}",
      "total_any": ${metrics[type_total_any]:-0},
      "over_threshold": ${metrics[type_over_threshold]:-0},
      "last_audit": "${metrics[type_last_audit]:-never}"
    },
    "api_determinism": {
      "status": "${statuses[api_determinism]:-UNKNOWN}",
      "total": ${metrics[determinism_total]:-0},
      "passed": ${metrics[determinism_passed]:-0},
      "failed": ${metrics[determinism_failed]:-0},
      "last_check": "${metrics[determinism_last_check]:-never}"
    },
    "health_check": {
      "status": "${statuses[health_check]:-UNKNOWN}",
      "score": ${metrics[health_score]:-0},
      "last_check": "${metrics[health_last_check]:-never}"
    },
    "test_quarantine": {
      "status": "${statuses[test_quarantine]:-UNKNOWN}",
      "quarantined_count": ${metrics[quarantine_count]:-0}
    },
    "evidence_collection": {
      "status": "${statuses[evidence_collection]:-UNKNOWN}",
      "passed": ${metrics[evidence_passed]:-0},
      "failed": ${metrics[evidence_failed]:-0},
      "last_collection": "${metrics[evidence_last_collection]:-never}"
    },
    "release_blockers": {
      "status": "${statuses[release_blockers]:-UNKNOWN}",
      "open": ${metrics[blockers_open]:-0},
      "p0": ${metrics[blockers_p0]:-0}
    }
  }
}
EOF
}

# Main
main() {
  echo "Generating Stabilization Progress Report..." >&2
  echo "  Timestamp: ${REPORT_TIMESTAMP}" >&2

  # Collect all metrics
  echo "  Collecting dependency metrics..." >&2
  collect_dependency_metrics

  echo "  Collecting type safety metrics..." >&2
  collect_type_safety_metrics

  echo "  Collecting determinism metrics..." >&2
  collect_determinism_metrics

  echo "  Collecting health metrics..." >&2
  collect_health_metrics

  echo "  Collecting quarantine metrics..." >&2
  collect_quarantine_metrics

  echo "  Collecting evidence metrics..." >&2
  collect_evidence_metrics

  echo "  Collecting blocker metrics..." >&2
  collect_blocker_metrics

  echo "  Calculating overall score..." >&2
  calculate_overall_score

  # Generate output
  if [[ "$JSON_SUMMARY" == "true" ]]; then
    generate_json_summary
  else
    case "$OUTPUT_FORMAT" in
      md|markdown)
        generate_markdown_report "$OUTPUT_FILE"
        echo "" >&2
        echo "========================================" >&2
        echo "STABILIZATION REPORT GENERATED" >&2
        echo "========================================" >&2
        echo "  Output: ${OUTPUT_FILE}" >&2
        echo "  Score:  ${metrics[stabilization_score]}%" >&2
        echo "  Status: ${statuses[overall]}" >&2
        echo "========================================" >&2
        ;;
      json)
        generate_json_summary > "$OUTPUT_FILE"
        echo "JSON report written to: ${OUTPUT_FILE}" >&2
        ;;
      *)
        echo "Unknown format: $OUTPUT_FORMAT" >&2
        exit 1
        ;;
    esac
  fi
}

main "$@"
