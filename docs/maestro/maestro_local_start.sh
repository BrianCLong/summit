#!/usr/bin/env bash
set -euo pipefail

# ===== Maestro Local Quickstart (Docker Compose) =====
# Usage:
#   ./maestro_local_start.sh [API_URL]
# Example:
#   ./maestro_local_start.sh http://localhost:8080/healthz

API_URL="${1:-${API:-http://localhost:8080/healthz}}"

# 0) Prereqs
for b in docker curl jq; do
  command -v "$b" >/dev/null || { echo "Missing dependency: $b"; exit 1; }
done

# 1) Detect compose files
BASE_FILE=""
for f in docker-compose.yml docker-compose.yaml; do
  if [[ -f "$f" ]]; then BASE_FILE="$f"; break; fi
done
[[ -n "$BASE_FILE" ]] || { echo "❌ No docker-compose.yml/.yaml found in $(pwd)"; exit 1; }

OBS_ARG=()
for o in docker-compose.observability.yml docker-compose.observability.yaml; do
  if [[ -f "$o" ]]; then OBS_ARG=(-f "$o"); break; fi
done

# 2) .env bootstrap
if [[ -f .env.example && ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example (edit if needed)."
fi

# 3) Bring up the stack
echo "Starting with: docker compose -f $BASE_FILE ${OBS_ARG[*]:-} up -d"
docker compose -f "$BASE_FILE" "${OBS_ARG[@]}" up -d

# 4) Wait for API health
printf "Waiting for Maestro API at %s " "$API_URL"
for i in $(seq 1 60); do
  if curl -fsS "$API_URL" >/dev/null; then echo "✅"; break; fi
  printf "."; sleep 2
  if [[ "$i" -eq 60 ]]; then echo "❌ Timeout waiting for API at $API_URL"; docker compose ps; exit 1; fi
done

# 5) Show status & quick tips
docker compose ps
cat <<'EOF'

Endpoints (adjust if you customized ports in .env):
- Maestro API:        ${API_URL%/healthz}
- Prometheus:         http://localhost:9090
- Grafana:            http://localhost:3000

Useful commands:
  docker compose logs -f
  docker compose ps
  docker compose down -v

EOF
