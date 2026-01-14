#!/bin/bash
set -e

# Setup
TEST_DIR="scratchpad/repro_test"
ARTIFACTS_DIR="$TEST_DIR/artifacts"
EVIDENCE_DIR="$ARTIFACTS_DIR/evidence"

rm -rf "$TEST_DIR"
mkdir -p "$EVIDENCE_DIR"

# 1. Create a "Bad" Artifact (violates naming convention)
echo "I am a bad artifact" > "$ARTIFACTS_DIR/bad-artifact.txt"
# 2. Create a "Good" Artifact
echo "I am a good artifact" > "$ARTIFACTS_DIR/ops-evidence-2024-W40-123456.tar.gz"

# 3. Run Generation
export ARTIFACTS_DIR="$ARTIFACTS_DIR"
node scripts/evidence/generate_evidence_bundle.mjs > /dev/null

# 4. Run Verification (Strict Mode)
echo "Running verification..."
if node scripts/ci/verify_evidence_consistency.mjs --strict; then
    echo "❌ FAILURE: verify_evidence_consistency.mjs PASSED but should have FAILED on 'bad-artifact.txt'."
    exit 1
else
    echo "✅ SUCCESS: verify_evidence_consistency.mjs FAILED as expected."
fi
