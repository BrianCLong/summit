#!/usr/bin/env bash
# manage_test_quarantine.sh
#
# Manages test quarantine for flaky tests. Can quarantine failing tests,
# unquarantine recovered tests, and generate reports.
#
# Usage:
#   ./scripts/release/manage_test_quarantine.sh [COMMAND] [OPTIONS]
#
# Commands:
#   analyze     Analyze test results for quarantine candidates
#   quarantine  Add a test to quarantine
#   unquarantine Remove a test from quarantine
#   list        List currently quarantined tests
#   report      Generate quarantine report
#   sync        Sync quarantine state with test results
#   export-jest Export quarantined tests as Jest ignore regex
#
# Options:
#   --policy <path>      Path to policy file
#   --quarantine <path>  Path to quarantine file
#   --state <path>       Path to state file
#   --test <name>        Test name (for quarantine/unquarantine)
#   --reason <text>      Reason for action
#   --dry-run            Show what would be done
#   --help               Show this help message
#
# See docs/ci/TEST_QUARANTINE.md for full documentation.

set -euo pipefail

# Default paths
POLICY_FILE="docs/ci/TEST_QUARANTINE_POLICY.yml"
QUARANTINE_FILE="test-quarantine.json"
STATE_FILE="docs/releases/_state/quarantine_state.json"
TEST_NAME=""
REASON=""
DRY_RUN=false
COMMAND=""

# Repository info
REPO="${GITHUB_REPOSITORY:-$(git remote get-url origin 2>/dev/null | sed 's/.*github.com[:/]\(.*\)\.git/\1/' || echo 'unknown/repo')}"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    analyze|quarantine|unquarantine|list|report|sync|export-jest)
      COMMAND="$1"
      shift
      ;;
    --policy)
      POLICY_FILE="$2"
      shift 2
      ;;
    --quarantine)
      QUARANTINE_FILE="$2"
      shift 2
      ;;
    --state)
      STATE_FILE="$2"
      shift 2
      ;;
    --test)
      TEST_NAME="$2"
      shift 2
      ;;
    --reason)
      REASON="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --help)
      head -30 "$0" | tail -25
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$COMMAND" ]]; then
  echo "Error: Command required. Use --help for usage." >&2
  exit 1
fi

# Ensure files exist
ensure_files() {
  if [[ ! -f "$QUARANTINE_FILE" ]]; then
    echo '{"version":"1.0.0","quarantined":[]}' > "$QUARANTINE_FILE"
  fi
  if [[ ! -f "$STATE_FILE" ]]; then
    mkdir -p "$(dirname "$STATE_FILE")"
    echo '{"version":"1.0.0","last_update":null,"quarantined_tests":{},"stats":{"total_quarantined":0,"total_unquarantined":0,"currently_quarantined":0}}' > "$STATE_FILE"
  fi
}

# Load quarantine list
load_quarantine() {
  cat "$QUARANTINE_FILE"
}

# Save quarantine list
save_quarantine() {
  local data="$1"
  if [[ "$DRY_RUN" != "true" ]]; then
    echo "$data" > "$QUARANTINE_FILE"
  fi
}

# Load state
load_state() {
  cat "$STATE_FILE"
}

# Save state
save_state() {
  local state="$1"
  if [[ "$DRY_RUN" != "true" ]]; then
    echo "$state" > "$STATE_FILE"
  fi
}

# Check if test is protected
is_protected() {
  local test_name="$1"

  if [[ ! -f "$POLICY_FILE" ]]; then
    return 1
  fi

  local patterns
  patterns=$(yq '.protected_patterns[]' "$POLICY_FILE" 2>/dev/null || echo "")

  for pattern in $patterns; do
    pattern=$(echo "$pattern" | tr -d '"')
    # Simple glob matching
    if [[ "$test_name" == $pattern ]]; then
      return 0
    fi
  done

  return 1
}

