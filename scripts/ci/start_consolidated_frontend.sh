#!/bin/bash
set -e

# Defaults
PORT=${PORT:-3000}
TIMEOUT=${TIMEOUT:-120}
BASE_URL=${BASE_URL:-http://localhost:$PORT}

echo "Starting consolidated frontend stack..."

# Start Server
echo "Starting Server..."
npm run server:dev > server_start.log 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"

# Start Client
echo "Starting Client..."
npm run client:dev > client_start.log 2>&1 &
CLIENT_PID=$!
echo "Client PID: $CLIENT_PID"

echo "Waiting for $BASE_URL to be ready (timeout: ${TIMEOUT}s)..."
count=0
while ! curl -s "$BASE_URL" > /dev/null; do
  if [ "$count" -ge "$TIMEOUT" ]; then
    echo "Timeout waiting for frontend to start."
    echo "=== Client Log ==="
    tail -n 20 client_start.log
    echo "=== Server Log ==="
    tail -n 20 server_start.log

    kill $SERVER_PID || true
    kill $CLIENT_PID || true
    exit 1
  fi
  sleep 1
  count=$((count+1))
  echo -n "."
done

echo ""
echo "Frontend is ready at $BASE_URL"
export BASE_URL
