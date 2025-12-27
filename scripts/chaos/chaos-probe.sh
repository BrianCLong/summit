#!/usr/bin/env bash
set -euo pipefail

TARGET_HOST="127.0.0.1"
TARGET_PORT=${TARGET_PORT:-8000}
TARGET_URL="http://${TARGET_HOST}:${TARGET_PORT}"
LOG_DIR=${LOG_DIR:-chaos-artifacts}
mkdir -p "$LOG_DIR"

python -m http.server "${TARGET_PORT}" --bind "$TARGET_HOST" >"${LOG_DIR}/server.log" 2>&1 &
SERVER_PID=$!
trap 'kill ${SERVER_PID} >/dev/null 2>&1 || true' EXIT

sleep 2
curl -fsS "${TARGET_URL}" >/dev/null

echo "Injecting pause/resume chaos against PID ${SERVER_PID}" | tee "${LOG_DIR}/chaos.log"
(
  sleep 10
  kill -STOP "${SERVER_PID}" || true
  echo "server paused" >>"${LOG_DIR}/chaos.log"
  sleep 5
  kill -CONT "${SERVER_PID}" || true
  echo "server resumed" >>"${LOG_DIR}/chaos.log"
) &

LOAD_TEST_TARGET="$TARGET_URL" k6 run .github/k6/chaos-probe.js | tee "${LOG_DIR}/k6-chaos.log"
