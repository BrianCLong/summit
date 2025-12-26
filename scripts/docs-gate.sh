#!/usr/bin/env bash
set -euo pipefail

BASE_REF=${BASE_REF:-origin/main}

echo "[docs-gate] comparing against ${BASE_REF}"
CHANGED=$(git diff --name-only "${BASE_REF}...HEAD")

protected_regex='^(security/|SECURITY|export/|policy/|privacy/|api/|server/src/routes/api|server/src/middleware)'
needs_docs=0
for file in $CHANGED; do
  if [[ $file =~ $protected_regex ]]; then
    needs_docs=1
    break
  fi
done

if [[ $needs_docs -eq 0 ]]; then
  echo "[docs-gate] no protected paths changed"
  exit 0
fi

docs_touched=$(echo "$CHANGED" | grep '^docs/' || true)
override_label=${DOCS_OVERRIDE_LABEL:-"docs-not-required"}

if [[ -n "$docs_touched" ]]; then
  echo "[docs-gate] docs updated: $docs_touched"
  exit 0
fi

if git log -1 --pretty=%B | grep -q "${override_label}"; then
  echo "[docs-gate] override label present in commit message"
  exit 0
fi

echo "Docs update required for protected paths. Add docs changes, an ADR entry, or include label ${override_label} in the PR." >&2
exit 1
