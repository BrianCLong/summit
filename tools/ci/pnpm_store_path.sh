#!/usr/bin/env bash
set -euo pipefail

store_path=$(pnpm store path)
pnpm_version=$(pnpm --version)

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    echo "store_path=${store_path}"
    echo "pnpm_version=${pnpm_version}"
  } >> "$GITHUB_OUTPUT"
else
  echo "$store_path"
fi
