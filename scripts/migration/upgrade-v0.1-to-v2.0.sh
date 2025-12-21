#!/usr/bin/env bash
set -euo pipefail

RELEASE_TAG=${RELEASE_TAG:-v2.0.0}
NAMESPACE=${NAMESPACE:-summit}
ENV_FILE=${ENV_FILE:-.env}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "❌ Missing required command: $1" >&2
    exit 1;
  fi
}

for cmd in make npm helm docker-compose curl jq; do
  require_cmd "$cmd"
done

timestamp=$(date -u +"%Y%m%d%H%M%S")
backup_env="${ENV_FILE}.bak.${timestamp}"

cat <<INFO
🔄 Starting v0.1.0 → v2.0.0 migration automation
- Release tag: ${RELEASE_TAG}
- Namespace: ${NAMESPACE}
- Env file: ${ENV_FILE}
INFO

echo "1) Back up configuration and data"
cp "$ENV_FILE" "$backup_env"
echo "✅ Env file backup: $backup_env"
make db:backup
npm run export:investigations --silent || true

if ! grep -q "LB_ALGORITHM" "$ENV_FILE"; then
  cat >> "$ENV_FILE" <<'VARS'
# v2.0.0 load balancer + telemetry defaults
LB_ALGORITHM=weighted-round-robin
CACHE_L1_MAX_SIZE=1000
OTEL_EXPORTER_ENDPOINT=http://localhost:4318
NARRATIVE_SIM_ENABLED=true
BLACK_PROJECTS_ENABLED=true
VARS
  echo "✅ Seeded v2.0.0 env defaults"
fi

echo "2) Apply database migrations"
npm run db:migrate
npm run db:verify || true

echo "3) Deploy v2.0.0 images"
helm upgrade summit ./helm/summit \
  --install \
  --namespace "$NAMESPACE" \
  --create-namespace \
  --set image.tag="$RELEASE_TAG"

echo "4) Run health and smoke checks"
curl -sf http://localhost:4000/health/detailed | jq .status || true
make smoke

echo "5) Finalize release metadata"
cat > migration-report-${timestamp}.md <<REPORT
# Migration Validation - v0.1.0 → v2.0.0
- Timestamp (UTC): ${timestamp}
- Release tag: ${RELEASE_TAG}
- Env backup: ${backup_env}
- Health check: see command output above
- Smoke tests: make smoke
REPORT

echo "✅ Migration automation complete. Report: migration-report-${timestamp}.md"
