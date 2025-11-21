#!/bin/bash
# File: scripts/cloud-cost/gpu-utilization.sh
# Description: Monitor GPU usage and identify waste

echo "=== GPU Utilization Report ==="

# Find all pods requesting GPUs
GPU_PODS=$(kubectl get pods -A -o json | jq -r '.items[] |
  select(.spec.containers[].resources.limits."nvidia.com/gpu" != null) |
  "\(.metadata.namespace)/\(.metadata.name)"')

if [ -z "$GPU_PODS" ]; then
  echo "No GPU pods found"
  exit 0
fi

echo "GPU Pods:"
echo "$GPU_PODS"
echo ""

# For each GPU pod, check utilization
for POD in $GPU_PODS; do
  NAMESPACE=$(echo $POD | cut -d'/' -f1)
  POD_NAME=$(echo $POD | cut -d'/' -f2)

  echo "=== Checking $POD_NAME in $NAMESPACE ==="

  # Execute nvidia-smi in the pod
  kubectl exec -n $NAMESPACE $POD_NAME -- nvidia-smi --query-gpu=utilization.gpu,utilization.memory,temperature.gpu --format=csv,noheader 2>/dev/null || echo "Unable to query GPU (pod may not have nvidia-smi)"

  echo ""
done

echo "=== Recommendations ==="
echo "- GPU utilization <20%: Consider batch processing or CPU-based inference"
echo "- Tesla K80: Upgrade to T4 (3x cheaper) or A10G (5x faster)"
echo "- Memory utilization <30%: Model may fit on smaller GPU"
