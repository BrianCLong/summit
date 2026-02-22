#!/usr/bin/env bash
set -euo pipefail

# GATE-SUSPICIOUS-DIFF: Alert-only initially (Innovation OFF)

if [[ "${SEC_SUSPICIOUS_DIFF_ALERTS:-false}" != "true" ]]; then
  exit 0
fi

BASE_BRANCH="${GITHUB_BASE_REF:-origin/main}"
FILES="$(git diff --name-only "$BASE_BRANCH"...HEAD || true)"
ALERT=0

while read -r f; do
  [ -f "$f" ] || continue

  # 1. Detect large base64 blobs or encoded strings
  if grep -Eq '[A-Za-z0-9+/]{100,}' "$f"; then
    echo "ALERT: Large base64-like string detected in $f" >&2
    ALERT=1
  fi

  # 2. Detect curl | bash or similar patterns
  if grep -Eq '(curl|wget).*[|]\s*(bash|sh|zsh)' "$f"; then
    echo "ALERT: Potential dynamic code execution pattern (curl|bash) found in $f" >&2
    ALERT=1
  fi

  # 3. Detect new executable files
  if [ -x "$f" ] && ! git ls-tree -r "$BASE_BRANCH" --name-only | grep -qx "$f"; then
    echo "ALERT: New executable file added: $f" >&2
    ALERT=1
  fi
done <<<"$FILES"

if [ $ALERT -eq 1 ]; then
  echo "WARNING: Suspicious diff patterns detected. Please review carefully." >&2
fi

echo "ok: suspicious diff scan"
