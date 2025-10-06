#!/usr/bin/env bash
set -euo pipefail
PORT="${1:-8080}"
SAMPLE='{"reading":22.1,"unit":"C"}'
curl -sSf -X POST "http://127.0.0.1:${PORT}" \
  -H 'Content-Type: application/json' \
  -d "$SAMPLE"
echo
