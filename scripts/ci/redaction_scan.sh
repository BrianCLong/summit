#!/bin/bash
set -e

<<<<<<< HEAD
EVIDENCE_DIR=${EVIDENCE_DIR:-artifacts/evidence/goldenpath-frontend}
echo "Scanning evidence for secrets in $EVIDENCE_DIR..."

FORBIDDEN_PATTERNS=("SECRET=" "TOKEN=" "Authorization: Bearer" "private_key")

FOUND_SECRETS=0

# Recursively grep for forbidden patterns in files
for PATTERN in "${FORBIDDEN_PATTERNS[@]}"; do
  if grep -r "$PATTERN" "$EVIDENCE_DIR" >/dev/null 2>&1; then
    echo "❌ Forbidden pattern found: '$PATTERN'"
    grep -r "$PATTERN" "$EVIDENCE_DIR"
    FOUND_SECRETS=1
  fi
done

if [ $FOUND_SECRETS -eq 1 ]; then
  echo "Policy Gate Failed: Secrets detected in evidence artifacts."
  exit 1
fi

echo "✅ Policy Gate Passed: No secrets detected."
exit 0
=======
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
>>>>>>> 50f8d7925a (feat: add golden path E2E test harness for consolidated frontend)
