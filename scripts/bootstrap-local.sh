#!/usr/bin/env bash
set -euo pipefail

CACHE="${HOME}/.cache/npm-companyos"
echo ">> Using npm cache: $CACHE"
mkdir -p "$CACHE"

echo ">> Installing client deps…"
pushd client >/dev/null
rm -rf node_modules package-lock.json || true
NPM_CONFIG_CACHE="$CACHE" npm install
popd >/dev/null

echo ">> Done. Start dev with:"
echo "   npm run dev --prefix client"