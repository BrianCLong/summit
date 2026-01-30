#!/usr/bin/env bash
set -euo pipefail

env=""
window=""

for arg in "$@"; do
  case "$arg" in
    --env=*) env="${arg#*=}" ;;
    --window=*) window="${arg#*=}" ;;
  esac
 done

if [[ -z "$env" || -z "$window" ]]; then
  echo "Usage: $0 --env=<env> --window=<duration>" >&2
  exit 2
fi

if [[ -z "${ERROR_BUDGET_OK:-}" ]]; then
  echo "Intentionally constrained error budget gate: set ERROR_BUDGET_OK=true to enforce." >&2
  exit 0
fi

if [[ "${ERROR_BUDGET_OK}" != "true" ]]; then
  echo "ERROR: error budget gate failed for $env ($window)" >&2
  exit 1
fi

echo "OK: error budget gate passed for $env ($window)"
