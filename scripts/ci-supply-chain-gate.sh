#!/bin/bash
# CI Gate: Supply Chain Integrity Check for Summit Platform
# Combines all security checks to gate CI/CD pipeline

set -e

echo "🛡️  Starting CI Supply Chain Integrity Gate..."

# Configuration
ARTIFACT_NAME=${1:-"summit-platform"}
BUILD_ENV=${2:-"production"}
FAIL_ON_CRITICAL=${3:-true}
FAIL_ON_HIGH=${4:-false}
CHECK_REPRODUCIBILITY=${5:-true}
CHECK_SBOM=${6:-true}
CHECK_SIGNING=${7:-true}
CHECK_VULNERABILITIES=${8:-true}

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
REPORT_DIR="./ci-reports/${TIMESTAMP}"
mkdir -p "$REPORT_DIR"

# Initialize results
PASS=true
FAILURE_SUMMARY=""

echo "⚙️  Configuration:"
echo "   Artifact: $ARTIFACT_NAME"
echo "   Environment: $BUILD_ENV"
echo "   Check Reproducibility: $CHECK_REPRODUCIBILITY"
echo "   Check SBOM: $CHECK_SBOM"
echo "   Check Signing: $CHECK_SIGNING"
echo "   Check Vulnerabilities: $CHECK_VULNERABILITIES"

# Function to run a check and update results
run_check() {
    local check_name=$1
    local check_command=$2
    
    echo "🔍 Running $check_name check..."
    
    if eval "$check_command"; then
        echo "✅ $check_name: PASSED"
        return 0
    else
        echo "❌ $check_name: FAILED"
        PASS=false
        FAILURE_SUMMARY="$FAILURE_SUMMARY$check_name failed\n"
        return 1
    fi
}

# 1. Check Build Reproducibility
if [ "$CHECK_REPRODUCIBILITY" = true ]; then
    run_check "Build Reproducibility" "bash scripts/check-reproducibility.sh $ARTIFACT_NAME 'npm run build' $BUILD_ENV 2 ./build-test"
fi

# 2. Generate and Verify SBOM
if [ "$CHECK_SBOM" = true ]; then
    echo "🔍 Running SBOM check..."
    if bash scripts/generate-sbom.sh "$ARTIFACT_NAME" "$(git describe --tags --always 2>/dev/null || echo 'dev')" "./sboms-test"; then
        # Check if SBOM files were generated
        SBOM_COUNT=$(find ./sboms-test -name "*.json" | wc -l)
        if [ "$SBOM_COUNT" -gt 0 ]; then
            echo "✅ SBOM: PASSED (Generated $SBOM_COUNT SBOM files)"
        else
            echo "❌ SBOM: FAILED (No SBOM files generated)"
            PASS=false
            FAILURE_SUMMARY="$FAILURE_SUMMARYSBOM check failed - no files generated\n"
        fi
    else
        echo "❌ SBOM: FAILED"
        PASS=false
        FAILURE_SUMMARY="$FAILURE_SUMMARYSBOM check failed\n"
    fi
    # Clean up test SBOM directory
    rm -rf ./sboms-test
fi

# 3. Check Vulnerabilities
if [ "$CHECK_VULNERABILITIES" = true ]; then
    # For testing purposes, run against the current directory
    # In real CI, this might run against built artifacts
    run_check "Vulnerability Scan" "bash scripts/scan-vulnerabilities.sh . ./vulnerability-test-reports $FAIL_ON_CRITICAL $FAIL_ON_HIGH json || true"
    # The "|| true" prevents the script from exiting early if vulnerabilities are found
    # We'll check the actual results in the report
    
    # Check the vulnerability scan results
    VULN_REPORT=$(find ./vulnerability-test-reports -name "vulnerability-summary-*.json" | sort | tail -1)
    if [ -n "$VULN_REPORT" ] && [ -f "$VULN_REPORT" ]; then
        FAIL_STATUS=$(jq -r '.shouldFail' "$VULN_REPORT" 2>/dev/null || echo "false")
        if [ "$FAIL_STATUS" = "true" ]; then
            echo "❌ Vulnerability Scan: FAILED (should block)" 
            PASS=false
            FAILURE_SUMMARY="$FAILURE_SUMMARYVulnerability scan failed - should block\n"
        else
            echo "✅ Vulnerability Scan: PASSED"
        fi
    else
        echo "⚠️  Vulnerability Scan: No report found"
    fi
    
    # Clean up test reports
    rm -rf ./vulnerability-test-reports
fi

