#!/usr/bin/env bash
set -euo pipefail

# Deny-by-default: if lockfiles changed, require deps/dependency_delta.md update.

LOCKFILES_REGEX='(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|poetry\.lock|Pipfile\.lock|requirements\.txt|go\.sum|Cargo\.lock)'

# Use origin/main as base if available, else HEAD^
BASE_REF="origin/main"
if ! git rev-parse "$BASE_REF" >/dev/null 2>&1; then
  BASE_REF="HEAD^"
fi

CHANGED="$(git diff --name-only "$BASE_REF"...HEAD || true)"
if echo "$CHANGED" | grep -Eq "$LOCKFILES_REGEX"; then
  if ! echo "$CHANGED" | grep -q '^deps/dependency_delta\.md$'; then
    echo "Dependency lockfile changed but deps/dependency_delta.md not updated" >&2
    exit 1
  fi
fi

echo "ok: deps delta gate"
