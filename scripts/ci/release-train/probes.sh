#!/usr/bin/env bash
set -euo pipefail

env=""
mode=""
timeout=""

for arg in "$@"; do
  case "$arg" in
    --env=*) env="${arg#*=}" ;;
    --mode=*) mode="${arg#*=}" ;;
    --timeout=*) timeout="${arg#*=}" ;;
  esac
 done

if [[ -z "$env" || -z "$mode" ]]; then
  echo "Usage: $0 --env=<env> --mode=pre|post [--timeout=10m]" >&2
  exit 2
fi

health_url="${HEALTH_URL:-}"

if [[ -z "$health_url" ]]; then
  echo "Intentionally constrained probes: HEALTH_URL not set; skipping external checks for $env ($mode)."
  exit 0
fi

curl -fsSL "$health_url" >/dev/null

echo "OK: probes passed for $env ($mode)"
