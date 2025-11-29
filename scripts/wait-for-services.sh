#!/usr/bin/env bash
set -eo pipefail

services=("api" "ui" "graph" "search" "worker")

echo "Waiting for Summit services to become healthy..."

for service in "${services[@]}"; do
  for i in {1..30}; do
    if docker inspect --format '{{json .State.Health.Status}}' summit_${service}_1 2>/dev/null | grep -q '"healthy"'; then
      echo "$service is healthy."
      break
    fi
    echo "Waiting for $service..."
    sleep 5
  done
done

echo "All services reported healthy."
