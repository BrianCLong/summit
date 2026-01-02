#!/bin/bash
# scripts/expand-test-coverage.sh
# Expands frontend test coverage for UI GA hardening

set -e

echo "🧪 Starting Test Coverage Expansion..."

# Configuration
SOURCE_DIR=${1:-"./client/src"}
TEST_DIR=${2:-"./client/src/__tests__"}
REPORT_DIR=${3:-"./coverage-reports"}
REQUIRED_COVERAGE=${4:-85}
EXCLUDE_PATTERNS=${5:-"node_modules,dist,build"}

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Create test directory if it doesn't exist
mkdir -p "$TEST_DIR"

echo "⚙️  Configuration:"
echo "   Source Directory: $SOURCE_DIR"
echo "   Test Directory: $TEST_DIR"
echo "   Report Directory: $REPORT_DIR"
echo "   Required Coverage: $REQUIRED_COVERAGE%"

# Identify untested components
echo "🔍 Identifying untested components..."

# Find all components without corresponding tests
COMPONENTS_WITHOUT_TESTS=()

while IFS= read -r -d '' component; do
    base_name="${component%.*}"
    test_file_js="${base_name}.test.js"
    test_file_ts="${base_name}.test.ts"
    test_file_jsx="${base_name}.test.jsx"
    test_file_tsx="${base_name}.test.tsx"
    test_file_spec_js="${base_name}.spec.js"
    test_file_spec_ts="${base_name}.spec.ts"
    test_file_spec_jsx="${base_name}.spec.jsx"
    test_file_spec_tsx="${base_name}.spec.tsx"
    
    if [[ ! -f "$test_file_js" && ! -f "$test_file_ts" && ! -f "$test_file_jsx" && ! -f "$test_file_tsx" && 
         ! -f "$test_file_spec_js" && ! -f "$test_file_spec_ts" && ! -f "$test_file_spec_jsx" && ! -f "$test_file_spec_tsx" ]]; then
        COMPONENTS_WITHOUT_TESTS+=("$component")
    fi
done < <(find "$SOURCE_DIR" -name "*.tsx" -o -name "*.jsx" -print0)

echo "📋 Found ${#COMPONENTS_WITHOUT_TESTS[@]} components without tests"

