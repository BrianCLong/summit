#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.."; pwd)"
export PYTHONPATH="${PYTHONPATH:-}:$ROOT"
export PG_DSN="${PG_DSN:-postgresql://summit:summit@localhost:5432/summit}"
export NEO4J_URI="${NEO4J_URI:-bolt://localhost:7687}"
export NEO4J_USER="${NEO4J_USER:-neo4j}"
export NEO4J_PASS="${NEO4J_PASS:-summit}"
export PG_REPL_SLOT="${PG_REPL_SLOT:-summit_slot}"
export PG_OUTPUT_PLUGIN="${PG_OUTPUT_PLUGIN:-wal2json}"

INGEST_PID=""

cleanup() {
  if [[ -n "$INGEST_PID" ]]; then
    kill "$INGEST_PID" >/dev/null 2>&1 || true
  fi
  docker compose -f "$ROOT/docker-compose.summit-sync.yml" down -v >/dev/null 2>&1 || true
}
trap cleanup EXIT

# 1) Boot infra.
docker compose -f "$ROOT/docker-compose.summit-sync.yml" up -d --wait

# 2) Seed source tables and baseline rows.
psql "$PG_DSN" -v ON_ERROR_STOP=1 -f "$ROOT/tests/seed.sql"

# 3) Start ingestion in background.
python3 "$ROOT/ingestion/postgres_consumer.py" >/tmp/ingest.log 2>&1 &
INGEST_PID="$!"
sleep 3

# 4) Create drift.
psql "$PG_DSN" -v ON_ERROR_STOP=1 -f "$ROOT/tests/drift.sql"
sleep 3

# 5) Run reconciliation (enforces mismatch_rate < 0.01% after repair).
python3 "$ROOT/reconciliation/merkle_reconcile.py" | tee /tmp/reconcile.out

# 6) Assert zero residual mismatches.
python3 "$ROOT/reconciliation/merkle_reconcile.py" | tee /tmp/reconcile2.out
grep -q "MISMATCH_TOTAL=0" /tmp/reconcile2.out

echo "OK: zero mismatches after repair"
