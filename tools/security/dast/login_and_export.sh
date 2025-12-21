#!/usr/bin/env bash
set -euo pipefail
if [[ -z "${DAST_USERNAME:-}" || -z "${DAST_PASSWORD:-}" ]]; then
  echo "DAST credentials not set" >&2
  exit 1
fi
curl -c tools/security/dast/auth.cookie \
  -X POST "${DAST_TARGET:-https://staging.intelgraph.local}/login" \
  -d "username=${DAST_USERNAME}&password=${DAST_PASSWORD}" \
  -H "Content-Type: application/x-www-form-urlencoded"
