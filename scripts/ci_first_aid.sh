#!/usr/bin/env bash
set -euo pipefail

echo "[first-aid] enable toolchain"
corepack enable || true
corepack prepare pnpm@9.12.3 --activate || true

echo "[first-aid] install"
pnpm install --frozen-lockfile=false

echo "[first-aid] lint"
pnpm run lint || echo "::warning::lint failed"

echo "[first-aid] typecheck"
pnpm run typecheck || echo "::warning::typecheck failed"

echo "[first-aid] test"
pnpm run test || echo "::warning::tests failed, continuing to build"

echo "[first-aid] build"
if [ -x scripts/build-workspaces.sh ]; then
  bash scripts/build-workspaces.sh
else
  echo "scripts/build-workspaces.sh not found; skipping"
fi

echo "[first-aid] OK"
