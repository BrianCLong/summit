#!/usr/bin/env bash
set -euo pipefail
TRACE_ID=${1:-manual}
APPROVER=${2:-unknown}

echo "[failover] trace_id=${TRACE_ID} approver=${APPROVER}"
echo "Enforcing write freeze via feature flag" && export DR_FREEZE_WRITES=1

echo "Applying Helm DR overrides"
helm upgrade --install intelgraph deploy/helm/intelgraph --namespace dr --values deploy/helm/intelgraph/values-dr.yaml --set dr.traceId=${TRACE_ID}

echo "Updating ingress/DNS annotations for DR region"
kubectl annotate ingress intelgraph-dr "dr/trace-id=${TRACE_ID}" --overwrite

cat <<SUMMARY >> "$GITHUB_STEP_SUMMARY"
## DR Failover
- trace_id: ${TRACE_ID}
- approver: ${APPROVER}
- actions: write-freeze, helm override apply, ingress annotation updated
SUMMARY
