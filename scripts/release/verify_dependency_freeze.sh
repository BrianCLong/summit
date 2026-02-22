#!/usr/bin/env bash
set -u

BASELINE="${BASELINE:-}"
LOCKFILE="${LOCKFILE:-pnpm-lock.yaml}"

echo "========================================"
echo "DEPENDENCY FREEZE VERIFICATION"
echo "========================================"

if [[ -z "$BASELINE" ]]; then
  BASELINE=$(git tag -l 'v*.*.*-rc.*' --sort=-v:refname | head -1)
fi

STATUS="PASS"
HAS_CHANGES="false"
EXIT_CODE=0

if [[ -z "$BASELINE" ]]; then
  echo "No baseline found. Skipping freeze check."
  STATUS="SKIP"
else
  if ! git rev-parse "$BASELINE" >/dev/null 2>&1; then
    echo "Baseline $BASELINE not found. Skipping."
    STATUS="SKIP"
  else
    if ! git diff --quiet "$BASELINE" -- "$LOCKFILE" 2>/dev/null; then
       HAS_CHANGES="true"
       STATUS="FAIL"
       EXIT_CODE=1
       echo "Changes detected in $LOCKFILE"
    fi
  fi
fi

echo "Status: $STATUS"
echo "Exit Code: $EXIT_CODE"

echo "{\"status\": \"$STATUS\", \"has_changes\": $HAS_CHANGES, \"exit_code\": $EXIT_CODE, \"baseline\": \"$BASELINE\"}"

exit $EXIT_CODE
