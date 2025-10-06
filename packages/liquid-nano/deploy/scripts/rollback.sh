#!/usr/bin/env bash
set -euo pipefail
if [ $# -lt 1 ]; then
  echo "Usage: rollback.sh <deployment-name> [namespace]" >&2
  exit 1
fi
DEPLOYMENT="$1"
NAMESPACE="${2:-default}"

kubectl rollout undo deployment "$DEPLOYMENT" -n "$NAMESPACE"
