#!/usr/bin/env bash
set -e

# scripts/ci/ci-parity.sh
# A deterministic script to enforce the Green CI Contract locally.
# Fails fast on the first error.

echo "========================================================"
echo "🛡️  INTELGRAPH CI PARITY CHECK"
echo "========================================================"

# 1. Verification of Toolchain
echo "🔍 Checking toolchain..."
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install pnpm@10.0.0+"
    exit 1
fi

# 2. Clean Install (Optional but recommended for parity)
if [ "$1" == "--clean" ]; then
    echo "🧹 Cleaning node_modules..."
    rm -rf node_modules
    find . -name "node_modules" -type d -prune -exec rm -rf '{}' +
fi

# 3. Install
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

# 4. Lint
echo "aaS Linting..."
pnpm -r lint

# 5. Typecheck
echo "TS Typechecking..."
pnpm -r typecheck

# 6. Build
echo "🏗️  Building..."
pnpm -r build

# 7. Test
echo "🧪 Testing..."
pnpm -r test

echo "✅ GREEN CI CONTRACT MET"
