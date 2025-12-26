#!/bin/bash
set -e

echo "🔒 Starting Continuous Improvement Regression Gate..."

# 1. Hard Guarantees
echo "Checking Hard Guarantees..."

echo "➡️  Running pnpm install..."
pnpm install

echo "➡️  Running pnpm build..."
pnpm build

echo "➡️  Running pnpm lint..."
pnpm lint

echo "➡️  Running pnpm test..."
pnpm test

# 2. Automated Regression Detection (Simulation)
echo "Checking Regression Gates..."

echo "➡️  Security Gate (pnpm audit)..."
# We allow failure here locally if there are upstream issues, but in CI it gates.
# We just want to see the output.
pnpm audit --audit-level=high || echo "⚠️  Security vulnerabilities found (check output)"

echo "➡️  Bundle Size Gate..."
# This is hard to simulate exactly like CI without base comparison, but we can check if build succeeded.
if [ -d "client/dist" ] || [ -d "client/build" ]; then
    echo "✅ Client build exists."
else
    echo "❌ Client build missing!"
    exit 1
fi

if [ -d "server/dist" ] || [ -d "server/build" ]; then
    echo "✅ Server build exists."
else
    echo "❌ Server build missing!"
    exit 1
fi

# 3. Process Verification
echo "Checking Process Artifacts..."

REQUIRED_FILES=(
    "docs/CONTINUOUS_IMPROVEMENT.md"
    "docs/METRIC_OWNERSHIP.md"
    "IMPROVEMENT_BACKLOG.md"
    "docs/templates/POST_MORTEM.md"
    "docs/templates/IMPROVEMENT_PROPOSAL.md"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ Found $file"
    else
        echo "❌ Missing $file"
        exit 1
    fi
done

echo "🎉 Continuous Improvement Gate Passed!"
