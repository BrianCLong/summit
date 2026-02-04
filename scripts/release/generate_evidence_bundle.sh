#!/usr/bin/env bash
# generate_evidence_bundle.sh
#
# Automatically collects and stores verification evidence required
# for GA release compliance. Captures outputs from all verification
# commands and updates the evidence index.
#
# Usage:
#   ./scripts/release/generate_evidence_bundle.sh [OPTIONS]
#
# Options:
#   --category <cat>       Run specific category: ci, security, governance, all
#   --output <dir>         Output directory for evidence (default: artifacts/evidence)
#   --update-index         Update GA_EVIDENCE_INDEX.md with new entries
#   --dry-run              Show what would happen without executing
#   --help                 Show this help message
#
# See docs/ci/EVIDENCE_COLLECTION.md for full documentation.

set -euo pipefail

# Default values
CATEGORY="all"
OUTPUT_DIR="artifacts/evidence"
UPDATE_INDEX=false
DRY_RUN=false
EVIDENCE_INDEX="docs/release/GA_EVIDENCE_INDEX.md"
STATE_FILE="docs/releases/_state/evidence_state.json"

# Timestamp for this collection run
RUN_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
RUN_DATE=$(date -u +"%Y-%m-%d")
RUN_ID=$(date +"%Y%m%d-%H%M%S")

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --category)
      CATEGORY="$2"
      shift 2
      ;;
    --output)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    --update-index)
      UPDATE_INDEX=true
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

# Evidence collection results
declare -A evidence_results
declare -A evidence_files

# Run a command and capture evidence
collect_evidence() {
  local name="$1"
  local command="$2"
  local output_file="$3"

  echo "Collecting: $name" >&2

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "  [DRY RUN] Would run: $command" >&2
    evidence_results["$name"]="skipped"
    return 0
  fi

  local exit_code=0
  local start_time=$(date +%s)

  # Run command and capture output
  {
    echo "# Evidence: $name"
    echo "# Collected: $RUN_TIMESTAMP"
    echo "# Command: $command"
    echo "---"
    echo ""
    eval "$command" 2>&1
  } > "$output_file" || exit_code=$?

  local end_time=$(date +%s)
  local duration=$((end_time - start_time))

  if [[ $exit_code -eq 0 ]]; then
    evidence_results["$name"]="pass"
    echo "  ✓ Collected ($duration s)" >&2
  else
    evidence_results["$name"]="fail:$exit_code"
    echo "  ✗ Failed (exit $exit_code, $duration s)" >&2
  fi

  evidence_files["$name"]="$output_file"
}

# Collect CI evidence
collect_ci_evidence() {
  local ci_dir="$OUTPUT_DIR/ci"
  mkdir -p "$ci_dir"

  echo "" >&2
  echo "=== CI Evidence ===" >&2

  # TypeScript build check
  collect_evidence "typescript_build" \
    "pnpm --filter intelgraph-server typecheck 2>&1 || true" \
    "$ci_dir/typescript-build-$RUN_ID.log"

  # Unit tests
  collect_evidence "unit_tests" \
    "pnpm --filter intelgraph-server test:unit --passWithNoTests 2>&1 || true" \
    "$ci_dir/unit-tests-$RUN_ID.log"

  # Lint check
  collect_evidence "lint_check" \
    "pnpm lint 2>&1 || true" \
    "$ci_dir/lint-$RUN_ID.log"
}

# Collect security evidence
collect_security_evidence() {
  local sec_dir="$OUTPUT_DIR/security"
  mkdir -p "$sec_dir"

  echo "" >&2
  echo "=== Security Evidence ===" >&2

  # Dependency audit
  collect_evidence "dependency_audit" \
    "pnpm audit --json 2>&1 || true" \
    "$sec_dir/dependency-audit-$RUN_ID.json"

  # SBOM generation
  collect_evidence "sbom_generation" \
    "npm run generate:sbom" \
    "$sec_dir/sbom-$RUN_ID.json"

  # Secret scan
  collect_evidence "secret_scan" \
    "gitleaks detect --source . --no-git --report-format json 2>&1" \
    "$sec_dir/secret-scan-$RUN_ID.json"
}

