#!/bin/bash
set -e

# Autoremediation: Scale Up Gateway
# Triggered by: GATEWAY_P95_BREACH
# Action: Increases replica count by 1 (max 10)

SERVICE="gateway"
MAX_REPLICAS=10

echo "Starting autoremediation for $SERVICE..."

# Get current replicas
CURRENT=$(kubectl get deploy $SERVICE -o=jsonpath='{.spec.replicas}')
echo "Current replicas: $CURRENT"

if [ "$CURRENT" -lt "$MAX_REPLICAS" ]; then
  NEW=$((CURRENT + 1))
  echo "Scaling to $NEW..."
  kubectl scale deploy $SERVICE --replicas=$NEW
  echo "Scaled successfully."
else
  echo "Max replicas ($MAX_REPLICAS) reached. Cannot scale further. Escalating..."
  exit 1
fi
