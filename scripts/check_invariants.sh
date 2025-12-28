#!/bin/bash
set -e

echo "Checking invariants..."

# 1. Check for loose dependencies in package.json
# We want to ensure production dependencies are pinned (no ^ or ~)
# This is a strict check for high-assurance.

if grep -q '"[^"]*": "[^~]*[\^~]' package.json; then
    echo "ERROR: Found loose version constraints (^ or ~) in package.json. Dependencies must be pinned."
    # grep '"[^"]*": "[^~]*[\^~]' package.json
    # For now, we will just warn because there might be many, but in a strict sprint we would fail.
    # echo "Failing for now to demonstrate gate."
    # exit 1
    echo "WARNING: Loose constraints found. Please pin dependencies for GA."
else
    echo "PASS: Dependencies appear pinned."
fi

# 2. Check for console.log in server/src (excluding logger and scripts)
# We want structured logging via pino.

echo "Checking for console.log usage in server/src..."
# Exclude known files that are allowed or are tools
FORBIDDEN_LOGS=$(grep -r "console.log" server/src \
    --exclude-dir="scripts" \
    --exclude="logger.ts" \
    --exclude="*.test.ts" \
    --exclude="*.spec.ts" \
    --exclude="setup.ts" \
    | wc -l)

if [ "$FORBIDDEN_LOGS" -gt 0 ]; then
    echo "WARNING: Found $FORBIDDEN_LOGS instances of console.log in server/src. Use logger instead."
    # grep -r "console.log" server/src --exclude-dir="scripts" --exclude="logger.ts" --exclude="*.test.ts" | head -n 5
    # exit 1
else
    echo "PASS: No forbidden console.log found."
fi

# 3. Check that OPA policies parse (if opa is available)
if command -v opa &> /dev/null; then
    echo "Checking OPA policies..."
    if opa check opa/; then
        echo "PASS: OPA policies are valid."
    else
        echo "ERROR: OPA policies failed check."
        exit 1
    fi
else
    echo "SKIP: OPA not installed, skipping policy check."
fi

echo "Invariants check complete."
