#!/bin/bash
# File: scripts/cloud-cost/eks-node-utilization.sh
# Description: Identify under-utilized EKS nodes

echo "=== EKS Node Utilization Report ==="
echo "Generated: $(date)"
echo ""

# Get all nodes
kubectl get nodes -o json | jq -r '.items[] |
  .metadata.name as $node |
  .status.allocatable.cpu as $cpu |
  .status.allocatable.memory as $mem |
  "Node: \($node)\nAllocatable CPU: \($cpu)\nAllocatable Memory: \($mem)\n---"'

echo ""
echo "=== Pod Resource Requests vs. Allocatable ==="

# Get resource requests per node
kubectl describe nodes | grep -A 5 "Allocated resources" | grep -E "(cpu|memory)" | head -20

echo ""
echo "=== Nodes with <40% CPU Utilization (Last 6 Hours) ==="

# Requires metrics-server installed
kubectl top nodes | awk '{if (NR>1 && $3+0 < 40) print $0}'

echo ""
echo "=== Recommendations ==="
echo "- Nodes with <40% CPU: Consider downsizing instance type"
echo "- Nodes with <20% CPU: Candidate for spot instances or removal"
echo "- Check if HPA is properly configured to scale down during off-peak"
