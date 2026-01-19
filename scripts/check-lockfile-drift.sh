#!/bin/bash
set -e

echo "🔍 Checking for lockfile drift..."

# Ensure pnpm is available
if ! command -v pnpm &> /dev/null; then
  echo "pnpm not found."
  exit 1
fi

# Run pnpm install with --frozen-lockfile to check for drift
# If the lockfile is out of sync with package.json, this will fail.
echo "Running: pnpm install --frozen-lockfile"
if pnpm install --frozen-lockfile; then
  echo "✅ No lockfile drift detected. pnpm-lock.yaml is in sync."
else
  echo "❌ Lockfile drift detected! pnpm-lock.yaml is out of sync with package.json."
  echo "Please run 'pnpm install' locally and commit the updated pnpm-lock.yaml."
  exit 1
fi

# Optional: verify no other lockfiles exist
FORBIDDEN_LOCKFILES=$(find . -maxdepth 2 -name "package-lock.json" -o -name "yarn.lock" -o -name "npm-shrinkwrap.json")
if [ -n "$FORBIDDEN_LOCKFILES" ]; then
  echo "❌ Forbidden lockfiles found:"
  echo "$FORBIDDEN_LOCKFILES"
  exit 1
fi

echo "✅ All lockfile integrity checks passed."
