#!/usr/bin/env bash
set -euo pipefail

mkdir -p rollback-plan
export PR_NUMBER="${PR_NUMBER:-local}"

cat > rollback-plan/README.md <<'PLAN'
# Rollback Plan

This folder contains rollback guidance generated during CI for the migration gate.

- Disable dual-write and shadow-read feature flags
- Revert aliases/views to legacy tables/indexes
- Restore pre-apply snapshots when available
- Run shadow compare after rollback to validate parity
PLAN

if [[ -n "${POSTGRES_URL:-}" ]]; then
  echo "pg_dump --dbname=\"${POSTGRES_URL//\"/}\" --schema-only --file=rollback-plan/postgres_preapply.sql" > rollback-plan/postgres_snapshot.sh
fi

if [[ -n "${NEO4J_URI:-}" ]]; then
  echo "neo4j-admin dump --to=rollback-plan/neo4j_preapply.dump --database=neo4j" > rollback-plan/neo4j_snapshot.sh
fi

if [[ -n "${TYPESENSE_HOST:-}" ]]; then
  echo "curl -sS -H 'X-TYPESENSE-API-KEY=***' https://${TYPESENSE_HOST}/collections > rollback-plan/typesense_snapshot.json" > rollback-plan/typesense_snapshot.sh
fi

echo "{\"event\":\"rollback_plan_generated\",\"pr\":\"$PR_NUMBER\"}"
