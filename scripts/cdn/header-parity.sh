#!/usr/bin/env bash
set -euo pipefail
urls=("/" "/assets/" "/releases/v24")
for u in "${urls[@]}"; do
  echo "== $u =="
  curl -sI https://docs.example$u | grep -Ei 'cache-control|content-encoding|etag'
  curl -sI https://backup.docs.example$u | grep -Ei 'cache-control|content-encoding|etag'
  echo
done