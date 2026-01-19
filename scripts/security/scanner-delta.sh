#!/usr/bin/env bash
# Security Scanner Delta Reporter
# Compares security scan results before and after changes

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPORT_DIR="${REPORT_DIR:-security-reports}"
BEFORE_FILE="${BEFORE_FILE:-$REPORT_DIR/before.json}"
AFTER_FILE="${AFTER_FILE:-$REPORT_DIR/after.json}"
OUTPUT_FILE="${OUTPUT_FILE:-$REPORT_DIR/delta-report.md}"

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

usage() {
  cat <<EOF
Usage: $0 [OPTIONS]

Compare security scan results before and after changes.

OPTIONS:
  --before FILE        Path to before scan results (JSON)
  --after FILE         Path to after scan results (JSON)
  --output FILE        Path to output report (markdown)
  --format FORMAT      Output format: markdown, json, or console (default: markdown)
  --fail-on-new        Exit with error code if new vulnerabilities found
  --help               Show this help message

EXAMPLES:
  # Compare dependency audits
  $0 --before audit-before.json --after audit-after.json

  # Compare code scanning results
  $0 --before codeql-before.json --after codeql-after.json --fail-on-new

ENVIRONMENT:
  REPORT_DIR          Directory for reports (default: security-reports)
  BEFORE_FILE         Before scan file (default: \$REPORT_DIR/before.json)
  AFTER_FILE          After scan file (default: \$REPORT_DIR/after.json)
  OUTPUT_FILE         Output report file (default: \$REPORT_DIR/delta-report.md)
EOF
}

# Parse command line arguments
FORMAT="markdown"
FAIL_ON_NEW=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --before)
      BEFORE_FILE="$2"
      shift 2
      ;;
    --after)
      AFTER_FILE="$2"
      shift 2
      ;;
    --output)
      OUTPUT_FILE="$2"
      shift 2
      ;;
    --format)
      FORMAT="$2"
      shift 2
      ;;
    --fail-on-new)
      FAIL_ON_NEW=true
      shift
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

# Validate files exist
if [[ ! -f "$BEFORE_FILE" ]]; then
  echo "Error: Before file not found: $BEFORE_FILE"
  exit 1
fi

if [[ ! -f "$AFTER_FILE" ]]; then
  echo "Error: After file not found: $AFTER_FILE"
  exit 1
fi

# Create output directory
mkdir -p "$(dirname "$OUTPUT_FILE")"

# Function to extract vulnerability IDs from JSON
extract_vuln_ids() {
  local file=$1
  # Handle different JSON structures (pnpm audit, codeql, dependabot)
  jq -r '
    if .advisories then
      .advisories | to_entries | .[] | "\(.value.id)|\(.value.severity)|\(.value.module_name)"
    elif .runs then
      .runs[].results[]? | "\(.ruleId)|\(.level)|\(.locations[0].physicalLocation.artifactLocation.uri)"
    elif type == "array" then
      .[] | "\(.id // .rule.id)|\(.severity // .rule.severity)|\(.dependency.package.name // .location.path)"
    else
      empty
    end
  ' "$file" 2>/dev/null || echo ""
}

# Extract vulnerability data
BEFORE_VULNS=$(extract_vuln_ids "$BEFORE_FILE")
AFTER_VULNS=$(extract_vuln_ids "$AFTER_FILE")

# Calculate deltas
NEW_VULNS=$(comm -13 <(echo "$BEFORE_VULNS" | sort) <(echo "$AFTER_VULNS" | sort))
FIXED_VULNS=$(comm -23 <(echo "$BEFORE_VULNS" | sort) <(echo "$AFTER_VULNS" | sort))
REMAINING_VULNS=$(comm -12 <(echo "$BEFORE_VULNS" | sort) <(echo "$AFTER_VULNS" | sort))

# Count by severity
count_by_severity() {
  local vulns=$1
  local severity=$2
  echo "$vulns" | grep -i "|${severity}|" | wc -l | tr -d ' '
}

