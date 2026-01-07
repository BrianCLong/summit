#!/bin/bash
# Vulnerability Scanning Script for Summit Platform
# Uses grype to scan for vulnerabilities and enforces security gates

set -e

echo "🔍 Starting Vulnerability Scanning Process..."

# Configuration
TARGET=${1:-"."}
OUTPUT_DIR=${2:-"./vulnerability-reports"}
FAIL_ON_CRITICAL=${3:-true}
FAIL_ON_HIGH=${4:-false}
REPORT_FORMAT=${5:-"json"}

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Validate required tools
if ! command -v grype &> /dev/null; then
    echo "❌ grype is required but not installed."
    echo "Please install grype from https://github.com/anchore/grype"
    exit 1
fi

# Use timestamp format without colons (GitHub artifacts don't allow : in filenames)
TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
REPORT_FILE="$OUTPUT_DIR/vulnerability-report-${TIMESTAMP}.${REPORT_FORMAT}"
MATCHES_FILE="$OUTPUT_DIR/vulnerability-matches-${TIMESTAMP}.json"

echo "📦 Scanning target: $TARGET"

# Run grype scan
grype "$TARGET" -o "$REPORT_FORMAT" --file "$REPORT_FILE"

# Also output detailed matches to JSON for processing
grype "$TARGET" -o json --file "$MATCHES_FILE"

# Parse results to check for critical/high vulnerabilities
CRITICAL_COUNT=$(jq -r '.matches | map(select(.vulnerability.severity == "Critical")) | length' "$MATCHES_FILE" 2>/dev/null || echo "0")
HIGH_COUNT=$(jq -r '.matches | map(select(.vulnerability.severity == "High")) | length' "$MATCHES_FILE" 2>/dev/null || echo "0")
MEDIUM_COUNT=$(jq -r '.matches | map(select(.vulnerability.severity == "Medium")) | length' "$MATCHES_FILE" 2>/dev/null || echo "0")
LOW_COUNT=$(jq -r '.matches | map(select(.vulnerability.severity == "Low")) | length' "$MATCHES_FILE" 2>/dev/null || echo "0")

echo "📊 Scan Results:"
echo "   Critical: $CRITICAL_COUNT"
echo "   High:     $HIGH_COUNT" 
echo "   Medium:   $MEDIUM_COUNT"
echo "   Low:      $LOW_COUNT"

# Create summary report
cat > "$OUTPUT_DIR/vulnerability-summary-${TIMESTAMP}.json" << EOF
{
  "scanTimestamp": "$TIMESTAMP",
  "target": "$TARGET",
  "results": {
    "critical": $CRITICAL_COUNT,
    "high": $HIGH_COUNT,
    "medium": $MEDIUM_COUNT,
    "low": $LOW_COUNT
  },
  "failOnCritical": $FAIL_ON_CRITICAL,
  "failOnHigh": $FAIL_ON_HIGH,
  "shouldFail": false
}
EOF

# Check if we should fail based on thresholds
SHOULD_FAIL=false
FAILURE_REASON=""

if [ "$FAIL_ON_CRITICAL" = true ] && [ "$CRITICAL_COUNT" -gt 0 ]; then
    SHOULD_FAIL=true
    FAILURE_REASON="Critical vulnerabilities found: $CRITICAL_COUNT"
fi

if [ "$FAIL_ON_HIGH" = true ] && [ "$HIGH_COUNT" -gt 0 ]; then
    SHOULD_FAIL=true
    FAILURE_REASON="High vulnerabilities found: $HIGH_COUNT"
fi

# Update summary with failure decision
jq --arg fail_reason "$FAILURE_REASON" '.shouldFail = true | .failureReason = $fail_reason' "$OUTPUT_DIR/vulnerability-summary-${TIMESTAMP}.json" > "$OUTPUT_DIR/vulnerability-summary-${TIMESTAMP}.tmp" && mv "$OUTPUT_DIR/vulnerability-summary-${TIMESTAMP}.tmp" "$OUTPUT_DIR/vulnerability-summary-${TIMESTAMP}.json"

# Exit with appropriate code based on results
if [ "$SHOULD_FAIL" = true ]; then
    echo "❌ Vulnerability scan FAILED: $FAILURE_REASON"
    echo "📄 Detailed report: $REPORT_FILE"
    echo "📄 All matches: $MATCHES_FILE"
    exit 1
else
    echo "✅ Vulnerability scan PASSED"
    echo "📄 Detailed report: $REPORT_FILE"
    echo "📄 All matches: $MATCHES_FILE"
    exit 0
fi