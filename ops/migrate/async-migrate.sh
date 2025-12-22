#!/usr/bin/env bash
set -euo pipefail

: "${PG_URL?need PG_URL}"

echo "Running migrations in async mode…"
while IFS= read -r file; do
  echo "-> ${file}"
  psql "$PG_URL" -v ON_ERROR_STOP=1 -f "$file"
done < <(find services -path '*/db/migrations/*.sql' | sort)
