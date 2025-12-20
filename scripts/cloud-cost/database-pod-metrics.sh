#!/bin/bash
# File: scripts/cloud-cost/database-pod-metrics.sh
# Description: Check Neo4j and Redis resource usage

echo "=== Self-Managed Database Pod Metrics ==="
echo ""

# Neo4j pods
echo "=== Neo4j Pods ==="
kubectl get pods -A -l app=neo4j -o json | jq -r '.items[] |
  "\(.metadata.namespace)/\(.metadata.name)"' | while read POD; do

  NAMESPACE=$(echo $POD | cut -d'/' -f1)
  POD_NAME=$(echo $POD | cut -d'/' -f2)

  echo "Pod: $POD"

  # Get resource requests and limits
  kubectl get pod -n $NAMESPACE $POD_NAME -o json | jq -r '
    .spec.containers[0].resources |
    "  Requests: \(.requests.cpu // "none") CPU, \(.requests.memory // "none") Memory\n  Limits: \(.limits.cpu // "none") CPU, \(.limits.memory // "none") Memory"'

  # Get actual usage
  USAGE=$(kubectl top pod -n $NAMESPACE $POD_NAME 2>/dev/null | tail -1)
  if [ -n "$USAGE" ]; then
    echo "  Actual: $USAGE"
  fi

  echo ""
done

# Redis pods
echo "=== Redis Pods ==="
kubectl get pods -A -l app=redis -o json | jq -r '.items[] |
  "\(.metadata.namespace)/\(.metadata.name)"' | while read POD; do

  NAMESPACE=$(echo $POD | cut -d'/' -f1)
  POD_NAME=$(echo $POD | cut -d'/' -f2)

  echo "Pod: $POD"

  # Get resource requests and limits
  kubectl get pod -n $NAMESPACE $POD_NAME -o json | jq -r '
    .spec.containers[0].resources |
    "  Requests: \(.requests.cpu // "none") CPU, \(.requests.memory // "none") Memory\n  Limits: \(.limits.cpu // "none") CPU, \(.limits.memory // "none") Memory"'

  # Get actual usage
  USAGE=$(kubectl top pod -n $NAMESPACE $POD_NAME 2>/dev/null | tail -1)
  if [ -n "$USAGE" ]; then
    echo "  Actual: $USAGE"
  fi

  # Redis-specific: Get memory usage from Redis itself
  REDIS_MEM=$(kubectl exec -n $NAMESPACE $POD_NAME -- redis-cli INFO memory 2>/dev/null | grep "used_memory_human" | cut -d':' -f2)
  if [ -n "$REDIS_MEM" ]; then
    echo "  Redis Memory: $REDIS_MEM"
  fi

  echo ""
done

echo "=== Recommendations ==="
echo "- Actual usage <50% of requests: Reduce resource requests"
echo "- Redis memory <50% of limit: Consider smaller instance or eviction policies"
