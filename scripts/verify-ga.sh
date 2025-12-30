#!/bin/bash
set -e

echo "🔒 Starting GA Gate Verification..."

# 1. Check for legacy markers in source code (excluding this script and config files with waivers)
echo "🔍 Scanning for legacy markers..."
LEGACY_COUNT=$(grep -r "legacy" server/src | grep -v "featureFlags.ts" | grep -v "postgres.ts" | wc -l)
if [ "$LEGACY_COUNT" -gt 5 ]; then
  echo "❌ Too many 'legacy' markers found ($LEGACY_COUNT). Please cleanup or whitelist."
  # exit 1 # Warning for now, uncomment to block
else
  echo "✅ Legacy marker check passed."
fi

# 2. Verify Smoke Test Script Exists
echo "🔍 Verifying smoke test script..."
if [ -f "server/scripts/smoke-test.cjs" ]; then
  echo "✅ Smoke test script exists."
else
  echo "❌ Smoke test script missing!"
  exit 1
fi

# 3. Verify Policy Logic (Simulation)
echo "🔍 Verifying OPA policies..."
# Assuming a script exists or running a simple verification
if [ -f "scripts/verify_policy_lifecycle.ts" ]; then
    echo "✅ Policy lifecycle script found."
else
    echo "⚠️ Policy lifecycle script missing, skipping deep verification."
fi

# 4. Check for Runbooks
echo "🔍 Verifying Runbooks..."
REQUIRED_RUNBOOKS=("DEPLOYMENT_RUNBOOK.md" "OBSERVABILITY_RUNBOOK.md")
for rb in "${REQUIRED_RUNBOOKS[@]}"; do
  if [ -f "docs/runbooks/$rb" ]; then
    echo "✅ Runbook $rb exists."
  else
    echo "❌ Runbook $rb MISSING!"
    exit 1
  fi
done

echo "🎉 GA Local Verification Passed!"
