#!/bin/bash
set -e

SCAN_DIR=${1:-artifacts}
FORBIDDEN_PATTERNS=("SECRET=" "TOKEN=" "Authorization: Bearer" "password123")

echo "Scanning $SCAN_DIR for forbidden patterns..."

EXIT_CODE=0

for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
  # Exclude self (redaction_scan.sh) and specific tests/fixtures
  if grep -r "$pattern" "$SCAN_DIR" \
     --exclude="redaction_scan.sh" \
     --exclude="policy_redaction.spec.ts" \
     --exclude="test_users.json" \
     --exclude="*.log" \
     > /dev/null; then
    echo "❌ Forbidden pattern found: '$pattern'"
    grep -r "$pattern" "$SCAN_DIR" \
         --exclude="redaction_scan.sh" \
         --exclude="policy_redaction.spec.ts" \
         --exclude="test_users.json" \
         --exclude="*.log"
    EXIT_CODE=1
  fi
done

if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ No secrets found."
else
  echo "❌ Secrets detected in artifacts!"
fi

exit $EXIT_CODE
