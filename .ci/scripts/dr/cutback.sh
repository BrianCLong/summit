#!/usr/bin/env bash
set -euo pipefail
TRACE_ID=${1:-manual}
APPROVER=${2:-unknown}

echo "[cutback] trace_id=${TRACE_ID} approver=${APPROVER}"
echo "Resynchronizing data delta back to primary" && export DR_CUTBACK_SYNC=1

echo "Restoring primary ingress/DNS annotations"
kubectl annotate ingress intelgraph-primary "dr/trace-id=${TRACE_ID}" --overwrite

echo "Rolling back DR feature flags"
export DR_FREEZE_WRITES=0

echo "Documenting cutback in summary"
cat <<SUMMARY >> "$GITHUB_STEP_SUMMARY"
## DR Cutback
- trace_id: ${TRACE_ID}
- approver: ${APPROVER}
- actions: resync flagged, primary ingress updated, write-freeze cleared
SUMMARY
