#!/usr/bin/env bash
# Validate OPA policies for agent governance

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
POLICIES_DIR="${SCRIPT_DIR}/../policies"

echo "🔍 Validating Agent Governance OPA Policies"
echo "============================================"

# Check if opa is installed
if ! command -v opa &> /dev/null; then
    echo "❌ OPA CLI not found. Install from: https://www.openpolicyagent.org/docs/latest/#1-download-opa"
    exit 1
fi

echo ""
echo "📋 Checking policy syntax..."
if opa check "${POLICIES_DIR}"/; then
    echo "✅ Policy syntax valid"
else
    echo "❌ Policy syntax errors found"
    exit 1
fi

echo ""
echo "🧪 Running policy tests..."
if opa test "${POLICIES_DIR}"/ -v; then
    echo "✅ All policy tests passed"
else
    echo "❌ Policy tests failed"
    exit 1
fi

echo ""
echo "📊 Policy coverage..."
opa test "${POLICIES_DIR}"/ --coverage --format=json | jq -r '.coverage'

echo ""
echo "🎉 All validations passed!"
