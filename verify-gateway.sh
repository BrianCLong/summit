#!/bin/bash
echo "Verifying API Gateway and Subgraphs..."

check_health() {
  url=$1
  service=$2
  echo "Checking $service at $url..."
  if curl -s -f "$url" > /dev/null; then
    echo "✅ $service is healthy"
  else
    echo "❌ $service is failing"
  fi
}

check_health "http://localhost:4000/health/ready" "API Gateway"
check_health "http://localhost:4010/health" "Prov Ledger"
check_health "http://localhost:4012/health" "Agent Runtime"
check_health "http://localhost:4011/health" "Graph XAI"

echo "Done."
