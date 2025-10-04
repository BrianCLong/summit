#!/usr/bin/env bash
set -euo pipefail
OWNER="BrianCLong"
TARGET=104
retries=8; d=1
while :; do
  count=$(gh project item-list 8 --owner "$OWNER" --limit 500 --format json | jq '.items | length')
  [[ "$count" =~ ^[0-9]+$ ]] || { echo "⚠️ bad count: $count"; }
  echo "Project #8 count: $count"
  if [[ $count -eq $TARGET ]]; then echo "✅ 104/104"; exit 0; fi
  ((retries--)) || { echo "⚠️ Could not confirm 104 (last=$count)"; exit 1; }
  sleep $d; d=$((d*2)); [[ $d -gt 32 ]] && d=32
done