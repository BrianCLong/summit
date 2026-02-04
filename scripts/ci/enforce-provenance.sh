#!/bin/bash
set -euo pipefail

# Provenance Enforcement Gate
# Enforces SLSA, SBOM, and Signing policies using OPA

POLICY_DIR="policy"
INPUT_FILE=${1:-"evidence/provenance-input.json"}

if [ ! -f "$INPUT_FILE" ]; then
    echo "❌ Error: Input file $INPUT_FILE not found."
    echo "Provenance input is required for validation."
    exit 1
fi

echo "🧐 Evaluating supply chain policies against $INPUT_FILE..."

# Check if OPA is installed
if ! command -v opa &> /dev/null; then
    echo "Installing OPA..."
    curl -L -o opa https://openpolicyagent.org/downloads/v0.61.0/opa_linux_amd64_static
    chmod +x opa
    OPA="./opa"
else
    OPA="opa"
fi

# Run OPA evaluation
# We evaluate the 'supply_chain' package which contains all deny/warn rules
RESULT=$($OPA eval -i "$INPUT_FILE" -d "$POLICY_DIR/supply_chain.rego" "data.supply_chain.deny" --format json)

# Parse errors from result
ERRORS=$(echo "$RESULT" | jq -r '.result[0].expressions[0].value[]')

if [ -n "$ERRORS" ]; then
    echo "❌ PROVENANCE GATE FAILED"
    echo "The following violations were detected:"
    echo "$ERRORS" | sed 's/^/  - /'
    exit 1
fi

echo "✅ PROVENANCE GATE PASSED"
exit 0
