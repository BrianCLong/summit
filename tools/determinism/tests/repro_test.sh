#!/bin/bash

# Get absolute path to the verifier
VERIFIER=$(readlink -f tools/determinism/repro_verifier.py)
TEST_DIR=$(readlink -f tools/determinism/tests)

echo "=== Testing Non-Deterministic Build ==="
cd "$TEST_DIR"
python3 "$VERIFIER" \
  --build-command "./build_nondet.sh" \
  --output-dir "dist" \
  --clean-command "./clean.sh"

if [ $? -eq 0 ]; then
    echo "FAIL: Expected non-deterministic build to fail verification."
    exit 1
else
    echo "PASS: Non-deterministic build correctly detected."
fi

echo ""
echo "=== Testing Deterministic Build ==="
python3 "$VERIFIER" \
  --build-command "./build_det.sh" \
  --output-dir "dist" \
  --clean-command "./clean.sh"

if [ $? -ne 0 ]; then
    echo "FAIL: Expected deterministic build to pass verification."
    exit 1
else
    echo "PASS: Deterministic build verified."
fi

# Cleanup
./clean.sh
rm -rf .repro_verify_tmp
