#!/bin/bash
# scripts/ci/today_status.sh
# Checks the 5-item execution strip status

echo "--- Summit Today Status Check ---"

# 1. Check Green
echo -n "1. Main Green Check: "
if npm run test:quick > /dev/null 2>&1; then
    echo "✅ PASS"
else
    echo "❌ FAIL"
fi

# 2. Stale Branches
echo -n "2. Stale Branch Analysis: "
if [ -f scripts/ci/list_stale_branches.sh ]; then
    echo "✅ Script Exists"
else
    echo "❌ Missing Script"
fi

# 3. Lint Rule
echo -n "3. Lint Rule (no-console: error): "
if grep -q "'no-console': 'error'" eslint.config.mjs; then
    echo "✅ Enforced"
else
    echo "❌ Not Enforced"
fi

# 4. Security Check
echo -n "4. Security Check: "
if npm run security:verify-critical > /dev/null 2>&1; then
    echo "✅ PASS (No criticals)"
else
    echo "⚠️  FAIL or Issues Found (Check npm audit)"
fi

# 5. Documentation
echo -n "5. Readiness Assertion Updated: "
if grep -q "DAILY SECURITY SNAPSHOT" docs/SUMMIT_READINESS_ASSERTION.md; then
    echo "✅ Updated"
else
    echo "❌ Not Updated"
fi
