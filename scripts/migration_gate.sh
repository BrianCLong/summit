#!/usr/bin/env bash
set -euo pipefail

CHANGED=$(git diff --name-only origin/${GITHUB_BASE_REF:-main}...HEAD | grep '^migrations/' || true)
if [[ -z "$CHANGED" ]]; then
  echo "No migration changes detected. Gate PASS."
  exit 0
fi

echo "Migration files changed:\n$CHANGED"

# Stage apply dry‑run (replace with your migration tool)
if command -v alembic >/dev/null; then
  alembic upgrade head --sql > /tmp/migration.sql
fi

# Backfill dry‑run placeholder
# TODO: invoke service-specific verifier scripts here

echo "\nManual approval required with reason‑for‑access to proceed to prod."
exit 0
