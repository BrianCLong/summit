#!/usr/bin/env bash
set -uo pipefail

echo "🔍 Running enhanced preflight checks..."

# 1. Check Node version
REQUIRED_NODE_MAJOR=20
if command -v node >/dev/null 2>&1; then
  CURRENT_NODE=$(node -v)
  CURRENT_MAJOR=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
  if (( CURRENT_MAJOR < REQUIRED_NODE_MAJOR )); then
    echo "❌ Required Node version >= v$REQUIRED_NODE_MAJOR, but found $CURRENT_NODE"
    exit 1
  fi
  echo "✅ Node version $CURRENT_NODE is valid."
else
  echo "❌ node is not installed."
  exit 1
fi

# 2. Check Docker
if command -v docker >/dev/null 2>&1; then
  if ! docker info &> /dev/null; then
    echo "❌ Docker daemon is not running."
    exit 1
  fi
  echo "✅ Docker is running."
else
  echo "❌ docker is not installed."
  exit 1
fi

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

# Check for nc or alternative
check_port() {
  local port=$1
  if command -v nc >/dev/null 2>&1; then
    nc -z 127.0.0.1 "$port" 2>/dev/null
    return $?
  else
    # Fallback to bash /dev/tcp
    if command -v timeout >/dev/null 2>&1; then
      timeout 1 bash -c "cat < /dev/null > /dev/tcp/127.0.0.1/$port" 2>/dev/null
      return $?
    else
      bash -c "cat < /dev/null > /dev/tcp/127.0.0.1/$port" 2>/dev/null
      return $?
    fi
  fi
}

for port in "${PORTS[@]}"; do
  if check_port "$port"; then
    echo "❌ Port $port is already in use"
    FAILED=1
  fi
done

if [ "$FAILED" -eq 1 ]; then
  echo ""
  echo "⚠️  Ports in use detected."
  if [ "${CI:-}" == "true" ] || [ "${GITHUB_ACTIONS:-}" == "true" ]; then
    echo "   Running in CI environment - proceeding with caution."
    echo "   Services might be managed by CI orchestration."
    exit 0
  else
    echo "   'make up' requires these ports to be free to start services."
    echo "   Run 'make down' to stop existing containers, or check other processes."
    echo "   On Mac/Linux: lsof -i :<port>"
    exit 1
  fi
fi

echo "✅ All required ports are free."
