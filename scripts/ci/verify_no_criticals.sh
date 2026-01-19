#!/bin/bash
# scripts/ci/verify_no_criticals.sh
set -e

echo "Running security audit (Critical level only)..."
# We allow failure (|| true) so the script doesn't exit immediately if vulnerabilities are found,
# but we grep for "critical" to manually fail if needed, or just let npm audit exit code handle it.
# Actually, npm audit returns non-zero if vulnerabilities are found.
# We want to fail ONLY on criticals.

if npm audit --audit-level=critical --json > /dev/null 2>&1; then
    echo "✅ No critical vulnerabilities found."
    exit 0
else
    echo "⚠️  Critical vulnerabilities found or audit failed."
    # For now, we print the summary
    npm audit --audit-level=critical --summary
    # We exit 1 to fail the check
    exit 1
fi
