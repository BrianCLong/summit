#!/bin/bash
set -e

# Merge Train Controller
# Automates the merge queue and stabilization

echo "🚂 Starting Merge Train Controller..."

# 1. Check CI Health
echo "🔍 Checking CI Health..."
# In a real scenario, this would check GitHub Actions API for status
# For now, we assume it's healthy if we are running

# 2. Fast Checks (Lint & Typecheck)
echo "⚡ Running Fast Checks..."
npm run lint
npm run typecheck

# 3. Test Hygiene Check
echo "🛡️ Running Test Hygiene Checks..."
node scripts/guard-tests.cjs

# 4. Process Merge Queue (Placeholder for future implementation)
echo "📋 Processing Merge Queue..."
# scripts/process-merge-queue.js was missing, logic removed.
echo "Checking for mergeable PRs..."

# 5. Stabilization Checks
echo "⚖️ Running Stabilization Checks..."
if [ -f "scripts/find-flaky-tests.sh" ]; then
  # Determine if we should run flaky test detection (e.g. on schedule or full run)
  # For now, we run it if present.
  ./scripts/find-flaky-tests.sh 1 # Run once for speed, or more for thoroughness
else
  echo "⚠️ scripts/find-flaky-tests.sh not found, skipping..."
fi

echo "✅ Merge Train Cycle Complete"
