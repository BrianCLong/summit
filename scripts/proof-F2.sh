#!/bin/bash
set -e

echo "Running F2 Secret Rotation Proof..."
mkdir -p mocks/secrets audit

# Seed initial secret
echo "old-secret" > mocks/secrets/db-password

echo "--- Scenario 1: Standard Rotation ---"
if ./scripts/rotate-secret.sh db-password; then
    echo "✅ Rotation script executed."
    NEW_VAL=$(cat mocks/secrets/db-password)
    if [ "$NEW_VAL" != "old-secret" ]; then
        echo "✅ Secret value updated: $NEW_VAL"
    else
        echo "❌ Secret value did not change!"
        exit 1
    fi
else
    echo "❌ Rotation failed."
    exit 1
fi

echo "--- Scenario 2: Break Glass Rotation ---"
export BREAK_GLASS=true
if ./scripts/rotate-secret.sh db-password; then
    if grep -q "Break glass rotation" audit/break_glass.log; then
        echo "✅ Break glass audited."
    else
        echo "❌ Break glass audit missing!"
        exit 1
    fi
else
    echo "❌ Break glass rotation failed."
    exit 1
fi

echo "F2 Proof Complete."
