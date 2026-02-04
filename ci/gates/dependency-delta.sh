#!/bin/bash
set -e

# Check if lockfiles changed
LOCKFILES=("package-lock.json" "yarn.lock" "pnpm-lock.yaml" "poetry.lock" "Gemfile.lock" "go.sum")
CHANGED_LOCKFILES=()

# Determine base commit
if [ -n "$BASE_SHA" ]; then
    BASE_REF="$BASE_SHA"
elif git rev-parse --verify HEAD^ >/dev/null 2>&1; then
    BASE_REF="HEAD^"
else
    # Initial commit or shallow clone might fail, warn and skip
    echo "Warning: Cannot determine base commit. Skipping dependency delta check."
    exit 0
fi

echo "Using base commit: $BASE_REF"

for lockfile in "${LOCKFILES[@]}"; do
  if git diff --name-only "$BASE_REF" HEAD | grep -q "$lockfile"; then
    CHANGED_LOCKFILES+=("$lockfile")
  fi
done

if [ ${#CHANGED_LOCKFILES[@]} -gt 0 ]; then
  echo "Dependency lockfiles changed: ${CHANGED_LOCKFILES[*]}"

  if ! git diff --name-only "$BASE_REF" HEAD | grep -q "docs/supply-chain/dependency-delta.md"; then
    echo "Error: Dependency changes detected but docs/supply-chain/dependency-delta.md was not updated."
    echo "Please update docs/supply-chain/dependency-delta.md with details of the dependency changes."
    exit 1
  fi
fi

echo "Dependency delta check passed."
