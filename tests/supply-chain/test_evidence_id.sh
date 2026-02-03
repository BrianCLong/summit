#!/usr/bin/env bash
set -e

# Test evidence ID generation
SCRIPT_DIR="$(dirname "$0")"
EVIDENCE_SCRIPT="${SCRIPT_DIR}/../../hack/supplychain/evidence_id.sh"

echo "Testing evidence_id.sh..."

OUTPUT=$($EVIDENCE_SCRIPT "test-target")
echo "Output: $OUTPUT"

if [[ "$OUTPUT" =~ ^sc-[a-f0-9]+-[a-zA-Z0-9_-]+-test-target$ ]]; then
    echo "PASS: Evidence ID format matches"
else
    echo "FAIL: Evidence ID format invalid"
    exit 1
fi
