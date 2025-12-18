#!/bin/bash
# verify-onboarding.sh - Validate developer environment setup
# Run this after onboarding to confirm everything is working

set -e

echo ""
echo "🔍 Verifying Summit development environment..."
echo ""

PASS=0
FAIL=0

check() {
    local name="$1"
    local cmd="$2"

    if eval "$cmd" > /dev/null 2>&1; then
        echo "  ✅ $name"
        ((PASS++))
    else
        echo "  ❌ $name"
        ((FAIL++))
    fi
}

echo "Prerequisites:"
check "Docker installed" "docker --version"
check "Docker running" "docker info"
check "Node.js >= 18" "node -v | grep -E 'v(1[89]|[2-9][0-9])'"
check "pnpm available" "pnpm --version"

echo ""
echo "Project Setup:"
check ".env file exists" "test -f .env"
check "node_modules exists" "test -d node_modules"
check "Dependencies installed" "test -f node_modules/.pnpm/lock.yaml || test -d node_modules/.bin"

echo ""
echo "Services (if running):"
check "API responding" "curl -sf http://localhost:4000/health"
check "Frontend responding" "curl -sf http://localhost:3000"
check "Neo4j responding" "curl -sf http://localhost:7474"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Results: $PASS passed, $FAIL failed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $FAIL -eq 0 ]; then
    echo ""
    echo "🎉 Environment verified! You're ready to develop."
    echo ""
    echo "Next steps:"
    echo "  summit up       # Start services (if not running)"
    echo "  summit smoke    # Validate golden path"
    echo ""
    exit 0
else
    echo ""
    echo "⚠️  Some checks failed. Run 'summit doctor --fix' for help."
    echo ""
    exit 1
fi
