#!/bin/bash
<<<<<<< HEAD
# Starts the frontend and waits for it to be ready.
set -e

# Default to http://localhost:3000
BASE_URL=${BASE_URL:-http://localhost:3000}

echo "Starting consolidated frontend..."

# Check if port 3000 is already in use
if lsof -i :3000 -t >/dev/null; then
  echo "Port 3000 is already in use. Assuming frontend is running."
else
  echo "Port 3000 is free. Starting dev server..."
  # Use pm2 or nohup. Using nohup for simplicity.
  # Assuming running from root.
  nohup npm run dev > frontend_start.log 2>&1 &
  SERVER_PID=$!
  echo "Server started with PID $SERVER_PID. Logs in frontend_start.log."
fi

# Wait for readiness
echo "Waiting for $BASE_URL to be ready..."
RETRIES=60
while [ $RETRIES -gt 0 ]; do
  if curl -s -I "$BASE_URL" >/dev/null; then
    echo "Frontend is ready at $BASE_URL!"
    exit 0
  fi
  sleep 2
  RETRIES=$((RETRIES - 1))
done

echo "Frontend failed to start within timeout."
cat frontend_start.log || true
exit 1
=======
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
>>>>>>> 50f8d7925a (feat: add golden path E2E test harness for consolidated frontend)
