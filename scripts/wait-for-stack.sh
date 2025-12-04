#!/usr/bin/env bash

set -euo pipefail

# List of services to check. Each entry is a service name and its health check URL.
SERVICES=(
  "conductor-ui|http://localhost:3000"
  "api-gateway|http://localhost:4000/health/ready"
  "postgres|container"
  "neo4j|container"
)

TIMEOUT=120
INTERVAL=5

echo "Waiting for services to be healthy... (timeout: ${TIMEOUT}s)"

start_time=$(date +%s)

for service_info in "${SERVICES[@]}"; do
  IFS='|' read -r service_name service_check <<< "$service_info"

  is_healthy=false
  while [ $(($(date +%s) - start_time)) -lt $TIMEOUT ]; do
    if [ "$service_check" == "container" ]; then
      health_status=$(docker inspect --format '{{.State.Health.Status}}' "${service_name}" 2>/dev/null)
      if [ "$health_status" == "healthy" ]; then
        echo "✅ ${service_name} is healthy."
        is_healthy=true
        break
      fi
    else
      if curl --silent --fail "${service_check}" >/dev/null; then
        echo "✅ ${service_name} is healthy."
        is_healthy=true
        break
      fi
    fi

    echo "⏳ Waiting for ${service_name}..."
    sleep $INTERVAL
  done

  if [ "$is_healthy" = false ]; then
    echo "❌ Timeout waiting for ${service_name}."
    exit 1
  fi
done

echo "🎉 All services are healthy!"
exit 0
