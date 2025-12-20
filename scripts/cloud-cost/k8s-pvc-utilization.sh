#!/bin/bash
# File: scripts/cloud-cost/k8s-pvc-utilization.sh
# Description: Identify over-provisioned Persistent Volume Claims

echo "=== Kubernetes PVC Utilization Report ==="
echo ""

# Get all PVCs
kubectl get pvc -A -o json | jq -r '.items[] |
  "\(.metadata.namespace)|\(.metadata.name)|\(.spec.resources.requests.storage)"' |
while IFS='|' read -r NAMESPACE NAME SIZE; do

  echo "=== PVC: $NAMESPACE/$NAME (Requested: $SIZE) ==="

  # Find pod using this PVC
  POD=$(kubectl get pods -n $NAMESPACE -o json | jq -r --arg pvc "$NAME" '
    .items[] |
    select(.spec.volumes[]?.persistentVolumeClaim.claimName == $pvc) |
    .metadata.name' | head -1)

  if [ -z "$POD" ]; then
    echo "  ❌ No pod using this PVC (orphaned?)"
  else
    echo "  Pod: $POD"

    # Get actual disk usage (requires df in container)
    MOUNT_PATH=$(kubectl get pod -n $NAMESPACE $POD -o json | jq -r --arg pvc "$NAME" '
      .spec.volumes[] |
      select(.persistentVolumeClaim.claimName == $pvc) |
      .name' | head -1)

    # Attempt to get usage
    USAGE=$(kubectl exec -n $NAMESPACE $POD -- df -h 2>/dev/null | grep -v "Filesystem" | awk '{print $5}' | head -1)

    if [ -n "$USAGE" ]; then
      echo "  Usage: $USAGE"
      USAGE_NUM=$(echo $USAGE | sed 's/%//')
      if [ "$USAGE_NUM" -lt 50 ]; then
        echo "  ⚠️  Low utilization - consider reducing PVC size"
      fi
    else
      echo "  Unable to determine usage (pod may not have df command)"
    fi
  fi

  echo ""
done

echo "=== Recommendations ==="
echo "- PVCs with <50% usage: Reduce size to save on EBS costs"
echo "- Orphaned PVCs: Delete if no longer needed"
echo "- Use gp3 storage class instead of gp2"
