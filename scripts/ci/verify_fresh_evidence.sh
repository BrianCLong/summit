#!/usr/bin/env bash
# scripts/ci/verify_fresh_evidence.sh
set -euo pipefail
summary="$1" # path to summary.json
now="$(date -u +%s)"
build="$(jq -r '.evidence.buildTime' "$summary" | xargs -I{} date -u -d {} +%s)"
age=$(( now - build ))
jq -e '.evidence.verified == true' "$summary" >/dev/null
test $age -le 86400  # 24h
