#!/usr/bin/env bash
# type_safety_audit.sh
#
# Audits TypeScript type safety by detecting `any` types and running
# strict type checks.
#
# Usage:
#   ./scripts/release/type_safety_audit.sh [OPTIONS]
#
# Options:
#   --path <path>          Path to audit (default: server/src)
#   --max-any <n>          Maximum allowed `any` types (default: 50)
#   --strict               Enable all strict checks
#   --coverage             Calculate type coverage
#   --report               Generate detailed markdown report
#   --fix                  Show fix suggestions
#   --dry-run              Show what would happen without executing
#   --help                 Show this help message
#
# See docs/ci/TYPE_SAFETY_AUDIT.md for full documentation.

set -euo pipefail

# Default values
AUDIT_PATHS=("server/src" "cli/src" "packages")
MAX_ANY=50
MAX_ANY_STRICT=5
STRICT_MODE=false
CALCULATE_COVERAGE=false
GENERATE_REPORT=true
SHOW_FIX=false
DRY_RUN=false
STATE_FILE="docs/releases/_state/type_safety_state.json"
REPORT_DIR="artifacts/type-safety"

# Strict paths (lower thresholds)
STRICT_PATHS=("server/src/security" "server/src/auth" "server/src/policy" "packages/tasks-core/src")

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --path)
      AUDIT_PATHS=("$2")
      shift 2
      ;;
    --max-any)
      MAX_ANY="$2"
      shift 2
      ;;
    --strict)
      STRICT_MODE=true
      shift
      ;;
    --coverage)
      CALCULATE_COVERAGE=true
      shift
      ;;
    --report)
      GENERATE_REPORT=true
      shift
      ;;
    --fix)
      SHOW_FIX=true
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

# Count `any` occurrences in a file
count_any_in_file() {
  local file="$1"
  local count=0

  # Skip test files
  if [[ "$file" =~ \.(test|spec)\.ts$ ]]; then
    echo 0
    return
  fi

  # Count explicit `any` patterns
  count=$(grep -E ': any[;,)\s]|: any$|as any|<any>|any\[\]' "$file" 2>/dev/null | \
    grep -v '// @ts-expect-error' | \
    grep -v '// eslint-disable' | \
    grep -v '// TODO' | \
    wc -l | tr -d ' ')

  echo "$count"
}

# Check if path is in strict paths
is_strict_path() {
  local path="$1"
  for strict_path in "${STRICT_PATHS[@]}"; do
    if [[ "$path" == *"$strict_path"* ]]; then
      return 0
    fi
  done
  return 1
}

