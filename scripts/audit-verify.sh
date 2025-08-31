#!/usr/bin/env bash
set -euo pipefail

# Conductor Audit Integrity Verifier
# Performs comprehensive verification of conductor audit trail integrity
# Validates hash chains, detects tampering, and generates compliance reports

# Configuration
AUDIT_PATH=${AUDIT_PATH:-./data/audit}
SERVER_URL=${SERVER_URL:-http://localhost:4000}
OUTPUT_DIR=${OUTPUT_DIR:-./reports/audit}
TIMEOUT=${TIMEOUT:-30}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging
say() { printf "\n${BLUE}== %s ==${NC}\n" "$*"; }
pass() { printf "${GREEN}✅ %s${NC}\n" "$*"; }
fail() { printf "${RED}❌ %s${NC}\n" "$*"; }
warn() { printf "${YELLOW}⚠️  %s${NC}\n" "$*"; }

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Test wrapper
run_test() {
    local test_name="$1"
    shift
    TESTS_RUN=$((TESTS_RUN + 1))
    
    if "$@"; then
        pass "$test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        fail "$test_name"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Individual test functions
test_audit_path_exists() {
    if [ -d "$AUDIT_PATH" ]; then
        return 0
    else
        warn "Audit path does not exist: $AUDIT_PATH"
        return 1
    fi
}

test_index_integrity() {
    local index_file="$AUDIT_PATH/index.json"
    
    if [ ! -f "$index_file" ]; then
        warn "Audit index file not found"
        return 1
    fi
    
    # Validate JSON structure
    if ! jq empty "$index_file" 2>/dev/null; then
        fail "Audit index file is corrupted (invalid JSON)"
        return 1
    fi
    
    # Check for required fields
    local required_fields=("id" "timestamp" "sequenceNumber" "hash")
    for field in "${required_fields[@]}"; do
        if ! jq -e ".[0] | has(\"$field\")" "$index_file" >/dev/null 2>&1; then
            fail "Audit index missing required field: $field"
            return 1
        fi
    done
    
    return 0
}

test_record_file_integrity() {
    local index_file="$AUDIT_PATH/index.json"
    local missing_files=0
    local corrupted_files=0
    
    if [ ! -f "$index_file" ]; then
        return 1
    fi
    
    # Check each record file exists and is valid
    while read -r record_id; do
        local record_file="$AUDIT_PATH/record-$record_id.json"
        local chain_file="$AUDIT_PATH/chain-$record_id.json"
        
        if [ ! -f "$record_file" ]; then
            ((missing_files++))
            continue
        fi
        
        if [ ! -f "$chain_file" ]; then
            ((missing_files++))
            continue
        fi
        
        # Validate JSON structure
        if ! jq empty "$record_file" 2>/dev/null; then
            ((corrupted_files++))
            continue
        fi
        
        if ! jq empty "$chain_file" 2>/dev/null; then
            ((corrupted_files++))
            continue
        fi
        
    done < <(jq -r '.[].id' "$index_file")
    
    if [ $missing_files -gt 0 ] || [ $corrupted_files -gt 0 ]; then
        fail "Found $missing_files missing files and $corrupted_files corrupted files"
        return 1
    fi
    
    return 0
}

test_hash_chain_continuity() {
    # Use Node.js to verify hash chain integrity
    local verification_script="
const { auditChainVerifier } = require('./dist/conductor/audit/chain-verifier.js');

(async () => {
  try {
    const report = await auditChainVerifier.verifyChainIntegrity();
    
    if (report.isValid) {
      console.log(\`PASS: Chain integrity verified (\${report.integrityPercentage}%)\`);
      process.exit(0);
    } else {
      console.log(\`FAIL: Chain integrity compromised (\${report.brokenChains} broken chains)\`);
      console.log(\`First corrupted: \${report.firstCorruptedRecord}\`);
      process.exit(1);
    }
  } catch (error) {
    console.log(\`ERROR: \${error.message}\`);
    process.exit(1);
  }
})();
"
    
    # Run verification via Node.js
    if echo "$verification_script" | node -; then
        return 0
    else
        return 1
    fi
}

test_sequence_number_continuity() {
    local index_file="$AUDIT_PATH/index.json"
    
    if [ ! -f "$index_file" ]; then
        return 1
    fi
    
    # Check sequence numbers are continuous
    local gaps=$(jq -r '
        sort_by(.sequenceNumber) |
        [.[].sequenceNumber] as $nums |
        [range(0; length-1)] |
        map(select($nums[.+1] != $nums[.] + 1)) |
        length
    ' "$index_file")
    
    if [ "$gaps" -gt 0 ]; then
        fail "Found $gaps gaps in sequence numbers"
        return 1
    fi
    
    return 0
}

test_timestamp_ordering() {
    local index_file="$AUDIT_PATH/index.json"
    
    if [ ! -f "$index_file" ]; then
        return 1
    fi
    
    # Check timestamps are in ascending order
    local out_of_order=$(jq -r '
        [.[].timestamp] as $timestamps |
        [range(0; length-1)] |
        map(select($timestamps[.+1] < $timestamps[.])) |
        length
    ' "$index_file")
    
    if [ "$out_of_order" -gt 0 ]; then
        fail "Found $out_of_order records with out-of-order timestamps"
        return 1
    fi
    
    return 0
}

test_conductor_api_audit_endpoint() {
    # Test conductor audit API endpoints
    local audit_health_url="$SERVER_URL/health/audit"
    
    if curl -fsS --max-time $TIMEOUT "$audit_health_url" >/dev/null 2>&1; then
        return 0
    else
        warn "Conductor audit health endpoint not accessible"
        return 1
    fi
}

# Generate compliance report
generate_compliance_report() {
    say "Generating compliance report..."
    
    mkdir -p "$OUTPUT_DIR"
    local report_file="$OUTPUT_DIR/audit-integrity-report-$(date +%Y%m%d-%H%M%S).json"
    
    # Gather audit statistics
    local total_records=0
    local date_range_start=""
    local date_range_end=""
    local index_file="$AUDIT_PATH/index.json"
    
    if [ -f "$index_file" ]; then
        total_records=$(jq length "$index_file")
        date_range_start=$(jq -r 'min_by(.timestamp) | .timestamp | strftime("%Y-%m-%d %H:%M:%S")' "$index_file" 2>/dev/null || echo "N/A")
        date_range_end=$(jq -r 'max_by(.timestamp) | .timestamp | strftime("%Y-%m-%d %H:%M:%S")' "$index_file" 2>/dev/null || echo "N/A")
    fi
    
    # Generate report
    cat > "$report_file" << EOF
{
  "audit_integrity_report": {
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "audit_path": "$AUDIT_PATH",
    "verification_results": {
      "tests_run": $TESTS_RUN,
      "tests_passed": $TESTS_PASSED,
      "tests_failed": $TESTS_FAILED,
      "success_rate": $(echo "scale=2; $TESTS_PASSED * 100 / $TESTS_RUN" | bc -l 2>/dev/null || echo "0")
    },
    "audit_statistics": {
      "total_records": $total_records,
      "date_range_start": "$date_range_start",
      "date_range_end": "$date_range_end"
    },
    "compliance_status": "$([ $TESTS_FAILED -eq 0 ] && echo "COMPLIANT" || echo "NON_COMPLIANT")",
    "recommendations": []
  }
}
EOF
    
    # Add recommendations based on test failures
    if [ $TESTS_FAILED -gt 0 ]; then
        local recommendations='[
          "Investigate failed integrity tests immediately",
          "Review audit trail for potential tampering",
          "Implement additional monitoring for audit chain",
          "Consider rotating audit chain secret if compromised"
        ]'
        
        jq ".audit_integrity_report.recommendations = $recommendations" "$report_file" > "${report_file}.tmp" && mv "${report_file}.tmp" "$report_file"
    fi
    
    printf "Report generated: %s\n" "$report_file"
    
    # Display summary
    cat << EOF

📊 Audit Integrity Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Records: $total_records
Date Range: $date_range_start → $date_range_end
Tests Run: $TESTS_RUN
Tests Passed: ${GREEN}$TESTS_PASSED${NC}
Tests Failed: ${RED}$TESTS_FAILED${NC}
Success Rate: $(echo "scale=1; $TESTS_PASSED * 100 / $TESTS_RUN" | bc -l 2>/dev/null || echo "0")%
Compliance: $([ $TESTS_FAILED -eq 0 ] && echo "${GREEN}COMPLIANT${NC}" || echo "${RED}NON_COMPLIANT${NC}")

EOF
}

# Export audit data for external verification
export_audit_data() {
    say "Exporting audit data for compliance..."
    
    mkdir -p "$OUTPUT_DIR"
    local export_file="$OUTPUT_DIR/audit-export-$(date +%Y%m%d-%H%M%S).tar.gz"
    
    # Create tamper-evident export
    tar -czf "$export_file" -C "$AUDIT_PATH" .
    
    # Generate checksums
    local checksum_file="${export_file}.sha256"
    sha256sum "$export_file" > "$checksum_file"
    
    printf "Audit data exported: %s\n" "$export_file"
    printf "Checksum file: %s\n" "$checksum_file"
}

# Performance benchmark
benchmark_verification_performance() {
    say "Benchmarking verification performance..."
    
    local start_time=$(date +%s%3N)
    
    # Run hash chain verification
    if test_hash_chain_continuity >/dev/null 2>&1; then
        local end_time=$(date +%s%3N)
        local duration=$((end_time - start_time))
        
        printf "Verification completed in ${duration}ms\n"
        
        # Performance thresholds
        if [ $duration -gt 5000 ]; then
            warn "Verification took longer than expected (${duration}ms > 5000ms)"
        else
            pass "Verification performance acceptable (${duration}ms)"
        fi
    else
        fail "Verification failed during benchmark"
    fi
}

# Main verification flow
main() {
    say "🔐 Conductor Audit Integrity Verifier"
    say "====================================="
    printf "Audit Path: %s\n" "$AUDIT_PATH"
    printf "Server URL: %s\n" "$SERVER_URL"
    printf "Output Directory: %s\n" "$OUTPUT_DIR"
    
    say "Audit Path Validation"
    run_test "Audit directory exists" test_audit_path_exists
    run_test "Index file integrity" test_index_integrity
    run_test "Record file integrity" test_record_file_integrity
    
    say "Hash Chain Verification"
    run_test "Hash chain continuity" test_hash_chain_continuity
    run_test "Sequence number continuity" test_sequence_number_continuity
    run_test "Timestamp ordering" test_timestamp_ordering
    
    say "API Integration"
    run_test "Conductor audit API" test_conductor_api_audit_endpoint
    
    say "Performance Testing"
    benchmark_verification_performance
    
    say "Compliance Reporting"
    generate_compliance_report
    
    if [ "${EXPORT_DATA:-false}" = "true" ]; then
        export_audit_data
    fi
    
    # Final result
    if [ $TESTS_FAILED -eq 0 ]; then
        say "🎉 All audit integrity tests passed!"
        printf "\n🔒 Audit trail integrity is verified and compliant.\n"
        printf "📋 Compliance report generated in: %s\n" "$OUTPUT_DIR"
        return 0
    else
        fail "Critical audit integrity issues detected"
        printf "\n🚨 Audit trail may be compromised or corrupted.\n"
        printf "📋 Investigation report generated in: %s\n" "$OUTPUT_DIR"
        return 1
    fi
}

# Show detailed help
if [ "${1:-}" = "--help" ]; then
    cat << EOF
Usage: $0 [options]

Conductor Audit Integrity Verifier

Options:
  --help          Show this help message
  --export-data   Export audit data for external verification
  --verbose       Enable verbose output
  
Environment Variables:
  AUDIT_PATH=/path/to/audit        Audit data directory
  SERVER_URL=http://localhost:4000 Conductor server URL
  OUTPUT_DIR=./reports/audit       Report output directory
  TIMEOUT=30                       Request timeout in seconds
  EXPORT_DATA=true                 Enable data export

Examples:
  # Basic verification
  ./scripts/audit-verify.sh
  
  # Export audit data
  EXPORT_DATA=true ./scripts/audit-verify.sh
  
  # Custom audit path
  AUDIT_PATH=/data/production-audit ./scripts/audit-verify.sh

EOF
    exit 0
fi

# Parse options
while [[ $# -gt 0 ]]; do
    case $1 in
        --export-data)
            export EXPORT_DATA=true
            shift
            ;;
        --verbose)
            set -x
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Verify prerequisites
for cmd in jq curl tar sha256sum bc; do
    if ! command -v $cmd >/dev/null 2>&1; then
        fail "Required command not found: $cmd"
        exit 1
    fi
done

# Run main verification
main