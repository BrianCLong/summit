#!/usr/bin/env bash
set -euo pipefail
HEALTH_URL=${STACK_HEALTH_URL:-http://localhost:4000/health}
READY_URL=${STACK_READY_URL:-http://localhost:4000/health/ready}
DETAILED_URL=${STACK_DETAILED_URL:-http://localhost:4000/health/detailed}
METRICS_URL=${STACK_METRICS_URL:-http://localhost:4000/metrics}
MAX_ATTEMPTS=${STACK_MAX_ATTEMPTS:-40}
SLEEP_SECONDS=${STACK_POLL_SECONDS:-5}
PORTS=("localhost:5432" "localhost:7687" "localhost:6379" "localhost:4100")
function log() {
  printf '[wait-for-stack] %s\n' "$1"
}
function ping_url() {
  local target=$1
  curl -fsS --max-time 5 "$target" >/dev/null 2>&1
}
function check_ports() {
  local healthy=0
  for entry in "${PORTS[@]}"; do
    local host=${entry%%:*}
    local port=${entry##*:}
    if ! nc -z "$host" "$port" >/dev/null 2>&1; then
      healthy=1
      break
    fi
  done
  return $healthy
}
for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
  if ping_url "$HEALTH_URL" && ping_url "$READY_URL" && ping_url "$DETAILED_URL" && ping_url "$METRICS_URL"; then
    if check_ports; then
      log "stack healthy after ${attempt} attempt(s)"
      exit 0
    fi
  fi
  log "waiting for containers (attempt ${attempt}/${MAX_ATTEMPTS})"
  sleep "$SLEEP_SECONDS"
done
log "stack failed health checks"
if [ -x "$(dirname "$0")/run-compose.sh" ]; then
  "$(dirname "$0")/run-compose.sh" ps || true
fi
exit 1
