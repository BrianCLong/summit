#!/usr/bin/env bash
set -euo pipefail

# Simple backup script placeholders for Postgres and Neo4j
TS=$(date +%Y%m%d-%H%M%S)
OUT=${1:-"backups"}
mkdir -p "$OUT"

echo "Backing up Postgres ..."
PG_URL=${PG_URL:-"postgresql://postgres:pgpass@localhost:5432/intelgraph"}
pg_dump "$PG_URL" > "$OUT/pg_${TS}.sql" || echo "pg_dump failed (placeholder)"

echo "Backing up Neo4j ..."
NEO4J_HOME=${NEO4J_HOME:-"/var/lib/neo4j"}
if command -v neo4j-admin >/dev/null 2>&1; then
  neo4j-admin database backup --from=localhost:6362 --backup-dir="$OUT" || echo "neo4j-admin backup command failed"
else
  echo "neo4j-admin not found; wrote placeholder" > "$OUT/neo4j_${TS}.txt"
fi

# Optional: record audit event
if [ -n "${API_URL:-}" ] && [ -n "${AUDIT_HOOK_TOKEN:-}" ]; then
  curl -s -X POST "$API_URL/admin/audit/record" \
    -H 'content-type: application/json' -H "x-audit-token: $AUDIT_HOOK_TOKEN" \
    -d '{"action":"backup.run","details":{"timestamp":"'"$TS"'"}}' >/dev/null || true
fi

echo "Backups saved to $OUT"
