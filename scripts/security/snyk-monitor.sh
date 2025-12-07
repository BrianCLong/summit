#!/bin/bash
set -e

# Snyk Monitor Wrapper
# Usage: ./scripts/security/snyk-monitor.sh

if [ -z "$SNYK_TOKEN" ]; then
    echo "⚠️ SNYK_TOKEN is not set. Skipping Snyk monitor."
    exit 0
fi

echo "Running Snyk Monitor..."
# Monitor current state for the Snyk dashboard
snyk monitor --all-projects

echo "Running Snyk Test (Blocking High/Critical)..."
# Fail build on High/Critical
set +e
snyk test --all-projects --severity-threshold=high
EXIT_CODE=$?
set -e

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Snyk check passed."
    exit 0
else
    echo "❌ Snyk found high/critical vulnerabilities."
    exit $EXIT_CODE
fi
