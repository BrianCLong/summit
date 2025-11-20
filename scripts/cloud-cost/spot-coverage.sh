#!/bin/bash
# File: scripts/cloud-cost/spot-coverage.sh
# Description: Calculate percentage of workloads on spot instances

echo "=== Spot Instance Coverage Report ==="

TOTAL_NODES=$(kubectl get nodes --no-headers | wc -l)
SPOT_NODES=$(kubectl get nodes -l node.kubernetes.io/instance-type-spot=true --no-headers 2>/dev/null | wc -l)

# Alternative label check
if [ $SPOT_NODES -eq 0 ]; then
  SPOT_NODES=$(kubectl get nodes -l eks.amazonaws.com/capacityType=SPOT --no-headers 2>/dev/null | wc -l)
fi

SPOT_PERCENTAGE=$(echo "scale=2; $SPOT_NODES / $TOTAL_NODES * 100" | bc)

echo "Total Nodes: $TOTAL_NODES"
echo "Spot Nodes: $SPOT_NODES"
echo "Spot Coverage: ${SPOT_PERCENTAGE}%"
echo ""

if (( $(echo "$SPOT_PERCENTAGE < 50" | bc -l) )); then
  echo "⚠️  Spot coverage is below 50% - consider increasing spot adoption"
  echo "   Target: 70% of non-critical workloads"
fi

echo ""
echo "=== Workloads NOT tolerating spot instances ==="
kubectl get pods -A -o json | jq -r '.items[] |
  select(.spec.tolerations // [] |
    all(.key != "node.kubernetes.io/instance-type-spot" and .key != "eks.amazonaws.com/capacityType")
  ) |
  "\(.metadata.namespace)/\(.metadata.name)"' | head -20

echo ""
echo "Consider adding spot tolerations to stateless workloads"
