#!/usr/bin/env bash
set -euo pipefail

PG_URL=${PG_URL:-"postgresql://postgres:pgpass@localhost:5432/intelgraph"}
DIR=${1:-"services/api/migrations"}
echo "Applying migrations from $DIR to $PG_URL"
for f in $(ls -1 "$DIR"/*.sql 2>/dev/null | sort); do
  echo "-> $f"; psql "$PG_URL" -f "$f" || exit 1
done
echo "Migrations complete"