# Main audit function
main() {
  echo "Running type safety audit..." >&2
  echo "  Paths: ${AUDIT_PATHS[*]}" >&2
  echo "  Max any: $MAX_ANY" >&2
  echo "  Strict mode: $STRICT_MODE" >&2

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[DRY RUN] Would audit TypeScript files" >&2
    return 0
  fi

  # Create report directory
  mkdir -p "$REPORT_DIR"

  # Initialize counters
  local total_any=0
  local strict_any=0
  local total_files=0
  local files_with_any=0
  local type_errors=0

  # Collect all TypeScript files
  local ts_files=()
  for path in "${AUDIT_PATHS[@]}"; do
    if [[ -d "$path" ]]; then
      while IFS= read -r -d '' file; do
        ts_files+=("$file")
      done < <(find "$path" -name "*.ts" -not -name "*.test.ts" -not -name "*.spec.ts" -not -path "*/node_modules/*" -not -path "*/dist/*" -print0 2>/dev/null)
    fi
  done

  total_files=${#ts_files[@]}
  echo "  Found $total_files TypeScript files" >&2

  # Analyze files
  declare -A file_counts
  declare -A any_locations

  for file in "${ts_files[@]}"; do
    local count
    count=$(count_any_in_file "$file")

    if [[ $count -gt 0 ]]; then
      file_counts["$file"]=$count
      files_with_any=$((files_with_any + 1))
      total_any=$((total_any + count))

      # Check if in strict path
      if is_strict_path "$file"; then
        strict_any=$((strict_any + count))
      fi

      # Capture locations for report
      any_locations["$file"]=$(grep -n -E ': any[;,)\s]|: any$|as any|<any>|any\[\]' "$file" 2>/dev/null | \
        grep -v '// @ts-expect-error' | \
        grep -v '// eslint-disable' | \
        head -5 || echo "")
    fi
  done

  # Run TypeScript compiler check if strict mode
  if [[ "$STRICT_MODE" == "true" ]]; then
    echo "  Running strict TypeScript check..." >&2
    local tsc_output
    tsc_output=$(npx tsc --noEmit --strict 2>&1) || true
    type_errors=$(echo "$tsc_output" | grep -c "error TS" || echo 0)
  fi

  # Calculate coverage if requested
  local coverage=0
  if [[ "$CALCULATE_COVERAGE" == "true" ]]; then
    echo "  Calculating type coverage..." >&2
    if command -v npx &> /dev/null; then
      coverage=$(npx type-coverage --json 2>/dev/null | jq -r '.percent // 0' || echo 0)
    fi
  fi

  # Output summary
  echo "" >&2
  echo "Type Safety Summary:" >&2
  echo "  Total files:      $total_files" >&2
  echo "  Files with any:   $files_with_any" >&2
  echo "  Total any count:  $total_any (max: $MAX_ANY)" >&2
  echo "  Strict path any:  $strict_any (max: $MAX_ANY_STRICT)" >&2
  if [[ "$STRICT_MODE" == "true" ]]; then
    echo "  Type errors:      $type_errors" >&2
  fi
  if [[ "$CALCULATE_COVERAGE" == "true" ]]; then
    echo "  Type coverage:    ${coverage}%" >&2
  fi

  # Generate report
  if [[ "$GENERATE_REPORT" == "true" ]]; then
    generate_report "$total_files" "$files_with_any" "$total_any" "$strict_any" "$type_errors" "$coverage"
  fi

  # Update state
  update_state "$total_any" "$strict_any" "$type_errors" "$files_with_any"

  # Determine pass/fail
  local should_fail=false
  local fail_reason=""

  if [[ $total_any -gt $MAX_ANY ]]; then
    should_fail=true
    fail_reason="Total any types ($total_any) exceeds threshold ($MAX_ANY)"
  elif [[ $strict_any -gt $MAX_ANY_STRICT ]]; then
    should_fail=true
    fail_reason="Strict path any types ($strict_any) exceeds threshold ($MAX_ANY_STRICT)"
  elif [[ "$STRICT_MODE" == "true" && $type_errors -gt 0 ]]; then
    should_fail=true
    fail_reason="TypeScript strict mode found $type_errors errors"
  fi

  if [[ "$should_fail" == "true" ]]; then
    echo "" >&2
    echo "AUDIT FAILED: $fail_reason" >&2

    if [[ "$SHOW_FIX" == "true" ]]; then
      echo "" >&2
      echo "Top files to fix:" >&2
      for file in "${!file_counts[@]}"; do
        echo "  ${file_counts[$file]} any: $file" >&2
      done | sort -t: -k1 -nr | head -10
    fi

    return 1
  else
    echo "" >&2
    echo "AUDIT PASSED: Type safety within thresholds" >&2
    return 0
  fi
}

# Generate markdown report
generate_report() {
  local total_files="$1"
  local files_with_any="$2"
  local total_any="$3"
  local strict_any="$4"
  local type_errors="$5"
  local coverage="$6"

  local report_file="$REPORT_DIR/type-safety-report.md"
  local now_date
  now_date=$(date -u +"%Y-%m-%d %H:%M:%S UTC")

  {
    echo "# Type Safety Audit Report"
    echo ""
    echo "**Generated:** $now_date"
    echo ""
    echo "## Summary"
    echo ""
    echo "| Metric | Value | Threshold | Status |"
    echo "|--------|-------|-----------|--------|"

    local any_status="PASS"
    [[ $total_any -gt $MAX_ANY ]] && any_status="FAIL"

    local strict_status="PASS"
    [[ $strict_any -gt $MAX_ANY_STRICT ]] && strict_status="FAIL"

    echo "| Total files | $total_files | - | - |"
    echo "| Files with \`any\` | $files_with_any | - | - |"
    echo "| Total \`any\` count | $total_any | $MAX_ANY | $any_status |"
    echo "| Strict path \`any\` | $strict_any | $MAX_ANY_STRICT | $strict_status |"

    if [[ $type_errors -gt 0 ]]; then
      echo "| Type errors | $type_errors | 0 | FAIL |"
    fi

    if [[ "$coverage" != "0" ]]; then
      echo "| Type coverage | ${coverage}% | 85% | $([ "${coverage%.*}" -ge 85 ] && echo "PASS" || echo "WARN") |"
    fi

    echo ""
    echo "## Strict Paths"
    echo ""
    echo "These paths have stricter \`any\` limits:"
    echo ""
    for path in "${STRICT_PATHS[@]}"; do
      echo "- \`$path\`"
    done

    echo ""
    echo "## Remediation"
    echo ""
    echo "### Replace \`any\` with proper types"
    echo ""
    echo '```typescript'
    echo "// Bad"
    echo "function process(data: any): any { ... }"
    echo ""
    echo "// Good"
    echo "function process<T>(data: T): Result<T> { ... }"
    echo ""
    echo "// Or use unknown for truly dynamic data"
    echo "function parse(input: unknown): ParsedResult { ... }"
    echo '```'
    echo ""
    echo "### Use type guards"
    echo ""
    echo '```typescript'
    echo "function isUser(obj: unknown): obj is User {"
    echo '  return typeof obj === "object" && obj !== null && "id" in obj;'
    echo "}"
    echo '```'
    echo ""
    echo "### Use \`unknown\` instead of \`any\`"
    echo ""
    echo '```typescript'
    echo "// unknown is type-safe and requires narrowing"
    echo "function handle(value: unknown) {"
    echo '  if (typeof value === "string") {'
    echo "    // TypeScript knows value is string here"
    echo "  }"
    echo "}"
    echo '```'
    echo ""
    echo "---"
    echo ""
    echo "_Report generated by type_safety_audit.sh_"

  } > "$report_file"

  echo "Report generated: $report_file" >&2
}

# Update state file
update_state() {
  local total_any="$1"
  local strict_any="$2"
  local type_errors="$3"
  local files_with_any="$4"

  local now_iso
  now_iso=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  mkdir -p "$(dirname "$STATE_FILE")"

  local state
  state=$(cat "$STATE_FILE" 2>/dev/null || echo '{"version":"1.0.0","audit_history":[]}')

  local failed="false"
  [[ $total_any -gt $MAX_ANY || $strict_any -gt $MAX_ANY_STRICT ]] && failed="true"

  state=$(echo "$state" | jq \
    --arg time "$now_iso" \
    --argjson total_any "$total_any" \
    --argjson strict_any "$strict_any" \
    --argjson type_errors "$type_errors" \
    --argjson files_with_any "$files_with_any" \
    --argjson max_any "$MAX_ANY" \
    --argjson failed "$failed" \
    '.last_audit = $time |
     .last_result = {
       total_any: $total_any,
       strict_any: $strict_any,
       type_errors: $type_errors,
       files_with_any: $files_with_any,
       threshold: $max_any,
       failed: $failed
     } |
     .audit_history = ([{
       timestamp: $time,
       total_any: $total_any,
       strict_any: $strict_any,
       type_errors: $type_errors,
       files_with_any: $files_with_any,
       failed: $failed
     }] + .audit_history[:49])')

  echo "$state" > "$STATE_FILE"
}

main "$@"
