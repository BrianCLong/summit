#!/usr/bin/env bash
set -euo pipefail
RELEASE="${RELEASE:-summit}"
NAMESPACE="${NAMESPACE:-summit}"
echo "Rolling back $RELEASE in $NAMESPACE to previous revision…"
helm rollback "$RELEASE" 0 -n "$NAMESPACE"
