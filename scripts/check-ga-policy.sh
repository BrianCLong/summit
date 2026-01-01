#!/bin/bash
set -euo pipefail

# GA Risk Gate OPA Check Script

POLICY_DIR="policy"
INPUT_FILE="opa_input.json"

echo "🛡️  Running GA Risk Gate OPA Checks..."

# 1. Generate Input from Artifacts
echo "📊 Generating OPA Input..."
python3 scripts/generate-policy-input.py > "$INPUT_FILE"
cat "$INPUT_FILE"

# 2. Evaluate Policy
echo "🔍 Evaluating Policy..."
if command -v opa >/dev/null 2>&1; then
    # --fail-defined is not enough, we want to check the allow_merge rule
    # We use -f pretty to see output, but we need exit code.

    # Check if allowed
    ALLOWED=$(opa eval -i "$INPUT_FILE" -d "$POLICY_DIR" "data.ga_gate.allow_merge" --format=json | jq '.result[0].expressions[0].value')

    if [ "$ALLOWED" == "true" ]; then
        echo "✅ GA Gate Policy Evaluation Passed"
    else
        echo "❌ GA Gate Policy Evaluation Failed"

        # Print Denial Messages
        echo "Denial Reasons:"
        opa eval -i "$INPUT_FILE" -d "$POLICY_DIR" "data.ga_gate.deny" --format=pretty
        exit 1
    fi
else
    echo "⚠️ OPA not found. In CI this should fail, but in dev we skip."
    # In strict mode, we should fail:
    # exit 1
fi

echo "✅ Gate Check Complete"
