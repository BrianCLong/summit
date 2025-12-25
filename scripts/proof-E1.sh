#!/bin/bash
set -e

echo "Running E1 Verification Proof..."
export SIMULATE_VERIFICATION=true

echo "1. Attempting to verify UNSIGNED image (Should Fail)..."
if npx tsx scripts/gatekeeper.ts "ghcr.io/companyos/app:unsigned"; then
    echo "❌ Unsigned image was allowed! (Unexpected)"
    exit 1
else
    echo "✅ Unsigned image was correctly BLOCKED."
fi

echo "2. Attempting to verify SIGNED image (Should Pass)..."
if npx tsx scripts/gatekeeper.ts "ghcr.io/companyos/app:signed"; then
    echo "✅ Signed image was APPROVED."
else
    echo "❌ Signed image was blocked! (Unexpected)"
    exit 1
fi

echo "E1 Proof Complete: Admission gate is functioning."
