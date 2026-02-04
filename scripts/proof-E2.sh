#!/bin/bash
set -e

echo "Running E2 Policy Versioning Proof..."
mkdir -p audit

if ./scripts/manage-policy-bundle.sh v2.0.0; then
    echo "✅ Bundle v2.0.0 created and promoted."

    if [ -L "dist/policy-bundles/policy-active.tar.gz" ]; then
        echo "✅ Active link updated."
    else
        echo "❌ Active link missing!"
        exit 1
    fi

    if grep -q "PROMOTE v2.0.0" audit/policy_log.txt; then
        echo "✅ Promotion audited."
    else
        echo "❌ Promotion audit missing!"
        exit 1
    fi
else
    echo "❌ Script failed."
    exit 1
fi

echo "E2 Proof Complete."
