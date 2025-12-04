#!/usr/bin/env bash
set -euo pipefail
TTL_DAYS=${1:-7}
for ns in $(kubectl get ns -l pr=true -o jsonpath='{.items[*].metadata.name}'); do
  ago=$(kubectl get ns "$ns" -o jsonpath='{.metadata.creationTimestamp}')
  if [[ $(date -d "$ago" +%s) -lt $(date -d "$TTL_DAYS days ago" +%s) ]]; then
    echo "Deleting $ns (older than $TTL_DAYS days)"; kubectl delete ns "$ns" --wait=false;
  fi
done