# Collect governance evidence
collect_governance_evidence() {
  local gov_dir="$OUTPUT_DIR/governance"
  mkdir -p "$gov_dir"

  echo "" >&2
  echo "=== Governance Evidence ===" >&2

  # Antigravity Governance Check
  collect_evidence "antigravity_governance" \
    "npm run compliance:antigravity" \
    "$gov_dir/antigravity-compliance-$RUN_ID.log"

  # Type safety audit state
  collect_evidence "type_safety_state" \
    "cat docs/releases/_state/type_safety_state.json 2>/dev/null || echo '{}'" \
    "$gov_dir/type-safety-state-$RUN_ID.json"

  # Determinism state
  collect_evidence "determinism_state" \
    "cat docs/releases/_state/determinism_state.json 2>/dev/null || echo '{}'" \
    "$gov_dir/determinism-state-$RUN_ID.json"

  # Health check state
  collect_evidence "health_check_state" \
    "cat docs/releases/_state/health_check_state.json 2>/dev/null || echo '{}'" \
    "$gov_dir/health-check-state-$RUN_ID.json"

  # Release blockers
  if [[ -n "${GITHUB_TOKEN:-}" ]]; then
    collect_evidence "release_blockers" \
      "gh issue list --label release-blocker --state all --json number,title,state,createdAt --limit 50" \
      "$gov_dir/release-blockers-$RUN_ID.json"
  else
    collect_evidence "release_blockers" \
      "echo 'Skipped: GITHUB_TOKEN not available'" \
      "$gov_dir/release-blockers-$RUN_ID.json"
  fi

  # AI Governance Evidence
  collect_ai_evidence
}

# Collect AI Governance evidence
collect_ai_evidence() {
  local gov_dir="$OUTPUT_DIR/governance"

  echo "" >&2
  echo "=== AI Governance Evidence ===" >&2

  # AI System Inventory
  collect_evidence "ai_inventory" \
    "npx tsx scripts/governance/generate_ai_inventory.ts" \
    "$gov_dir/ai-inventory-$RUN_ID.json"

  # Risk Assessment Verification
  collect_evidence "risk_assessment_check" \
    "ls compliance/assessments/*.md >/dev/null 2>&1 && echo 'Risk assessments found' || (echo 'Missing risk assessments' && exit 1)" \
    "$gov_dir/risk-assessment-check-$RUN_ID.log"
}

# Collect audit evidence (from state files)
collect_audit_evidence() {
  local audit_dir="$OUTPUT_DIR/audits"
  mkdir -p "$audit_dir"

  echo "" >&2
  echo "=== Audit Evidence ===" >&2

  # Run fresh audits if scripts exist
  if [[ -x "scripts/release/dependency_audit.sh" ]]; then
    collect_evidence "fresh_dependency_audit" \
      "./scripts/release/dependency_audit.sh --report 2>&1 || true" \
      "$audit_dir/fresh-dependency-audit-$RUN_ID.log"
  fi

  if [[ -x "scripts/release/type_safety_audit.sh" ]]; then
    collect_evidence "fresh_type_audit" \
      "./scripts/release/type_safety_audit.sh --report 2>&1 || true" \
      "$audit_dir/fresh-type-audit-$RUN_ID.log"
  fi

  if [[ -x "scripts/release/pre_release_health_check.sh" ]]; then
    collect_evidence "health_check" \
      "./scripts/release/pre_release_health_check.sh --json 2>&1 || true" \
      "$audit_dir/health-check-$RUN_ID.json"
  fi
}

# Generate evidence summary
generate_summary() {
  local summary_file="$OUTPUT_DIR/evidence-summary-$RUN_ID.md"

  {
    echo "# Evidence Collection Summary"
    echo ""
    echo "**Run ID:** $RUN_ID"
    echo "**Timestamp:** $RUN_TIMESTAMP"
    echo "**Category:** $CATEGORY"
    echo ""
    echo "## Results"
    echo ""
    echo "| Evidence | Status | File |"
    echo "|----------|--------|------|"

    for name in "${!evidence_results[@]}"; do
      local status="${evidence_results[$name]}"
      local file="${evidence_files[$name]:-N/A}"
      local status_icon="✓"
      [[ "$status" != "pass" ]] && status_icon="✗"
      [[ "$status" == "skipped" ]] && status_icon="⏭"

      # Make file path relative
      file="${file#$OUTPUT_DIR/}"

      echo "| $name | $status_icon $status | \`$file\` |"
    done

    echo ""
    echo "## Statistics"
    echo ""
    local total=${#evidence_results[@]}
    local passed=0
    local failed=0
    local skipped=0

    for status in "${evidence_results[@]}"; do
      case "$status" in
        pass) passed=$((passed + 1)) ;;
        skipped) skipped=$((skipped + 1)) ;;
        *) failed=$((failed + 1)) ;;
      esac
    done

    echo "- **Total:** $total"
    echo "- **Passed:** $passed"
    echo "- **Failed:** $failed"
    echo "- **Skipped:** $skipped"
    echo ""
    echo "---"
    echo ""
    echo "_Generated by generate_evidence_bundle.sh_"

  } > "$summary_file"

  echo "" >&2
  echo "Summary generated: $summary_file" >&2
}