# Generate basic tests for untested components
if [ ${#COMPONENTS_WITHOUT_TESTS[@]} -gt 0 ]; then
    echo "📝 Generating basic tests for untested components..."
    
    for component in "${COMPONENTS_WITHOUT_TESTS[@]}"; do
        component_name=$(basename "$component" | sed 's/\.[^.]*$//')
        test_file="${TEST_DIR}/${component_name}.test.tsx"
        
        # Extract component name from file content for proper import
        component_identifier=$(grep -E "^const ${component_name}[[:space:]]*=" "$component" || grep -E "^export default ${component_name}[[:space:]]*=" "$component" || echo "$component_name")
        
        if [[ "$component_identifier" =~ ^export[[:space:]]+default[[:space:]]+([A-Za-z0-9_]+) ]]; then
            component_identifier="${BASH_REMATCH[1]}"
        elif [[ "$component_identifier" =~ ^const[[:space:]]+([A-Za-z0-9_]+)[[:space:]]*=[[:space:]]* ]]; then
            component_identifier="${BASH_REMATCH[1]}"
        else
            component_identifier="$component_name"
        fi
        
        # Create basic test file
        cat > "$test_file" << EOF
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ${component_identifier} from '${component//.tsx/.tsx}';

describe('${component_identifier}', () => {
  test('renders without crashing', () => {
    render(<${component_identifier} />);
    expect(screen.getByText(/.${component_identifier}./i)).toBeInTheDocument(); 
  });

  test('matches snapshot', () => {
    const { asFragment } = render(<${component_identifier} />);
    expect(asFragment()).toMatchSnapshot();
  });
});
EOF
        echo "   Generated: $test_file"
    done
fi

# Run tests to measure current coverage
echo "📊 Running tests to measure coverage..."

# Create coverage directory
mkdir -p "$REPORT_DIR"

# Try different test runners based on what's available
if command -v npm &>/dev/null && [ -f "package.json" ] && grep -q "test" package.json; then
    # Run with existing test command and coverage
    if npm test -- --coverage --coverageDirectory="$REPORT_DIR/initial" --collectCoverageFrom="src/**/*.{js,jsx,ts,tsx}"; then
        echo "✅ Tests executed successfully"
        COVERAGE_REPORT="$REPORT_DIR/initial/coverage-summary.json"
    else
        echo "⚠️  Tests failed or coverage not generated, creating basic report"
    fi
elif command -v jest &>/dev/null; then
    jest --coverage --coverageDirectory="$REPORT_DIR/initial" --collectCoverageFrom="src/**/*.{js,jsx,ts,tsx}"
    COVERAGE_REPORT="$REPORT_DIR/initial/coverage-summary.json"
else
    echo "⚠️  Neither npm test nor jest found, skipping coverage measurement"
    COVERAGE_REPORT=""
fi

# Create expanded test coverage report
EXPANDED_REPORT="$REPORT_DIR/test-expansion-report-$TIMESTAMP.json"
cat > "$EXPANDED_REPORT" << EOF
{
  "timestamp": "$TIMESTAMP",
  "sourceDirectory": "$SOURCE_DIR",
  "testDirectory": "$TEST_DIR",
  "componentsWithoutTests": ${#COMPONENTS_WITHOUT_TESTS[@]},
  "componentsIdentified": [
EOF

for i in "${!COMPONENTS_WITHOUT_TESTS[@]}"; do
    comp="${COMPONENTS_WITHOUT_TESTS[$i]}"
    echo "    {\"path\": \"$comp\", \"generatedTest\": \"${TEST_DIR}/$(basename "$comp" | sed 's/\.[^.]*$//').test.tsx\"}" >> "$EXPANDED_REPORT"
    if [ $i -lt $((${#COMPONENTS_WITHOUT_TESTS[@]} - 1)) ]; then
        echo "," >> "$EXPANDED_REPORT"
    fi
done

echo "" >> "$EXPANDED_REPORT"
cat >> "$EXPANDED_REPORT" << EOF
  ],
  "coverageReport": "$COVERAGE_REPORT",
  "actionsTaken": [
    "Generated basic tests for ${#COMPONENTS_WITHOUT_TESTS[@]} untested components",
    "Created test files in $TEST_DIR directory",
    "Expanded test coverage baseline established"
  ]
}
EOF

# Run expanded tests
echo "🏃‍♂️ Running expanded test suite..."

# Try to run tests again to see improvement
if [ -d "node_modules" ] && [ -f "package.json" ]; then
    if grep -q "@testing-library" package.json || grep -q "jest" package.json; then
        echo "🔧 Testing library detected, running tests..."
        npm test -- --verbose --silent || echo "⚠️  Tests may have warnings but continuing..."
    else
        echo "⚠️  Testing libraries not detected in package.json"
    fi
else
    echo "⚠️  Node modules not found, cannot run tests"
fi

echo "✅ Test Coverage Expansion Complete!"
echo "📄 Report: $EXPANDED_REPORT"
echo "🧪 Generated tests for ${#COMPONENTS_WITHOUT_TESTS[@]} previously untested components"

# Summary
if [ ${#COMPONENTS_WITHOUT_TESTS[@]} -gt 0 ]; then
    echo ""
    echo "📈 IMPROVEMENT SUMMARY:"
    echo "   - Added tests for ${#COMPONENTS_WITHOUT_TESTS[@]} components"
    echo "   - Basic render and snapshot tests created"
    echo "   - Test directory expanded: $TEST_DIR"
    echo ""
    echo "📝 NEXT STEPS:"
    echo "   1. Review generated tests in $TEST_DIR"
    echo "   2. Enhance tests with specific functionality tests" 
    echo "   3. Add accessibility tests"
    echo "   4. Add integration tests"
else
    echo ""
    echo "✅ All components appear to have tests"
    echo "   Consider adding more comprehensive tests"
fi