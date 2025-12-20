#!/bin/bash
# File: scripts/cloud-cost/inter-az-traffic.sh
# Description: Identify pods communicating across availability zones

echo "=== Inter-AZ Traffic Analysis ==="
echo ""

# Get nodes and their AZs
echo "=== Node Distribution by AZ ==="
kubectl get nodes -o json | jq -r '.items[] |
  "\(.metadata.labels."topology.kubernetes.io/zone" // .metadata.labels."failure-domain.beta.kubernetes.io/zone") |\(.metadata.name)"' |
sort | uniq -c

echo ""
echo "=== Pods NOT using topology-aware scheduling ==="

# Check for pods without topology spread constraints
kubectl get pods -A -o json | jq -r '
  .items[] |
  select(.spec.topologySpreadConstraints == null) |
  "\(.metadata.namespace)/\(.metadata.name)"' | head -20

echo ""
echo "=== Services without topology-aware hints ==="

# Check services without topology annotations
kubectl get services -A -o json | jq -r '
  .items[] |
  select(.metadata.annotations."service.kubernetes.io/topology-aware-hints" != "auto") |
  "\(.metadata.namespace)/\(.metadata.name)"'

echo ""
echo "=== Recommendations ==="
echo "- Enable topology-aware hints for Services to prefer same-AZ routing"
echo "- Use Pod Topology Spread Constraints to balance pods across AZs"
echo "- For stateful apps, use StatefulSet with volumeClaimTemplates in same AZ"
echo "- Inter-AZ data transfer costs: \$0.01/GB in, \$0.01/GB out"