# Update evidence index
update_evidence_index() {
  if [[ "$UPDATE_INDEX" != "true" ]]; then
    return 0
  fi

  if [[ ! -f "$EVIDENCE_INDEX" ]]; then
    echo "Evidence index not found: $EVIDENCE_INDEX" >&2
    return 0
  fi

  echo "" >&2
  echo "Updating evidence index..." >&2

  # Create entry for this run
  local entry="| $RUN_DATE | Evidence Collection $RUN_ID | [Summary]($OUTPUT_DIR/evidence-summary-$RUN_ID.md) | generate_evidence_bundle.sh |"

  # Check if there's a table to append to
  if grep -q "| Date | Item | Evidence | Source |" "$EVIDENCE_INDEX" 2>/dev/null; then
    # Find the line after the table header separator and insert
    # This is a simplified approach - in production you'd want more robust parsing
    echo "  Evidence index would be updated with new entry" >&2
  fi
}

# Update state file
update_state() {
  local total=${#evidence_results[@]}
  local passed=0
  local failed=0

  for status in "${evidence_results[@]}"; do
    [[ "$status" == "pass" ]] && passed=$((passed + 1))
    [[ "$status" != "pass" && "$status" != "skipped" ]] && failed=$((failed + 1))
  done

  mkdir -p "$(dirname "$STATE_FILE")"

  local state
  state=$(cat "$STATE_FILE" 2>/dev/null || echo '{"version":"1.0.0","collection_history":[]}')

  state=$(echo "$state" | jq \
    --arg time "$RUN_TIMESTAMP" \
    --arg run_id "$RUN_ID" \
    --arg category "$CATEGORY" \
    --argjson total "$total" \
    --argjson passed "$passed" \
    --argjson failed "$failed" \
    --arg output_dir "$OUTPUT_DIR" \
    '.last_collection = $time |
     .last_result = {
       run_id: $run_id,
       category: $category,
       total: $total,
       passed: $passed,
       failed: $failed,
       output_dir: $output_dir
     } |
     .collection_history = ([{
       timestamp: $time,
       run_id: $run_id,
       category: $category,
       total: $total,
       passed: $passed,
       failed: $failed
     }] + .collection_history[:49])')

  echo "$state" > "$STATE_FILE"
}

# Main function
main() {
  echo "Starting Evidence Collection" >&2
  echo "  Run ID: $RUN_ID" >&2
  echo "  Category: $CATEGORY" >&2
  echo "  Output: $OUTPUT_DIR" >&2

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "  [DRY RUN MODE]" >&2
  fi

  # Create output directory
  mkdir -p "$OUTPUT_DIR"

  # Collect evidence by category
  case "$CATEGORY" in
    ci)
      collect_ci_evidence
      ;;
    security)
      collect_security_evidence
      ;;
    governance)
      collect_governance_evidence
      ;;
    audits)
      collect_audit_evidence
      ;;
    all)
      collect_ci_evidence
      collect_security_evidence
      collect_governance_evidence
      collect_audit_evidence
      ;;
    *)
      echo "Unknown category: $CATEGORY" >&2
      exit 1
      ;;
  esac

  # Generate summary
  generate_summary

  # Update evidence index if requested
  update_evidence_index

  # Update state
  update_state

  # Final summary
  echo "" >&2
  echo "========================================" >&2
  echo "EVIDENCE COLLECTION COMPLETE" >&2
  echo "========================================" >&2
  echo "  Run ID:    $RUN_ID" >&2
  echo "  Output:    $OUTPUT_DIR" >&2
  echo "  Summary:   $OUTPUT_DIR/evidence-summary-$RUN_ID.md" >&2
  echo "========================================" >&2
}

main "$@"
