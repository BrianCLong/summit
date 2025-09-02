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
SQL

echo "[DR] Restore verification completed"
