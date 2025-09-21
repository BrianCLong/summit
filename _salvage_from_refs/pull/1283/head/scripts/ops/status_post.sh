#!/usr/bin/env bash
set -euo pipefail
stage="${1:-unknown}"
status="${2:-started}"
tag="${3:-$(git describe --tags --always 2>/dev/null || echo 'n/a')}"
payload=$(jq -n --arg s "$stage" --arg st "$status" --arg t "$tag" \
  '{text: ("GA canary *" + $s + "* " + $st + " (" + $t + ")")}')
curl -sS -X POST -H 'Content-type: application/json' \
  --data "$payload" "${SLACK_WEBHOOK_URL:?missing SLACK_WEBHOOK_URL}"
echo "posted: $stage $status $tag"

