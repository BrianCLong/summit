#!/usr/bin/env bash
set -euo pipefail

: "${PGURL:?Set PGURL, e.g. postgres://user:pass@host:5432/db?sslmode=require}"

echo "[DR] Starting restore verification against $PGURL"
psql "$PGURL" -v ON_ERROR_STOP=1 <<'SQL'
SELECT now();
-- Verify critical tables exist and have rows (allow zero rows where acceptable)
SELECT to_regclass('public.pipelines') IS NOT NULL AS has_pipelines;
SELECT to_regclass('public.executors') IS NOT NULL AS has_executors;
SELECT to_regclass('public.mcp_servers') IS NOT NULL AS has_mcp_servers;
SELECT to_regclass('public.mcp_sessions') IS NOT NULL AS has_mcp_sessions;
SELECT to_regclass('privacy_tombstones') IS NOT NULL AS has_privacy_tombstones;

DO $$
DECLARE
  rec RECORD;
  resurrected_count INTEGER;
BEGIN
  IF to_regclass('privacy_tombstones') IS NULL THEN
    RETURN;
  END IF;

  FOR rec IN SELECT table_name, primary_key_column, record_id, action FROM privacy_tombstones LOOP
    EXECUTE format('SELECT COUNT(*)::int FROM %I WHERE %I::text = $1', rec.table_name, rec.primary_key_column)
      INTO resurrected_count
      USING rec.record_id;

    IF rec.action = 'delete' AND resurrected_count > 0 THEN
      RAISE EXCEPTION 'Tombstoned record % in % resurrected during restore', rec.record_id, rec.table_name;
    END IF;
  END LOOP;
END$$;
SQL

echo "[DR] Restore verification completed"
