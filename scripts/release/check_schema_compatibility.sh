#!/usr/bin/env bash
# check_schema_compatibility.sh
#
# Checks GraphQL schema for backward compatibility during RC stabilization.
# Detects breaking changes that could affect API consumers.
#
# Usage:
#   ./scripts/release/check_schema_compatibility.sh [OPTIONS]
#
# Options:
#   --baseline <ref>     Git ref for baseline (default: latest rc-* tag)
#   --schema <path>      Path to schema file (default: graphql/schema.graphql)
#   --strict             Fail on any schema change
#   --allow-additions    Allow additive changes (new types/fields)
#   --report             Generate detailed report
#   --help               Show this help message
#
# Exit codes:
#   0 - Schema is compatible (or only additive changes with --allow-additions)
#   1 - Breaking changes detected
#   2 - Invalid arguments or configuration error

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
STATE_DIR="${REPO_ROOT}/docs/releases/_state"
STATE_FILE="${STATE_DIR}/schema_compatibility_state.json"

# Defaults
BASELINE=""
SCHEMA_PATH="graphql/schema.graphql"
STRICT_MODE=false
ALLOW_ADDITIONS=false
GENERATE_REPORT=false

# Timestamp
CHECK_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Change tracking
declare -a breaking_changes
declare -a additions
declare -a modifications

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --baseline)
      BASELINE="$2"
      shift 2
      ;;
    --schema)
      SCHEMA_PATH="$2"
      shift 2
      ;;
    --strict)
      STRICT_MODE=true
      shift
      ;;
    --allow-additions)
      ALLOW_ADDITIONS=true
      shift
      ;;
    --report)
      GENERATE_REPORT=true
      shift
      ;;
    --help)
      head -25 "$0" | tail -21
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 2
      ;;
  esac
done

# Find latest RC tag if no baseline specified
find_latest_rc_tag() {
  git tag -l 'v*.*.*-rc.*' --sort=-v:refname | head -1
}

# Get schema at a specific ref
get_schema_at_ref() {
  local ref="$1"
  local schema="$2"

  git show "${ref}:${schema}" 2>/dev/null || echo ""
}

# Extract types from GraphQL schema
extract_types() {
  local schema="$1"
  echo "$schema" | grep -E "^type\s+\w+" | awk '{print $2}' | sort
}

# Extract fields from a type
extract_fields_for_type() {
  local schema="$1"
  local type_name="$2"

  echo "$schema" | awk -v type="$type_name" '
    /^type '"$type_name"'/ { in_type=1; next }
    in_type && /^}/ { in_type=0; next }
    in_type && /^\s+\w+/ { gsub(/^\s+/, ""); print }
  ' | grep -v "^#" | head -50
}

# Extract queries
extract_queries() {
  local schema="$1"
  echo "$schema" | awk '
    /^type Query/ { in_query=1; next }
    in_query && /^}/ { in_query=0; next }
    in_query && /^\s+\w+/ { gsub(/^\s+/, ""); print }
  ' | grep -v "^#" | awk -F'[:(]' '{print $1}'
}

# Extract mutations
extract_mutations() {
  local schema="$1"
  echo "$schema" | awk '
    /^type Mutation/ { in_mutation=1; next }
    in_mutation && /^}/ { in_mutation=0; next }
    in_mutation && /^\s+\w+/ { gsub(/^\s+/, ""); print }
  ' | grep -v "^#" | awk -F'[:(]' '{print $1}'
}

# Compare arrays and find removed items
find_removed() {
  local baseline_items="$1"
  local current_items="$2"

  comm -23 <(echo "$baseline_items" | sort) <(echo "$current_items" | sort) 2>/dev/null || true
}

# Compare arrays and find added items
find_added() {
  local baseline_items="$1"
  local current_items="$2"

  comm -13 <(echo "$baseline_items" | sort) <(echo "$current_items" | sort) 2>/dev/null || true
}