# Add test to quarantine
do_quarantine() {
  if [[ -z "$TEST_NAME" ]]; then
    echo "Error: --test required for quarantine command" >&2
    exit 1
  fi

  ensure_files

  # Check if protected
  if is_protected "$TEST_NAME"; then
    echo "Error: Test '$TEST_NAME' is protected and cannot be quarantined" >&2
    exit 1
  fi

  local quarantine
  local state
  local now_iso

  quarantine=$(load_quarantine)
  state=$(load_state)
  now_iso=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  # Check if already quarantined
  if echo "$quarantine" | jq -e ".quarantined[] | select(.name == \"$TEST_NAME\")" > /dev/null 2>&1; then
    echo "Test '$TEST_NAME' is already quarantined" >&2
    exit 0
  fi

  echo "Quarantining test: $TEST_NAME" >&2
  [[ "$DRY_RUN" == "true" ]] && echo "[DRY RUN]" >&2

  # Add to quarantine
  local entry
  entry=$(jq -n \
    --arg name "$TEST_NAME" \
    --arg reason "${REASON:-Flaky test}" \
    --arg date "$now_iso" \
    '{
      name: $name,
      reason: $reason,
      quarantined_at: $date,
      failure_count: 0,
      pass_count: 0
    }')

  quarantine=$(echo "$quarantine" | jq ".quarantined += [$entry]")
  save_quarantine "$quarantine"

  # Update state
  state=$(echo "$state" | jq \
    --arg name "$TEST_NAME" \
    --arg time "$now_iso" \
    --arg reason "${REASON:-Flaky test}" \
    '.last_update = $time |
     .quarantined_tests[$name] = {
       quarantined_at: $time,
       reason: $reason,
       status: "quarantined"
     } |
     .stats.total_quarantined += 1 |
     .stats.currently_quarantined += 1')
  save_state "$state"

  # Create issue if enabled
  if [[ "$DRY_RUN" != "true" && -n "${GITHUB_TOKEN:-}" ]]; then
    local create_issue
    create_issue=$(yq '.auto_quarantine.create_issue // false' "$POLICY_FILE" 2>/dev/null)

    if [[ "$create_issue" == "true" ]]; then
      local issue_body="## Quarantined Test

**Test:** \`$TEST_NAME\`
**Reason:** ${REASON:-Flaky test}
**Quarantined:** $now_iso

This test has been automatically quarantined due to flakiness.

### Action Required

1. Investigate the root cause
2. Fix the underlying issue
3. The test will be automatically unquarantined after 5 consecutive passes

### Quarantine Policy

- Tests are quarantined after 3 failures in 24 hours
- Protected tests (security/auth/critical) cannot be quarantined
- Quarantined tests are skipped in CI but tracked for recovery"

      gh issue create \
        --repo "$REPO" \
        --title "Quarantined: $TEST_NAME" \
        --body "$issue_body" \
        --label "quarantine,flaky-test,tech-debt" \
        2>/dev/null || echo "Warning: Could not create issue" >&2
    fi
  fi

  echo "Test quarantined successfully" >&2
}

# Remove test from quarantine
do_unquarantine() {
  if [[ -z "$TEST_NAME" ]]; then
    echo "Error: --test required for unquarantine command" >&2
    exit 1
  fi

  ensure_files

  local quarantine
  local state
  local now_iso

  quarantine=$(load_quarantine)
  state=$(load_state)
  now_iso=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  # Check if quarantined
  if ! echo "$quarantine" | jq -e ".quarantined[] | select(.name == \"$TEST_NAME\")" > /dev/null 2>&1; then
    echo "Test '$TEST_NAME' is not quarantined" >&2
    exit 0
  fi

  echo "Unquarantining test: $TEST_NAME" >&2
  [[ "$DRY_RUN" == "true" ]] && echo "[DRY RUN]" >&2

  # Remove from quarantine
  quarantine=$(echo "$quarantine" | jq ".quarantined = [.quarantined[] | select(.name != \"$TEST_NAME\")]")
  save_quarantine "$quarantine"

  # Update state
  state=$(echo "$state" | jq \
    --arg name "$TEST_NAME" \
    --arg time "$now_iso" \
    '.last_update = $time |
     .quarantined_tests[$name].status = "recovered" |
     .quarantined_tests[$name].recovered_at = $time |
     .stats.total_unquarantined += 1 |
     .stats.currently_quarantined = ([.stats.currently_quarantined - 1, 0] | max)')
  save_state "$state"

  echo "Test unquarantined successfully" >&2
}

# List quarantined tests
do_list() {
  ensure_files

  local quarantine
  quarantine=$(load_quarantine)

  local count
  count=$(echo "$quarantine" | jq '.quarantined | length')

  echo "Quarantined Tests ($count)" >&2
  echo "========================" >&2

  if [[ $count -eq 0 ]]; then
    echo "No tests currently quarantined" >&2
    return
  fi

  echo "$quarantine" | jq -r '
    .quarantined[] |
    "- \(.name)\n  Reason: \(.reason)\n  Since: \(.quarantined_at)"
  '
}

# Generate report
do_report() {
  ensure_files

  local quarantine
  local state
  local now_iso

  quarantine=$(load_quarantine)
  state=$(load_state)
  now_iso=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  local count
  local total_quarantined
  local total_recovered

  count=$(echo "$quarantine" | jq '.quarantined | length')
  total_quarantined=$(echo "$state" | jq '.stats.total_quarantined')
  total_recovered=$(echo "$state" | jq '.stats.total_unquarantined')

  echo "# Test Quarantine Report"
  echo ""
  echo "**Generated:** $now_iso"
  echo "**Repository:** $REPO"
  echo ""
  echo "---"
  echo ""
  echo "## Summary"
  echo ""
  echo "| Metric | Value |"
  echo "|--------|-------|"
  echo "| Currently Quarantined | $count |"
  echo "| Total Ever Quarantined | $total_quarantined |"
  echo "| Total Recovered | $total_recovered |"
  echo ""

  if [[ $count -gt 0 ]]; then
    echo "---"
    echo ""
    echo "## Quarantined Tests"
    echo ""
    echo "| Test | Reason | Quarantined Since |"
    echo "|------|--------|-------------------|"

    echo "$quarantine" | jq -r '
      .quarantined[] |
      "| `\(.name | .[0:50])` | \(.reason | .[0:30]) | \(.quarantined_at | .[0:10]) |"
    '
    echo ""
  fi

  # Stale quarantines (> 14 days)
  local max_days
  max_days=$(yq '.management.max_quarantine_days // 14' "$POLICY_FILE" 2>/dev/null)

  echo "---"
  echo ""
  echo "## Health Check"
  echo ""

  local stale_count=0
  local now_epoch
  now_epoch=$(date +%s)

  while read -r entry; do
    if [[ -n "$entry" ]]; then
      local quarantined_at
      quarantined_at=$(echo "$entry" | jq -r '.quarantined_at')
      local q_epoch
      q_epoch=$(date -d "$quarantined_at" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "$quarantined_at" +%s 2>/dev/null || echo "$now_epoch")
      local age_days
      age_days=$(( (now_epoch - q_epoch) / 86400 ))

      if [[ $age_days -gt $max_days ]]; then
        stale_count=$((stale_count + 1))
      fi
    fi
  done < <(echo "$quarantine" | jq -c '.quarantined[]' 2>/dev/null)

  if [[ $stale_count -gt 0 ]]; then
    echo "⚠️ **$stale_count test(s)** have been quarantined for more than $max_days days"
    echo ""
    echo "These tests need attention - either fix the underlying issue or remove them."
  else
    echo "✅ All quarantined tests are within the $max_days day limit"
  fi
}

# Export as Jest ignore regex
do_export_jest() {
  ensure_files

  local quarantine
  quarantine=$(load_quarantine)

  local count
  count=$(echo "$quarantine" | jq '.quarantined | length')

  if [[ $count -eq 0 ]]; then
    echo ""
    return
  fi

  # Join names with | and escape strict regex chars if needed
  # Assuming names are file paths or test names
  echo "$quarantine" | jq -r '.quarantined[].name' | tr '\n' '|' | sed 's/|$//'
}

# Sync with test results (placeholder for integration)
do_sync() {
  ensure_files

  echo "Syncing quarantine state..." >&2
  echo "Note: Full sync requires integration with test result storage" >&2

  # This would typically:
  # 1. Fetch recent test results
  # 2. Identify tests meeting quarantine criteria
  # 3. Auto-quarantine new flaky tests
  # 4. Auto-unquarantine recovered tests

  local quarantine
  local state
  local now_iso

  quarantine=$(load_quarantine)
  state=$(load_state)
  now_iso=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  # Update last sync time
  state=$(echo "$state" | jq --arg time "$now_iso" '.last_update = $time')
  save_state "$state"

  echo "Sync complete" >&2
}

# Analyze test results for quarantine candidates
do_analyze() {
  ensure_files

  echo "Analyzing test results for quarantine candidates..." >&2

  # This would typically:
  # 1. Parse test result files (JUnit XML, etc.)
  # 2. Identify failing tests
  # 3. Check against failure threshold
  # 4. Suggest or auto-quarantine

  echo ""
  echo "Analysis requires test result input."
  echo ""
  echo "To analyze specific test results:"
  echo "  1. Run tests with JUnit output"
  echo "  2. Parse results for failures"
  echo "  3. Use --test and quarantine command for each candidate"
  echo ""
  echo "Example:"
  echo "  ./scripts/release/manage_test_quarantine.sh quarantine \\"
  echo "    --test 'path/to/test.spec.ts' \\"
  echo "    --reason 'Flaky: 3 failures in last 24h'"
}

# Main dispatch
case "$COMMAND" in
  analyze)
    do_analyze
    ;;
  quarantine)
    do_quarantine
    ;;
  unquarantine)
    do_unquarantine
    ;;
  list)
    do_list
    ;;
  report)
    do_report
    ;;
  sync)
    do_sync
    ;;
  export-jest)
    do_export_jest
    ;;
  *)
    echo "Unknown command: $COMMAND" >&2
    exit 1
    ;;
esac
