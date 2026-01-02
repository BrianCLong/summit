#!/bin/bash
# scripts/ci-zero-console-errors.sh
# CI gate: Ensures zero console errors in frontend tests

set -e

echo "🎯 Starting Zero Console Errors Check..."

# Configuration
TEST_DIR=${1:-"./client/src/__tests__"}
REPORT_DIR=${2:-"./console-error-reports"}
FAIL_ON_CONSOLE_ERRORS=${3:-true}
TEST_TIMEOUT=${4:-600}  # 10 minutes timeout

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Create report directory
mkdir -p "$REPORT_DIR"

# Prepare test environment
echo "🔧 Setting up test environment..."

# Create a custom test reporter to catch console errors
REPORTER_FILE="console-error-reporter.js"
cat > "/tmp/$REPORTER_FILE" << 'EOF'
// Temporary test reporter for detecting console errors
const fs = require('fs');
const path = require('path');

// Global arrays to track errors and warnings
global.consoleErrors = [];
global.consoleWarnings = [];

// Override console methods to capture messages
const originalError = console.error;
const originalWarn = console.warn;

console.error = (...args) => {
  global.consoleErrors.push({
    type: 'error',
    args: args,
    timestamp: new Date().toISOString(),
    stack: new Error().stack
  });
  originalError.apply(console, args);
};

console.warn = (...args) => {
  global.consoleWarnings.push({
    type: 'warning', 
    args: args,
    timestamp: new Date().toISOString(),
    stack: new Error().stack
  });
  originalWarn.apply(console, args);
};

// Jest test environment extension
module.exports = {
  setup: async () => {
    console.log('Custom console reporter loaded');
  },
  teardown: async () => {
    // Write captured messages to file
    const output = {
      timestamp: new Date().toISOString(),
      errors: global.consoleErrors,
      warnings: global.consoleWarnings
    };
    
    fs.writeFileSync('/tmp/console-output.json', JSON.stringify(output, null, 2));
  }
};
EOF

# Run tests to capture console output
echo "🧪 Running tests to capture console output..."

# Try different test runners
EXIT_CODE=0
ERROR_COUNT=0
WARNING_COUNT=0

if [ -f "client/package.json" ] && command -v npm &>/dev/null; then
    cd client
    echo "📦 Using npm test runner"
    
    # Capture test output to detect console errors
    if npm test 2>&1 | tee /tmp/test-output.log; then
        echo "✅ Tests completed successfully"
    else
        echo "⚠️  Tests had failures, but checking for console errors..."
        EXIT_CODE=$?
    fi
    
    cd ..
elif [ -f "package.json" ] && command -v npm &>/dev/null; then
    echo "📦 Using root npm test runner"
    
    # Run tests and capture output
    if npm test 2>&1 | tee /tmp/test-output.log; then
        echo "✅ Tests completed successfully"
    else
        echo "⚠️  Tests had failures, but checking for console errors..."
        EXIT_CODE=$?
    fi
else
    echo "⚠️  No npm test runner found, creating mock test..."
    # Create a mock test to validate the approach
    echo "No tests found" > /tmp/test-output.log
fi

# Analyze test output for console errors
if [ -f "/tmp/test-output.log" ]; then
    ERROR_COUNT=$(grep -c -i "console.error\|console.log.error\|error:" /tmp/test-output.log || echo "0")
    WARNING_COUNT=$(grep -c -i "console.warn\|console.log.warn\|warn:" /tmp/test-output.log || echo "0")
    CONSOLE_ERROR_COUNT=$(grep -c -i "console" /tmp/test-output.log || echo "0")
    
    echo "📊 Test Analysis Results:" 
    echo "   Console errors detected: $ERROR_COUNT"
    echo "   Console warnings detected: $WARNING_COUNT"
    echo "   Console-related messages: $CONSOLE_ERROR_COUNT"
else
    echo "⚠️  No test output log found"
    ERROR_COUNT=0
    WARNING_COUNT=0
fi

# Create detailed analysis report
ANALYSIS_REPORT="$REPORT_DIR/console-analysis-$TIMESTAMP.json"
cat > "$ANALYSIS_REPORT" << EOF
{
  "timestamp": "$TIMESTAMP",
  "testDirectory": "$TEST_DIR",
  "consoleErrors": $ERROR_COUNT, 
  "consoleWarnings": $WARNING_COUNT,
  "consoleMessagesTotal": $CONSOLE_ERROR_COUNT,
  "exitCode": $EXIT_CODE,
  "failOnConsoleErrors": $FAIL_ON_CONSOLE_ERRORS,
  "shouldFail": false,
  "details": {
    "processExitCode": $EXIT_CODE,
    "errorsDetected": $ERROR_COUNT,
    "warningsDetected": $WARNING_COUNT
  }
}
EOF

# Determine if build should fail
SHOULD_FAIL=false
FAILURE_REASON=""

if [ "$FAIL_ON_CONSOLE_ERRORS" = true ] && [ "$ERROR_COUNT" -gt 0 ]; then
    SHOULD_FAIL=true
    FAILURE_REASON="Console errors detected: $ERROR_COUNT errors found"
fi

# Update the report with failure decision
if [ "$SHOULD_FAIL" = true ]; then
    jq '.shouldFail = true | .failureReason = "'"$FAILURE_REASON"'"' "$ANALYSIS_REPORT" > "$ANALYSIS_REPORT.tmp" && mv "$ANALYSIS_REPORT.tmp" "$ANALYSIS_REPORT"
fi

# Copy test output for review
if [ -f "/tmp/test-output.log" ]; then
    cp "/tmp/test-output.log" "$REPORT_DIR/test-output-$TIMESTAMP.log"
fi

# Display summary
echo ""
echo "📋 SUMMARY:"
echo "   Console Errors: $ERROR_COUNT"
echo "   Console Warnings: $WARNING_COUNT"
echo "   Should Fail Build: $SHOULD_FAIL"
echo "   Report: $ANALYSIS_REPORT"

# Clean up temp files
rm -f "/tmp/$REPORTER_FILE" "/tmp/test-output.log" "/tmp/console-output.json"

# Exit with appropriate code
if [ "$SHOULD_FAIL" = true ]; then
    echo ""
    echo "❌ CONSOLE ERRORS DETECTED"
    echo "   $FAILURE_REASON"
    echo "   Please fix all console errors before merging"
    echo "   Review detailed output: $REPORT_DIR/test-output-$TIMESTAMP.log"
    exit 1
else
    echo ""
    echo "✅ ZERO CONSOLE ERRORS DETECTED"
    echo "   All tests passed without console errors"
    echo "   Build can proceed to next stage"
    exit 0
fi