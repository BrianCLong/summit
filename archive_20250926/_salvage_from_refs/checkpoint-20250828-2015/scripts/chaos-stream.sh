#!/bin/bash
# Simulates a consumer failure and recovery to test backpressure and consumer lag SLOs.

set -euo pipefail

NAMESPACE="intelgraph"
DEPLOYMENT="alerts-consumer"
REPLICAS=3

if ! command -v kubectl &> /dev/null; then
  echo "Error: kubectl is not installed or not in your PATH." >&2
  exit 1
fi

echo "Chaos Test: Simulating consumer failure for deployment '$DEPLOYMENT' in namespace '$NAMESPACE'..."

# Step 1: Scale down consumers to 0 to induce lag
echo "Scaling down deployment '$DEPLOYMENT' to 0 replicas..."
kubectl -n "$NAMESPACE" scale "deploy/$DEPLOYMENT" --replicas=0

echo "Waiting for 30 seconds to allow consumer lag to build up..."
sleep 30

# At this point, you should run a lag check or observe the Grafana dashboard.
echo "(INFO) Check consumer lag now. It should be increasing."

# Step 2: Scale consumers back up to their original count
echo "Scaling deployment '$DEPLOYMENT' back up to $REPLICAS replicas..."
kubectl -n "$NAMESPACE" scale "deploy/$DEPLOYMENT" --replicas=$REPLICAS

echo "Waiting for 60 seconds for consumers to recover..."
sleep 60

# At this point, lag should be decreasing and eventually return to normal.
echo "(INFO) Check consumer lag now. It should be recovering."

echo "Chaos test complete."
