#!/bin/bash
set -e

# Check if pnpm-lock.yaml is consistent with package.json
echo "Checking lockfile drift..."
if ! pnpm install --frozen-lockfile --ignore-scripts; then
  echo "❌ Error: Lockfile is out of sync with package.json. Please run 'pnpm install' to update it."
  exit 1
fi

echo "✅ Lockfile is in sync."