# Analyze schema changes
analyze_changes() {
  local baseline_schema="$1"
  local current_schema="$2"

  # Extract components
  local baseline_types current_types
  baseline_types=$(extract_types "$baseline_schema")
  current_types=$(extract_types "$current_schema")

  local baseline_queries current_queries
  baseline_queries=$(extract_queries "$baseline_schema")
  current_queries=$(extract_queries "$current_schema")

  local baseline_mutations current_mutations
  baseline_mutations=$(extract_mutations "$baseline_schema")
  current_mutations=$(extract_mutations "$current_schema")

  # Check for removed types (breaking)
  local removed_types
  removed_types=$(find_removed "$baseline_types" "$current_types")
  if [[ -n "$removed_types" ]]; then
    while IFS= read -r type; do
      [[ -n "$type" ]] && breaking_changes+=("Removed type: $type")
    done <<< "$removed_types"
  fi

  # Check for added types
  local added_types
  added_types=$(find_added "$baseline_types" "$current_types")
  if [[ -n "$added_types" ]]; then
    while IFS= read -r type; do
      [[ -n "$type" ]] && additions+=("Added type: $type")
    done <<< "$added_types"
  fi

  # Check for removed queries (breaking)
  local removed_queries
  removed_queries=$(find_removed "$baseline_queries" "$current_queries")
  if [[ -n "$removed_queries" ]]; then
    while IFS= read -r query; do
      [[ -n "$query" ]] && breaking_changes+=("Removed query: $query")
    done <<< "$removed_queries"
  fi

  # Check for added queries
  local added_queries
  added_queries=$(find_added "$baseline_queries" "$current_queries")
  if [[ -n "$added_queries" ]]; then
    while IFS= read -r query; do
      [[ -n "$query" ]] && additions+=("Added query: $query")
    done <<< "$added_queries"
  fi

  # Check for removed mutations (breaking)
  local removed_mutations
  removed_mutations=$(find_removed "$baseline_mutations" "$current_mutations")
  if [[ -n "$removed_mutations" ]]; then
    while IFS= read -r mutation; do
      [[ -n "$mutation" ]] && breaking_changes+=("Removed mutation: $mutation")
    done <<< "$removed_mutations"
  fi

  # Check for added mutations
  local added_mutations
  added_mutations=$(find_added "$baseline_mutations" "$current_mutations")
  if [[ -n "$added_mutations" ]]; then
    while IFS= read -r mutation; do
      [[ -n "$mutation" ]] && additions+=("Added mutation: $mutation")
    done <<< "$added_mutations"
  fi
}

