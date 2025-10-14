#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/ops/compose/.env"
COMPOSE_YML="$ROOT/ops/compose/docker-compose.yml"

cd "$ROOT"

echo "==> scanning for Dockerfiles…"

API_FILE=""
if [ -f "services/api/Dockerfile" ]; then
    API_FILE="services/api/Dockerfile"
elif [ -f "backend/api/Dockerfile" ]; then
    API_FILE="backend/api/Dockerfile"
elif [ -f "api/Dockerfile" ]; then
    API_FILE="api/Dockerfile"
else
    API_FILE=$(find api -name "Dockerfile" -type f | head -n1 || true)
fi

WEB_FILE=""
if [ -f "webapp/Dockerfile" ]; then
    WEB_FILE="webapp/Dockerfile"
elif [ -f "services/web/Dockerfile" ]; then
    WEB_FILE="services/web/Dockerfile"
elif [ -f "apps/web/Dockerfile" ]; then
    WEB_FILE="apps/web/Dockerfile"
elif [ -f "web/Dockerfile" ]; then
    WEB_FILE="web/Dockerfile"
fi

echo "   API_DOCKERFILE: ${API_FILE:-<none>}"
echo "   WEB_DOCKERFILE: ${WEB_FILE:-<none>}"

if [[ -z "${API_FILE:-}" || -z "${WEB_FILE:-}" ]]; then
  echo "!! Could not detect both API & WEB Dockerfiles. Candidates:"
  find . -type f -iname 'Dockerfile*' -o -iname '*Dockerfile*' | sed 's|^./||' | sort
  exit 1
fi

# determine web container port from Dockerfile
WEB_PORT_CTN=""
if grep -qi '^FROM .*nginx' "$WEB_FILE"; then
  WEB_PORT_CTN="80"
fi
if [[ -z "$WEB_PORT_CTN" ]]; then
  # look for EXPOSE; take the first integer
  EXPOSE_LINE="$(grep -iE '^\s*EXPOSE\s+' "$WEB_FILE" | head -n1 || true)"
  if [[ -n "$EXPOSE_LINE" ]]; then
    WEB_PORT_CTN="$(echo "$EXPOSE_LINE" | grep -oE '[0-9]+' | head -n1 || true)"
  fi
fi
# default fallback
WEB_PORT_CTN="${WEB_PORT_CTN:-5173}"

echo "   Detected web container port: $WEB_PORT_CTN"

echo "==> updating $ENV_FILE"
cp "$ENV_FILE" "$ENV_FILE.bak.$(date -u +%Y%m%d-%H%M%S)" || true
# ensure contexts to repo root (from ops/compose/)
sed -i -E 's,^API_CONTEXT=.*,API_CONTEXT=../..,g' "$ENV_FILE" || true
sed -i -E 's,^WEB_CONTEXT=.*,WEB_CONTEXT=../..,g' "$ENV_FILE" || true

# set Dockerfile paths
api_esc=$(printf '%s' "$API_FILE" | sed 's,[&/],\\&,g')
web_esc=$(printf '%s' "$WEB_FILE" | sed 's,[&/],\\&,g')

grep -q '^API_DOCKERFILE=' "$ENV_FILE"   && sed -i -E "s,^API_DOCKERFILE=.*,API_DOCKERFILE=$api_esc,g" "$ENV_FILE"   || printf '\nAPI_DOCKERFILE=%s\n' "$API_FILE" >> "$ENV_FILE"

grep -q '^WEB_DOCKERFILE=' "$ENV_FILE"   && sed -i -E "s,^WEB_DOCKERFILE=.*,WEB_DOCKERFILE=$web_esc,g" "$ENV_FILE"   || printf '\nWEB_DOCKERFILE=%s\n' "$WEB_FILE" >> "$ENV_FILE"

# normalize WEB_PORT host side to 15173 if not set
if ! grep -q '^WEB_PORT=' "$ENV_FILE"; then
  printf '\nWEB_PORT=15173\n' "$ENV_FILE"
fi

echo "   .env now:"
grep -E '^(API_CONTEXT|WEB_CONTEXT|API_DOCKERFILE|WEB_DOCKERFILE|WEB_PORT)=' "$ENV_FILE" | sed 's/^/    /'

echo "==> ensuring compose port mapping matches container port"
# change the web service 'ports:' mapping to "15173:WEB_PORT_CTN"
# we’ll replace any existing mapping on that line
if grep -qE '^\s+-\s*"\${WEB_PORT}:' "$COMPOSE_YML"; then
  sed -i -E "s,^\s+-\s*\"\${WEB_PORT}:[0-9]+\",      - \"\${WEB_PORT}:$WEB_PORT_CTN\",g" "$COMPOSE_YML"
elif grep -qE '^\s+-\s*"15173:' "$COMPOSE_YML"; then
  sed -i -E "s,^\s+-\s*\"15173:[0-9]+\",      - \"15173:$WEB_PORT_CTN\",g" "$COMPOSE_YML"
else
  # insert mapping if missing
  awk -v repl="      - \"\${WEB_PORT}:$WEB_PORT_CTN\"" \
    '\n    BEGIN{printed=0}
    {print}
    /^	web:\s*$/ {inweb=1}
    inweb && /^	ports:\s*$/ {print repl; printed=1}
    inweb && /^	[a-z]/ {inweb=0}
    END{if(!printed){}}
  ' "$COMPOSE_YML" > "$COMPOSE_YML.tmp" && mv "$COMPOSE_YML.tmp" "$COMPOSE_YML"
fi

echo "==> building and starting"
cd "$ROOT/ops/compose"
make bootstrap
make up

echo "==> health checks"
curl -sf "http://localhost:18080/health" || true
echo "   Web:      http://localhost:$(grep -E '^WEB_PORT=' .env | cut -d= -f2)"
echo "   Grafana:  http://localhost:$(grep -E '^GRAFANA_PORT=' .env | cut -d= -f2 || echo 33000)"
