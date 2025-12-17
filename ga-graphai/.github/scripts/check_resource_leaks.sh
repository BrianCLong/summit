#!/usr/bin/env bash
set -euo pipefail

if ! command -v lsof >/dev/null 2>&1; then
  echo "lsof is required for leak detection; install it in the runner image." >&2
  exit 1
fi

if ! command -v pgrep >/dev/null 2>&1; then
  echo "pgrep is required for leak detection; install procps in the runner image." >&2
  exit 1
fi

if ! command -v ps >/dev/null 2>&1; then
  echo "ps is required for leak detection; install procps in the runner image." >&2
  exit 1
fi

IFS=' ' read -r -a ports_db <<<"${DB_PORTS:-5432 5433 5434 3306 27017 1521}"
IFS=' ' read -r -a ports_redis <<<"${REDIS_PORTS:-6379 6380}"

socket_threshold=${SOCKET_THRESHOLD:-0}
file_handle_threshold=${FILE_HANDLE_THRESHOLD:-50}
leak=0

count_connections() {
  local pid="$1"
  shift
  local total=0
  for port in "$@"; do
    local count
    count=$(lsof -Pan -p "$pid" -iTCP:"$port" -sTCP:ESTABLISHED 2>/dev/null | tail -n +2 | wc -l | tr -d ' ')
    total=$((total + count))
  done
  echo "$total"
}

current_user=$(id -u)
mapfile -t candidate_pids < <(pgrep -u "$current_user" -f "node|python" || true)

if [ ${#candidate_pids[@]} -eq 0 ]; then
  echo "No lingering Node or Python processes to inspect for leaks."
  exit 0
fi

echo "Inspecting ${#candidate_pids[@]} process(es) for leaked resources..."

for pid in "${candidate_pids[@]}"; do
  cmd=$(ps -p "$pid" -o cmd= | sed 's/^ *//')
  db_connections=$(count_connections "$pid" "${ports_db[@]}")
  redis_connections=$(count_connections "$pid" "${ports_redis[@]}")
  socket_handles=$(lsof -Pan -p "$pid" -i 2>/dev/null | tail -n +2 | wc -l | tr -d ' ')
  file_handles=$(lsof -Pan -p "$pid" -Fn 2>/dev/null | grep '^n/' | wc -l | tr -d ' ')

  echo "::group::PID $pid ($cmd)"
  echo "DB connections (common ports): $db_connections"
  echo "Redis connections: $redis_connections"
  echo "Open sockets (threshold: $socket_threshold): $socket_handles"
  echo "Open file handles (threshold: $file_handle_threshold): $file_handles"

  if (( db_connections > 0 || redis_connections > 0 || socket_handles > socket_threshold || file_handles > file_handle_threshold )); then
    leak=1
    echo "Potential leak detected for PID $pid — dumping open handles for debugging:"
    lsof -Pan -p "$pid"
  else
    echo "No leak signatures detected for PID $pid."
  fi
  echo "::endgroup::"
done

if (( leak > 0 )); then
  echo "Resource leaks detected. See log groups above for details." >&2
  exit 1
fi

echo "No resource leaks detected across inspected processes."
