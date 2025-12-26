#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[bootstrap] verifying prerequisites"
command -v node >/dev/null || { echo "Node is required"; exit 1; }
command -v pnpm >/dev/null || { echo "pnpm is required"; exit 1; }
command -v git >/dev/null || { echo "git is required"; exit 1; }

echo "[bootstrap] ensuring env file"
if [ -f .env.local ]; then
  echo "[bootstrap] .env.local already exists (keeping)"
else
  if [ -f .env.example ]; then
    cp .env.example .env.local
    echo "[bootstrap] created .env.local from template"
  else
    echo "[bootstrap] .env.example not found; skipping copy"
  fi
fi

echo "[bootstrap] running config check (lint)">
pnpm lint --filter "./server" --filter "./client" || true

if [ "${DRY_RUN:-0}" = "1" ]; then
  echo "[bootstrap] dry run complete"
  exit 0
fi

echo "[bootstrap] running quick tests"
npm run test:quick || echo "[bootstrap] quick tests reported issues"

echo "[bootstrap] complete"
