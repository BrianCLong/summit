#!/usr/bin/env bash
set -euo pipefail

# Test suite for gate_workflow_changes.sh

MOCK_BIN="$(pwd)/security/tests/mock_bin"
mkdir -p "$MOCK_BIN"

# Mock Git
cat <<EOF > "$MOCK_BIN/git"
#!/bin/bash
if [[ "\$1" == "diff" ]]; then
    # Simulate a workflow file change
    echo ".github/workflows/new-ci.yml"
fi
if [[ "\$1" == "log" ]]; then
    # Return the content of a fixture file passed via environment
    cat "\$MOCK_LOG_FILE"
fi
EOF
chmod +x "$MOCK_BIN/git"

export PATH="$MOCK_BIN:$PATH"

echo "Running tests for gate_workflow_changes.sh..."

# Case 1: Change WITH SECURITY_ACK (Should Pass)
export MOCK_LOG_FILE="$(pwd)/security/tests/fixtures/wf_change_should_pass.txt"
if ./security/gates/gate_workflow_changes.sh; then
    echo "PASS: wf_change_should_pass"
else
    echo "FAIL: wf_change_should_pass did not pass"
    exit 1
fi

# Case 2: Change WITHOUT SECURITY_ACK (Should Fail)
export MOCK_LOG_FILE="$(pwd)/security/tests/fixtures/wf_change_should_fail.txt"
if ./security/gates/gate_workflow_changes.sh; then
    echo "FAIL: wf_change_should_fail did not fail"
    exit 1
else
    echo "PASS: wf_change_should_fail"
fi

echo "All tests for gate_workflow_changes.sh PASSED"
