#!/bin/bash
set -e

# NPM Audit Wrapper
# Usage: ./scripts/security/npm-audit.sh [check|fix]

MODE=${1:-check}

echo "Running NPM Audit ($MODE)..."

if [ "$MODE" == "fix" ]; then
    echo "Attempting to fix vulnerabilities..."
    pnpm audit --fix
    exit 0
fi

# Check for vulnerabilities
# --audit-level=high fails if there are high or critical vulnerabilities
echo "Checking for HIGH/CRITICAL vulnerabilities..."
set +e
pnpm audit --audit-level=high
EXIT_CODE=$?
set -e

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ No HIGH/CRITICAL vulnerabilities found."
    exit 0
else
    echo "❌ High or Critical vulnerabilities found!"
    if [ "$CI" == "true" ]; then
        echo "::error::High or Critical vulnerabilities detected by npm audit."
    fi
    exit $EXIT_CODE
fi
