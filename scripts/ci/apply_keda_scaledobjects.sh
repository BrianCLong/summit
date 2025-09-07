#!/usr/bin/env bash
set -euo pipefail

CHART_DIR=${1:-helm/worker-python}
NAMESPACE=${NAMESPACE:-intelgraph}

echo "[KEDA] Applying ScaledObjects in $CHART_DIR to namespace $NAMESPACE"
kubectl -n "$NAMESPACE" apply -f "$CHART_DIR/templates/keda-scaledobject.yaml"
echo "[KEDA] Done"

