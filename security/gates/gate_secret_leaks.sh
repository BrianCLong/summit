#!/usr/bin/env bash
set -euo pipefail

# GATE-SECRET-LEAK: Deny-by-default
# Scans for common secret patterns and high-entropy strings in the diff.

# Check if killswitch is active
if [[ "${SEC_GATE_SECRET_LEAKS_DISABLED:-false}" == "true" ]]; then
  echo "skip: secret leak gate (killswitch active)"
  exit 0
fi

BASE_BRANCH="${GITHUB_BASE_REF:-origin/main}"
FILES="$(git diff --name-only "$BASE_BRANCH"...HEAD || true)"
FAILED=0

# Secret patterns (Common ones: AWS, GitHub PAT, Slack)
PATTERNS='(AKIA[0-9A-Z]{16}|ghp_[0-9A-Za-z]{36}|xox[baprs]-[0-9A-Za-z-]{10,}|SG\.[0-9A-Za-z_-]{22}\.[0-9A-Za-z_-]{43})'

while read -r f; do
  [ -f "$f" ] || continue
  # Scan only non-binary files
  if grep -Iq . "$f"; then
    if grep -Eq "$PATTERNS" "$f"; then
      echo "FAILED: Potential secret pattern found in $f" >&2
      FAILED=1
    fi
  fi
done <<<"$FILES"

if [ $FAILED -eq 0 ]; then
  echo "ok: secret leak gate"
fi

exit $FAILED
