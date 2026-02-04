#!/bin/bash
set -e

NAMESPACE=${1:-summit-staging}

echo "Starting smoke test for namespace: $NAMESPACE"

# Port Forward API
echo "Port forwarding API..."
kubectl port-forward svc/intelgraph-api 4000:4000 -n $NAMESPACE &
API_PID=$!

# Port Forward Client
echo "Port forwarding Client..."
kubectl port-forward svc/companyos-console 3000:3000 -n $NAMESPACE &
CLIENT_PID=$!

# Wait for forwards
sleep 5

cleanup() {
  echo "Cleaning up..."
  kill $API_PID $CLIENT_PID || true
}
trap cleanup EXIT

# Check API Health
echo "Checking API Health..."
curl -f http://localhost:4000/health || echo "API Health Failed"

# Check Client Health
echo "Checking Client Health..."
curl -f http://localhost:3000/ || echo "Client Health Failed"

echo "Smoke test complete."
