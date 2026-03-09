#!/usr/bin/env bash
set -euo pipefail

echo "Verifying pnpm lockfile..."
pnpm install --frozen-lockfile --ignore-scripts || { echo "pnpm install failed"; exit 1; }

git diff --exit-code -- pnpm-lock.yaml >/dev/null || { echo "Lockfile changed."; git --no-pager diff pnpm-lock.yaml; exit 1; }

echo "Lockfile verified."
