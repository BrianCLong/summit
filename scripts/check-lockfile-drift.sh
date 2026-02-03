#!/usr/bin/env bash
set -euo pipefail

echo "Checking for lockfile drift..."

# pnpm install --frozen-lockfile fails if the lockfile is not up-to-date with package.json
# --lockfile-only avoids downloading all packages, just checks resolution
if ! pnpm install --frozen-lockfile --lockfile-only --ignore-scripts; then
  echo "❌ Lockfile drift detected! pnpm-lock.yaml is out of sync with package.json."
  echo "Run 'pnpm install' to update the lockfile."
  exit 1
fi

echo "✅ Lockfile is in sync."
