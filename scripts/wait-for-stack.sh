#!/usr/bin/env bash
set -euo pipefail
HEALTH_URL=${STACK_HEALTH_URL:-http://localhost:4000/health}
READY_URL=${STACK_READY_URL:-http://localhost:4000/health/ready}
DETAILED_URL=${STACK_DETAILED_URL:-http://localhost:4000/health/detailed}
METRICS_URL=${STACK_METRICS_URL:-http://localhost:4000/metrics}
MAX_ATTEMPTS=${STACK_MAX_ATTEMPTS:-40}
SLEEP_SECONDS=${STACK_POLL_SECONDS:-5}
PORTS=("localhost:5432" "localhost:7687" "localhost:6379" "localhost:4100")
PORT_NAMES=("PostgreSQL" "Neo4j" "Redis" "Gateway")

function log() {
  printf '[wait-for-stack] %s\n' "$1"
}

function log_error() {
  printf '\033[31m[wait-for-stack] ERROR: %s\033[0m\n' "$1" >&2
}

function log_warn() {
  printf '\033[33m[wait-for-stack] WARN: %s\033[0m\n' "$1" >&2
}

function ping_url() {
  local target=$1
  curl -fsS --max-time 5 "$target" >/dev/null 2>&1
}

function check_ports() {
  local all_healthy=0
  local failed_services=()

  for i in "${!PORTS[@]}"; do
    local entry="${PORTS[$i]}"
    local name="${PORT_NAMES[$i]}"
    local host=${entry%%:*}
    local port=${entry##*:}

    if ! nc -z "$host" "$port" >/dev/null 2>&1; then
      all_healthy=1
      failed_services+=("$name (port $port)")
    fi
  done

  if [ ${#failed_services[@]} -gt 0 ]; then
    log_warn "Unhealthy services: ${failed_services[*]}"
  fi

  return $all_healthy
}

function diagnose_failure() {
  log_error "Stack failed to become healthy after ${MAX_ATTEMPTS} attempts"
  echo ""
  echo "Diagnostics:"
  echo ""

  # Check each health endpoint
  for url in "$HEALTH_URL" "$READY_URL" "$DETAILED_URL" "$METRICS_URL"; do
    if curl -fsS --max-time 5 "$url" >/dev/null 2>&1; then
      echo "  ✓ $url responding"
    else
      echo "  ✗ $url NOT responding"
    fi
  done

  echo ""
  echo "Port status:"
  for i in "${!PORTS[@]}"; do
    local entry="${PORTS[$i]}"
    local name="${PORT_NAMES[$i]}"
    local host=${entry%%:*}
    local port=${entry##*:}

    if nc -z "$host" "$port" >/dev/null 2>&1; then
      echo "  ✓ $name ($port) listening"
    else
      echo "  ✗ $name ($port) NOT listening"
    fi
  done

  echo ""
  echo "Next steps:"
  echo "  1. Check container status: docker-compose ps"
  echo "  2. View API logs: docker-compose logs api"
  echo "  3. Check detailed health: curl http://localhost:4000/health/detailed | jq"
  echo "  4. Verify .env file exists and has valid values"
  echo "  5. Ensure Docker has 8GB+ memory allocated"
}

log "Waiting for stack to be healthy (max ${MAX_ATTEMPTS} attempts, ${SLEEP_SECONDS}s between checks)..."

for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
  # Check HTTP health endpoints
  if ping_url "$HEALTH_URL" && ping_url "$READY_URL" && ping_url "$DETAILED_URL" && ping_url "$METRICS_URL"; then
    # Check port connectivity
    if check_ports; then
      log "Stack healthy after ${attempt} attempt(s) ✓"
      exit 0
    fi
  fi

  # Progress indicator every 5 attempts
  if [ $((attempt % 5)) -eq 0 ] || [ "$attempt" -eq 1 ]; then
    log "Waiting for services... (attempt ${attempt}/${MAX_ATTEMPTS})"
  fi

  sleep "$SLEEP_SECONDS"
done

# Failed - provide diagnostics
diagnose_failure

# Show container status if available
if [ -x "$(dirname "$0")/run-compose.sh" ]; then
  echo ""
  echo "Container status:"
  "$(dirname "$0")/run-compose.sh" ps || true
fi

exit 1
