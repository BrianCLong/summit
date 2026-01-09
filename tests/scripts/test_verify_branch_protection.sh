#!/bin/bash
set -euo pipefail

# Test harness for verify_branch_protection.sh
# Verifies that it can correctly extract checks from a policy file.

SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
ROOT_DIR=$(dirname "$(dirname "$SCRIPT_DIR")")
VERIFY_SCRIPT="$ROOT_DIR/scripts/ga/verify_branch_protection.sh"
TEST_POLICY_FILE="$SCRIPT_DIR/temp_policy.sh"

cleanup() {
    rm -f "$TEST_POLICY_FILE" branch-protection-audit.json
}
trap cleanup EXIT

echo "🧪 Testing verify_branch_protection.sh extraction logic..."

# Create a dummy policy file
cat > "$TEST_POLICY_FILE" <<EOF
#!/bin/bash
REQUIRED_CHECKS=(
  "Check A"
  "Check B"
  "Check C"
)
EOF

# Run extraction
export POLICY_FILE="$TEST_POLICY_FILE"
# Unset GH_TOKEN to force skip of live check (we only test extraction here)
unset GH_TOKEN

"$VERIFY_SCRIPT" > /dev/null

# Verify output artifact
if [ ! -f "branch-protection-audit.json" ]; then
    echo "❌ Failed to create audit artifact"
    exit 1
fi

CHECKS=$(jq -r '.policy[]' branch-protection-audit.json)
EXPECTED="Check A
Check B
Check C"

if [ "$CHECKS" == "$EXPECTED" ]; then
    echo "✅ Extraction Test Passed"
else
    echo "❌ Extraction Test Failed"
    echo "Expected:"
    echo "$EXPECTED"
    echo "Got:"
    echo "$CHECKS"
    exit 1
fi