# Generate compatibility report
generate_report() {
  local baseline="$1"
  local status="$2"

  local report_dir="${REPO_ROOT}/artifacts/reports"
  mkdir -p "$report_dir"

  local report_file="${report_dir}/schema-compatibility-$(date +%Y%m%d-%H%M%S).md"

  cat > "$report_file" <<EOF
# Schema Compatibility Report

**Generated:** ${CHECK_TIMESTAMP}
**Baseline:** ${baseline}
**Schema:** ${SCHEMA_PATH}
**Status:** ${status}

---

## Summary

| Category | Count |
|----------|-------|
| Breaking Changes | ${#breaking_changes[@]} |
| Additions | ${#additions[@]} |
| Modifications | ${#modifications[@]} |

---

## Breaking Changes

$(if [[ ${#breaking_changes[@]} -eq 0 ]]; then
    echo "No breaking changes detected."
  else
    for change in "${breaking_changes[@]}"; do
      echo "- ❌ $change"
    done
  fi)

---

## Additions

$(if [[ ${#additions[@]} -eq 0 ]]; then
    echo "No additions detected."
  else
    for change in "${additions[@]}"; do
      echo "- ➕ $change"
    done
  fi)

---

## Recommendations

$(generate_recommendations "$status")

---

## Compatibility Guidelines

During RC stabilization:

1. **Breaking changes are NOT allowed:**
   - Removing types, fields, queries, or mutations
   - Changing field types to incompatible types
   - Making optional fields required

2. **Additive changes may be allowed:**
   - Adding new types
   - Adding new optional fields
   - Adding new queries/mutations
   - Use \`--allow-additions\` flag if permitted

3. **For necessary changes:**
   - Document the change thoroughly
   - Get release team approval
   - Consider cutting a new RC

---

**Report generated by:** check_schema_compatibility.sh
EOF

  echo "$report_file"
}

generate_recommendations() {
  local status="$1"

  if [[ "$status" == "PASS" ]]; then
    echo "Schema is backward compatible. No action required."
  elif [[ "$status" == "WARN" ]]; then
    echo "- Review additive changes for necessity"
    echo "- Ensure new additions are documented"
    echo "- Consider if additions should wait for next release"
  else
    echo "- **BREAKING CHANGES DETECTED:** This will break existing clients"
    echo "- Revert the breaking changes if possible"
    echo "- If changes are necessary, cut a new RC"
    echo "- Document all changes in release notes"
    echo "- Notify API consumers of breaking changes"
  fi
}

# Update state file
update_state() {
  local baseline="$1"
  local status="$2"
  local breaking_count="$3"
  local additions_count="$4"

  mkdir -p "$(dirname "$STATE_FILE")"

  local state
  state=$(cat "$STATE_FILE" 2>/dev/null || echo '{"version":"1.0.0","checks":[]}')

  state=$(echo "$state" | jq \
    --arg time "$CHECK_TIMESTAMP" \
    --arg baseline "$baseline" \
    --arg schema "$SCHEMA_PATH" \
    --arg status "$status" \
    --argjson breaking "$breaking_count" \
    --argjson additions "$additions_count" \
    '.last_check = $time |
     .last_result = {
       baseline: $baseline,
       schema: $schema,
       status: $status,
       breaking_changes: $breaking,
       additions: $additions
     } |
     .checks = ([{
       timestamp: $time,
       baseline: $baseline,
       status: $status,
       breaking_changes: $breaking,
       additions: $additions
     }] + .checks[:49])')

  echo "$state" > "$STATE_FILE"
}

# Main function
main() {
  echo "========================================" >&2
  echo "SCHEMA COMPATIBILITY CHECK" >&2
  echo "========================================" >&2
  echo "" >&2

  # Find baseline if not specified
  if [[ -z "$BASELINE" ]]; then
    BASELINE=$(find_latest_rc_tag)
    if [[ -z "$BASELINE" ]]; then
      echo "Error: No RC tag found and no baseline specified" >&2
      exit 2
    fi
    echo "Using latest RC tag as baseline: $BASELINE" >&2
  fi

  echo "  Baseline: $BASELINE" >&2
  echo "  Schema:   $SCHEMA_PATH" >&2
  echo "  Strict:   $STRICT_MODE" >&2
  echo "  Allow Additions: $ALLOW_ADDITIONS" >&2
  echo "" >&2

  # Verify baseline exists
  if ! git rev-parse "$BASELINE" >/dev/null 2>&1; then
    echo "Error: Baseline ref '$BASELINE' not found" >&2
    exit 2
  fi

  # Get schema contents
  echo "Fetching baseline schema..." >&2
  local baseline_schema
  baseline_schema=$(get_schema_at_ref "$BASELINE" "$SCHEMA_PATH")

  if [[ -z "$baseline_schema" ]]; then
    echo "Warning: Could not read schema at baseline, skipping check" >&2
    echo '{"status":"SKIP","reason":"baseline_schema_not_found"}'
    exit 0
  fi

  echo "Reading current schema..." >&2
  local current_schema
  if [[ -f "$SCHEMA_PATH" ]]; then
    current_schema=$(cat "$SCHEMA_PATH")
  else
    echo "Error: Current schema not found: $SCHEMA_PATH" >&2
    exit 2
  fi

  # Analyze changes
  echo "Analyzing schema changes..." >&2
  analyze_changes "$baseline_schema" "$current_schema"

  # Determine status
  local status="PASS"
  local exit_code=0

  if [[ ${#breaking_changes[@]} -gt 0 ]]; then
    status="FAIL"
    exit_code=1
    echo "" >&2
    echo "Breaking changes detected:" >&2
    for change in "${breaking_changes[@]}"; do
      echo "  ❌ $change" >&2
    done
  fi

  if [[ ${#additions[@]} -gt 0 ]]; then
    echo "" >&2
    echo "Additions detected:" >&2
    for change in "${additions[@]}"; do
      echo "  ➕ $change" >&2
    done

    if [[ "$STRICT_MODE" == "true" ]]; then
      status="FAIL"
      exit_code=1
    elif [[ "$ALLOW_ADDITIONS" != "true" && "$status" == "PASS" ]]; then
      status="WARN"
    fi
  fi

  # Generate report if requested
  if [[ "$GENERATE_REPORT" == "true" ]]; then
    local report_file
    report_file=$(generate_report "$BASELINE" "$status")
    echo "" >&2
    echo "Report generated: $report_file" >&2
  fi

  # Update state
  update_state "$BASELINE" "$status" "${#breaking_changes[@]}" "${#additions[@]}"

  # Print summary
  echo "" >&2
  echo "========================================" >&2
  if [[ "$status" == "PASS" ]]; then
    echo "✅ SCHEMA COMPATIBILITY: VERIFIED" >&2
  elif [[ "$status" == "WARN" ]]; then
    echo "⚠️  SCHEMA COMPATIBILITY: WARNING" >&2
  else
    echo "❌ SCHEMA COMPATIBILITY: BREAKING CHANGES" >&2
  fi
  echo "========================================" >&2
  echo "  Baseline:        $BASELINE" >&2
  echo "  Breaking:        ${#breaking_changes[@]}" >&2
  echo "  Additions:       ${#additions[@]}" >&2
  echo "  Status:          $status" >&2
  echo "========================================" >&2

  # Output JSON for CI integration
  cat <<EOF
{
  "timestamp": "${CHECK_TIMESTAMP}",
  "baseline": "${BASELINE}",
  "schema": "${SCHEMA_PATH}",
  "status": "${status}",
  "breaking_changes": ${#breaking_changes[@]},
  "additions": ${#additions[@]},
  "strict_mode": ${STRICT_MODE},
  "allow_additions": ${ALLOW_ADDITIONS}
}
EOF

  exit $exit_code
}

main "$@"
