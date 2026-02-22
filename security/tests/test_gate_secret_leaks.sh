#!/usr/bin/env bash
set -euo pipefail

# Test suite for gate_secret_leaks.sh

MOCK_BIN="$(pwd)/security/tests/mock_bin"
mkdir -p "$MOCK_BIN"

# Mock Git
cat <<EOF > "$MOCK_BIN/git"
#!/bin/bash
if [[ "\$1" == "diff" ]]; then
    # Return the file path provided in environment
    echo "\$MOCK_DIFF_FILE"
fi
EOF
chmod +x "$MOCK_BIN/git"

export PATH="$MOCK_BIN:$PATH"

echo "Running tests for gate_secret_leaks.sh..."

# Case 1: File with secret (Should Fail)
export MOCK_DIFF_FILE="security/tests/fixtures/secret_leak_fail.txt"
if ./security/gates/gate_secret_leaks.sh; then
    echo "FAIL: secret_leak_fail did not fail"
    exit 1
else
    echo "PASS: secret_leak_fail"
fi

# Case 2: File without secret (Should Pass)
export MOCK_DIFF_FILE="security/tests/fixtures/secret_leak_pass.txt"
if ./security/gates/gate_secret_leaks.sh; then
    echo "PASS: secret_leak_pass"
else
    echo "FAIL: secret_leak_pass did not pass"
    exit 1
fi

echo "All tests for gate_secret_leaks.sh PASSED"
