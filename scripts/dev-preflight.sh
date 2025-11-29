#!/usr/bin/env bash
set -uo pipefail

# Required ports for the stack
# 3000: Client
# 4000: API
# 5432: Postgres
# 6379: Redis
# 7474, 7687: Neo4j
# 8080: Gateway/Other
PORTS=("3000" "4000" "5432" "6379" "7474" "7687" "8080")
FAILED=0

echo "Checking port availability..."

for port in "${PORTS[@]}"; do
  # Check if port is in use
  # nc -z returns 0 if connection succeeds (port open/listening)
  if nc -z 127.0.0.1 "$port" 2>/dev/null; then
    echo "❌ Port $port is already in use"
    FAILED=1
  fi
done

if [ "$FAILED" -eq 1 ]; then
  echo ""
  echo "⚠️  Ports in use detected."
  echo "   'make up' requires these ports to be free to start services."
  echo "   Run 'make down' to stop existing containers, or check other processes."
  echo "   On Mac/Linux: lsof -i :<port>"
  exit 1
fi

echo "✅ All required ports are free."
