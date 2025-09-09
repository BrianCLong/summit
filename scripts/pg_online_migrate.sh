#!/usr/bin/env bash
set -euo pipefail
export PGAPPNAME=pg-online
export PGOPTIONS="-c lock_timeout=1000 -c statement_timeout=300000"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$1"