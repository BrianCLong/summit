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

print_container_debug() {
  local name="$1"
  if ! command -v docker >/dev/null 2>&1; then
    echo "ℹ️  Docker CLI not available; cannot inspect ${name}."
    return
  fi

  echo "ℹ️  ${name} inspect:" && docker inspect --format 'State={{.State.Status}} Health={{.State.Health.Status}} StartedAt={{.State.StartedAt}}' "${name}" || true
  echo "ℹ️  Last 5 log lines for ${name}:"
  docker logs --tail 5 "${name}" 2>&1 || true
}

describe_http_failure() {
  local url="$1"
  local status="$2"
  local latency="$3"
  echo "ℹ️  Last HTTP status: ${status}, latency: ${latency}s from ${url}"
}

for service_info in "${SERVICES[@]}"; do
  IFS='|' read -r service_name service_check <<< "$service_info"

  is_healthy=false
  last_error=""
  while [ $(($(date +%s) - start_time)) -lt $TIMEOUT ]; do
    if [ "$service_check" == "container" ]; then
      health_status=$(docker inspect --format '{{.State.Health.Status}}' "${service_name}" 2>/dev/null)
      if [ "$health_status" == "healthy" ]; then
        echo "✅ ${service_name} is healthy."
        is_healthy=true
        break
      fi
      last_error="Health status: ${health_status:-unknown}"
    else
      http_meta=$(mktemp)
      if curl --silent --fail --output /dev/null --write-out "%{http_code} %{time_total}" "${service_check}" >"${http_meta}"; then
        read -r http_code latency <"${http_meta}"
        echo "✅ ${service_name} responded ${http_code} in ${latency}s."
        is_healthy=true
        rm -f "${http_meta}"
        break
      else
        if read -r http_code latency <"${http_meta}"; then
          last_error="HTTP ${http_code:-000} after ${latency:-0}s"
        else
          last_error="HTTP probe failed to connect"
        fi
        rm -f "${http_meta}"
      fi
    fi

    echo "⏳ Waiting for ${service_name}... (${last_error:-no status yet})"
    sleep $INTERVAL
  done

  if [ "$is_healthy" = false ]; then
    echo "❌ Timeout waiting for ${service_name}. ${last_error:-no probe data collected.}"
    if [ "$service_check" == "container" ]; then
      print_container_debug "$service_name"
    else
      describe_http_failure "$service_check" ${last_error:-unknown} "-"
    fi
    exit 1
  fi
done

echo "🎉 All services are healthy!"
exit 0
