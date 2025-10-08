#!/usr/bin/env bash
set -Eeuo pipefail
if ! command -v grype >/dev/null; then
  echo "grype not installed; skipping"; exit 0
fi
grype dir:. -o table || true
