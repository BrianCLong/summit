#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.."; pwd)"
export PYTHONPATH="${PYTHONPATH:-}:$ROOT"
export PG_DSN="${PG_DSN:-postgresql://summit:summit@localhost:5432/summit}"
export NEO4J_URI="${NEO4J_URI:-bolt://localhost:7687}"
export NEO4J_USER="${NEO4J_USER:-neo4j}"
export NEO4J_PASS="${NEO4J_PASS:-summit}"
export PG_REPL_SLOT="${PG_REPL_SLOT:-summit_slot}"
export PG_OUTPUT_PLUGIN="${PG_OUTPUT_PLUGIN:-test_decoding}"
export OPENLINEAGE_AUDIT_FILE="${OPENLINEAGE_AUDIT_FILE:-$ROOT/artifacts/lineage/openlineage.jsonl}"
PYTHON_BIN="${PYTHON_BIN:-python3}"

INGEST_PID=""

cleanup() {
  if [[ -n "$INGEST_PID" ]]; then
    kill "$INGEST_PID" >/dev/null 2>&1 || true
  fi
  docker compose -f "$ROOT/docker-compose.summit-sync.yml" down -v >/dev/null 2>&1 || true
}
trap cleanup EXIT

wait_for_pg() {
  local attempts=30
  local delay=1
  local i
  for ((i=1; i<=attempts; i++)); do
    if command -v psql >/dev/null 2>&1; then
      if psql "$PG_DSN" -v ON_ERROR_STOP=1 -c "select 1" >/dev/null 2>&1; then
        return
      fi
    elif python3 -c "import psycopg" >/dev/null 2>&1; then
      if python3 - "$PG_DSN" <<'PY' >/dev/null 2>&1
import sys
import psycopg
with psycopg.connect(sys.argv[1]) as conn:
    with conn.cursor() as cur:
        cur.execute("select 1")
PY
      then
        return
      fi
    fi
    sleep "$delay"
  done
  echo "ERROR: Postgres not reachable after ${attempts}s: $PG_DSN" >&2
  exit 1
}

run_sql_file() {
  local file="$1"
  if command -v psql >/dev/null 2>&1; then
    psql "$PG_DSN" -v ON_ERROR_STOP=1 -f "$file"
    return
  fi
  docker compose -f "$ROOT/docker-compose.summit-sync.yml" exec -T postgres \
    psql -U summit -d summit -v ON_ERROR_STOP=1 < "$file"
}

rm -f "$OPENLINEAGE_AUDIT_FILE"

# 1) Boot infra.
docker compose -f "$ROOT/docker-compose.summit-sync.yml" up -d --wait
wait_for_pg

# 2) Seed source tables and baseline rows.
run_sql_file "$ROOT/tests/seed.sql"

# 3) Start ingestion in background.
"$PYTHON_BIN" -u "$ROOT/ingestion/postgres_consumer.py" >/tmp/ingest.log 2>&1 &
INGEST_PID="$!"
sleep 3

# 4) Create drift.
run_sql_file "$ROOT/tests/drift.sql"
sleep 3

# 5) Run reconciliation (enforces mismatch_rate + gate suite).
"$PYTHON_BIN" "$ROOT/reconciliation/merkle_reconcile.py" | tee /tmp/reconcile.out

# 6) Assert zero residual mismatches and all gates passing.
"$PYTHON_BIN" "$ROOT/reconciliation/merkle_reconcile.py" | tee /tmp/reconcile2.out
grep -q "MISMATCH_TOTAL=0" /tmp/reconcile2.out
grep -q "GATE_A=PASS" /tmp/reconcile2.out
grep -q "GATE_B=PASS" /tmp/reconcile2.out
grep -q "GATE_C=PASS" /tmp/reconcile2.out
grep -q "GATE_D=PASS" /tmp/reconcile2.out

echo "OK: zero mismatches and all gates PASS"