BEFORE_TOTAL=$(echo "$BEFORE_VULNS" | grep -v '^$' | wc -l | tr -d ' ')
AFTER_TOTAL=$(echo "$AFTER_VULNS" | grep -v '^$' | wc -l | tr -d ' ')
NEW_TOTAL=$(echo "$NEW_VULNS" | grep -v '^$' | wc -l | tr -d ' ')
FIXED_TOTAL=$(echo "$FIXED_VULNS" | grep -v '^$' | wc -l | tr -d ' ')

NEW_CRITICAL=$(count_by_severity "$NEW_VULNS" "critical")
NEW_HIGH=$(count_by_severity "$NEW_VULNS" "high")
NEW_MEDIUM=$(count_by_severity "$NEW_VULNS" "medium")
NEW_LOW=$(count_by_severity "$NEW_VULNS" "low")

FIXED_CRITICAL=$(count_by_severity "$FIXED_VULNS" "critical")
FIXED_HIGH=$(count_by_severity "$FIXED_VULNS" "high")
FIXED_MEDIUM=$(count_by_severity "$FIXED_VULNS" "medium")
FIXED_LOW=$(count_by_severity "$FIXED_VULNS" "low")

# Generate report based on format
generate_markdown_report() {
  cat > "$OUTPUT_FILE" <<EOF
# Security Scanner Delta Report

**Generated**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")

## Summary

| Metric              | Before | After | Delta |
| ------------------- | -----: | ----: | ----: |
| **Total Alerts**    | $BEFORE_TOTAL | $AFTER_TOTAL | $(( AFTER_TOTAL - BEFORE_TOTAL )) |
| **New Alerts**      |      - |     - | $NEW_TOTAL |
| **Fixed Alerts**    |      - |     - | $FIXED_TOTAL |

### Severity Breakdown (New Alerts)

| Severity   | Count |
| ---------- | ----: |
| Critical   | $NEW_CRITICAL |
| High       | $NEW_HIGH |
| Medium     | $NEW_MEDIUM |
| Low        | $NEW_LOW |

### Severity Breakdown (Fixed Alerts)

| Severity   | Count |
| ---------- | ----: |
| Critical   | $FIXED_CRITICAL |
| High       | $FIXED_HIGH |
| Medium     | $FIXED_MEDIUM |
| Low        | $FIXED_LOW |

---

## New Vulnerabilities

EOF

  if [[ -z "$NEW_VULNS" ]] || [[ "$NEW_TOTAL" -eq 0 ]]; then
    echo "✅ No new vulnerabilities introduced!" >> "$OUTPUT_FILE"
  else
    echo "$NEW_VULNS" | while IFS='|' read -r id severity location; do
      if [[ -n "$id" ]]; then
        echo "- **[$severity]** \`$id\` in \`$location\`" >> "$OUTPUT_FILE"
      fi
    done
  fi

  cat >> "$OUTPUT_FILE" <<EOF

---

## Fixed Vulnerabilities

EOF

  if [[ -z "$FIXED_VULNS" ]] || [[ "$FIXED_TOTAL" -eq 0 ]]; then
    echo "⚠️ No vulnerabilities fixed in this change." >> "$OUTPUT_FILE"
  else
    echo "$FIXED_VULNS" | while IFS='|' read -r id severity location; do
      if [[ -n "$id" ]]; then
        echo "- **[$severity]** \`$id\` in \`$location\`" >> "$OUTPUT_FILE"
      fi
    done
  fi

  cat >> "$OUTPUT_FILE" <<EOF

---

## Analysis

EOF

  if [[ "$NEW_TOTAL" -gt 0 ]]; then
    echo "⚠️ **Action Required**: $NEW_TOTAL new vulnerability(ies) introduced." >> "$OUTPUT_FILE"
    if [[ "$NEW_CRITICAL" -gt 0 ]] || [[ "$NEW_HIGH" -gt 0 ]]; then
      echo "" >> "$OUTPUT_FILE"
      echo "🚨 **Critical/High Severity**: Immediate remediation required." >> "$OUTPUT_FILE"
    fi
  elif [[ "$FIXED_TOTAL" -gt 0 ]]; then
    echo "✅ **Improvement**: Fixed $FIXED_TOTAL vulnerability(ies) with no new issues." >> "$OUTPUT_FILE"
  else
    echo "ℹ️ **No Change**: Security posture unchanged." >> "$OUTPUT_FILE"
  fi

  cat >> "$OUTPUT_FILE" <<EOF

---

## Files Compared

- **Before**: \`$BEFORE_FILE\`
- **After**: \`$AFTER_FILE\`

---

## Next Steps

EOF

  if [[ "$NEW_TOTAL" -gt 0 ]]; then
    cat >> "$OUTPUT_FILE" <<EOF
1. Review each new vulnerability for exploitability
2. Prioritize Critical/High severity issues
3. Follow triage process in \`scripts/security/triage.md\`
4. Document any risk acceptances with justification
EOF
  else
    cat >> "$OUTPUT_FILE" <<EOF
No action required - security posture improved or unchanged.
EOF
  fi
}

generate_json_report() {
  jq -n \
    --arg before "$BEFORE_TOTAL" \
    --arg after "$AFTER_TOTAL" \
    --arg new "$NEW_TOTAL" \
    --arg fixed "$FIXED_TOTAL" \
    --arg new_critical "$NEW_CRITICAL" \
    --arg new_high "$NEW_HIGH" \
    --arg new_medium "$NEW_MEDIUM" \
    --arg new_low "$NEW_LOW" \
    --arg fixed_critical "$FIXED_CRITICAL" \
    --arg fixed_high "$FIXED_HIGH" \
    --arg fixed_medium "$FIXED_MEDIUM" \
    --arg fixed_low "$FIXED_LOW" \
    '{
      "summary": {
        "before": $before,
        "after": $after,
        "new": $new,
        "fixed": $fixed
      },
      "new_by_severity": {
        "critical": $new_critical,
        "high": $new_high,
        "medium": $new_medium,
        "low": $new_low
      },
      "fixed_by_severity": {
        "critical": $fixed_critical,
        "high": $fixed_high,
        "medium": $fixed_medium,
        "low": $fixed_low
      }
    }' > "$OUTPUT_FILE"
}

generate_console_report() {
  echo ""
  echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}        Security Scanner Delta Report${NC}"
  echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
  echo ""
  echo "Summary:"
  echo "  Before:  $BEFORE_TOTAL alerts"
  echo "  After:   $AFTER_TOTAL alerts"
  echo "  Delta:   $(( AFTER_TOTAL - BEFORE_TOTAL ))"
  echo ""
  echo -e "${YELLOW}New Alerts:${NC}"
  echo "  Critical: $NEW_CRITICAL  High: $NEW_HIGH  Medium: $NEW_MEDIUM  Low: $NEW_LOW"
  echo ""
  echo -e "${GREEN}Fixed Alerts:${NC}"
  echo "  Critical: $FIXED_CRITICAL  High: $FIXED_HIGH  Medium: $FIXED_MEDIUM  Low: $FIXED_LOW"
  echo ""

  if [[ "$NEW_TOTAL" -gt 0 ]]; then
    echo -e "${RED}⚠️  $NEW_TOTAL new vulnerability(ies) introduced${NC}"
  elif [[ "$FIXED_TOTAL" -gt 0 ]]; then
    echo -e "${GREEN}✅ Fixed $FIXED_TOTAL vulnerability(ies)${NC}"
  else
    echo "ℹ️  No change in security posture"
  fi
  echo ""
}

# Generate report
case "$FORMAT" in
  markdown)
    generate_markdown_report
    echo "Report generated: $OUTPUT_FILE"
    ;;
  json)
    generate_json_report
    echo "JSON report generated: $OUTPUT_FILE"
    ;;
  console)
    generate_console_report
    ;;
  *)
    echo "Error: Unknown format: $FORMAT"
    exit 1
    ;;
esac

# Exit with error if new vulnerabilities found and --fail-on-new is set
if [[ "$FAIL_ON_NEW" == "true" ]] && [[ "$NEW_TOTAL" -gt 0 ]]; then
  echo "Error: $NEW_TOTAL new vulnerability(ies) found"
  exit 1
fi

exit 0