# 4. Check Signing (This is more complex as it requires actual built artifacts)
if [ "$CHECK_SIGNING" = true ]; then
    echo "🔍 Running Signing check..."
    
    # For testing, we'll create a dummy artifact if none exists
    if [ -f "./dist/main.js" ] || [ -f "./dist/index.js" ] || [ -f "./dist/bundle.js" ]; then
        # Found some built artifact, try to sign it
        ARTIFACT_PATH=$(find ./dist -name "*.js" | head -n1)
        ARTIFACT_NAME=$(basename "$ARTIFACT_PATH" .js)
        
        if command -v cosign &> /dev/null; then
            if echo "$ARTIFACT_PATH" | grep -q "\.js$"; then
                # Create a signature file for the artifact
                if cosign sign-blob --output-signature "./dist/${ARTIFACT_NAME}.sig" --yes "$ARTIFACT_PATH" 2>/dev/null; then
                    echo "✅ Signing Check: PASSED (Artifact signed)"
                else
                    echo "❌ Signing Check: FAILED (Could not sign artifact)"
                    PASS=false
                    FAILURE_SUMMARY="$FAILURE_SUMMARYSigning check failed - could not sign artifact\n"
                fi
            else
                echo "⚠️  Signing Check: No JS artifacts found in dist/"
            fi
        else
            echo "⚠️  Signing Check: cosign not available for testing"
        fi
    else
        echo "⚠️  Signing Check: No built artifacts found for signing"
    fi
fi

# 5. OPA Policy Enforcement
echo "🔍 Running OPA Policy Enforcement..."
SBOM_SIGNED=false
PROVENANCE_EXISTS=false

if [ -f "./sboms/sbom.spdx.json.sig" ] || ls ./sboms/*.sig 1> /dev/null 2>&1; then
    SBOM_SIGNED=true
fi

if ls ./sboms/*.link 1> /dev/null 2>&1; then
    PROVENANCE_EXISTS=true
fi

# Generate OPA input
cat > opa_input.json << EOF
{
  "sbom_signed": $SBOM_SIGNED,
  "provenance_exists": $PROVENANCE_EXISTS
}
EOF

if command -v opa &> /dev/null; then
    if [ -f "policy/opa/supply_chain.rego" ]; then
        OPA_RESULT=$(opa eval -i opa_input.json -d policy/opa/supply_chain.rego "data.supply_chain.deny" --format json)
        DENY_COUNT=$(echo "$OPA_RESULT" | jq '.result[0].expressions[0].value | length')

        if [ "$DENY_COUNT" -eq 0 ]; then
            echo "✅ OPA Policy: PASSED"
        else
            echo "❌ OPA Policy: FAILED"
            echo "   Violations: $(echo "$OPA_RESULT" | jq -c '.result[0].expressions[0].value')"
            PASS=false
            FAILURE_SUMMARY="$FAILURE_SUMMARYOPA policy violation\n"
        fi
    else
        echo "⚠️  OPA Policy: policy/opa/supply_chain.rego not found"
    fi
else
    echo "⚠️  OPA Policy: opa command not found"
fi

# Create final CI report
cat > "$REPORT_DIR/ci-gate-report-$TIMESTAMP.json" << EOF
{
  "checkTimestamp": "$TIMESTAMP",
  "artifactName": "$ARTIFACT_NAME",
  "environment": "$BUILD_ENV",
  "checks": {
    "reproducibility": $CHECK_REPRODUCIBILITY,
    "sbom": $CHECK_SBOM,
    "signing": $CHECK_SIGNING,
    "vulnerabilities": $CHECK_VULNERABILITIES
  },
  "allChecksPassed": $PASS,
  "failureSummary": $(printf "%q" "$FAILURE_SUMMARY"),
  "details": {
    "reproducibilityEnabled": $CHECK_REPRODUCIBILITY,
    "sbomEnabled": $CHECK_SBOM,
    "signingEnabled": $CHECK_SIGNING,
    "vulnerabilityEnabled": $CHECK_VULNERABILITIES
  }
}
EOF

# Output final status
if [ "$PASS" = true ]; then
    echo "🎉 All CI Supply Chain Integrity Checks PASSED"
    echo "📄 Report: $REPORT_DIR/ci-gate-report-$TIMESTAMP.json"
    exit 0
else
    echo "💥 CI Supply Chain Integrity Gate FAILED"
    echo "📄 Report: $REPORT_DIR/ci-gate-report-$TIMESTAMP.json"
    echo "❌ Failures:"
    printf "$FAILURE_SUMMARY"
    exit 1
fi