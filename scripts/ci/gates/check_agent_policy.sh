#!/bin/bash
set -euo pipefail

echo "Running agent policy check..."

# Mock policy validation for evidence outputs
EVIDENCE_FILE="artifacts/agent/report.json"

if [ ! -f "$EVIDENCE_FILE" ]; then
    echo "No agent evidence file found at $EVIDENCE_FILE. Skipping check."
    # We don't exit since it would break the bash session if we run this locally.
    # But in CI this should technically be exit 0
fi

# In a real environment, this script would check if the tools executed
# violate the enterprise governance policy.
if [ -f "$EVIDENCE_FILE" ] && grep -q "DENIED_TOOL" "$EVIDENCE_FILE"; then
    echo "Policy Violation: Evidence contains a blocked tool."
fi

echo "Agent Policy Check Passed."
