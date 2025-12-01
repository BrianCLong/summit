#!/usr/bin/env bash
set -euo pipefail
NAMESPACE=${1:?ns}
RELEASE=${2:?release}
TIMEOUT=${3:-600}

# Placeholder: replace with real Prometheus query or SLO checker.
# For now, poll rollout ready-replicas growth as a proxy.
end=$((SECONDS+TIMEOUT))
while (( SECONDS < end )); do
  ready=$(kubectl -n "$NAMESPACE" get deploy "$RELEASE" -o jsonpath='{.status.readyReplicas}')
  desired=$(kubectl -n "$NAMESPACE" get deploy "$RELEASE" -o jsonpath='{.status.replicas}')
  if [[ "$ready" == "$desired" && -n "$ready" ]]; then
    echo "SLO proxy healthy (ready=$ready)"; exit 0
  fi
  sleep 10
  echo "waiting... (ready=$ready desired=$desired)"
done

echo "SLO not healthy in $TIMEOUT seconds" >&2
exit 1
