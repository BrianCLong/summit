#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 --evidence <path> --policy <path>" >&2
  exit 1
fi

node scripts/verify-governance.js "$@"
