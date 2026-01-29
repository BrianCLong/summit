#!/bin/bash
set -e

SCAN_DIR=${1:-${EVIDENCE_DIR:-artifacts/evidence/goldenpath-frontend}}
FORBIDDEN_PATTERNS=("SECRET=" "TOKEN=" "Authorization: Bearer" "private_key" "password123")

echo "Scanning $SCAN_DIR for forbidden patterns..."

EXIT_CODE=0

for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
  # Exclude self (redaction_scan.sh) and specific tests/fixtures
  if grep -r "$pattern" "$SCAN_DIR" \
     --exclude="redaction_scan.sh" \
     --exclude="policy_redaction.spec.ts" \
     --exclude="test_users.json" \
     --exclude="*.log" \
     > /dev/null 2>&1; then
    echo "❌ Forbidden pattern found: '$pattern'"
    grep -r "$pattern" "$SCAN_DIR" \
         --exclude="redaction_scan.sh" \
         --exclude="policy_redaction.spec.ts" \
         --exclude="test_users.json" \
         --exclude="*.log" || true
    EXIT_CODE=1
  fi
done

if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ Policy Gate Passed: No secrets detected."
else
  echo "❌ Policy Gate Failed: Secrets detected in artifacts!"
fi

exit $EXIT_CODE
