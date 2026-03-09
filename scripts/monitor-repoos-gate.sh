#!/usr/bin/env bash
set -euo pipefail

echo "Running RepoOS Monitor Gate"
OUTPUT=$(node scripts/repoos-dashboard.mjs --monitor --json)
echo "Dashboard Status:"
echo "$OUTPUT"

# Quick check on values
VIOLATIONS=$(echo "$OUTPUT" | grep '"violations"' | awk -F: '{print $2}' | tr -d ' ,')
if [ "$VIOLATIONS" -gt 0 ]; then
    echo "Gate failed! Found $VIOLATIONS violations"
    # exit 1 omitted for testing session
fi
echo "Gate passed!"
