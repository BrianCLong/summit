#!/usr/bin/env bash
set -euo pipefail

echo "Running gitleaks..."
gitleaks detect --source . --no-banner --redact --report-format json --report-path /tmp/gitleaks.json

echo "Running trufflehog..."
trufflehog filesystem --no-update --regex --only-verified --fail --json . > /tmp/trufflehog.json

echo "Combining reports"
jq -n '{gitleaks: (try (input | .) catch []), trufflehog: (try (input | .) catch [])}' /tmp/gitleaks.json /tmp/trufflehog.json > /tmp/secret-scan.json || true

if [ -s /tmp/gitleaks.json ]; then
  echo "Gitleaks report saved to /tmp/gitleaks.json"
fi
if [ -s /tmp/trufflehog.json ]; then
  echo "TruffleHog report saved to /tmp/trufflehog.json"
fi
