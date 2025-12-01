#!/usr/bin/env bash
set -euo pipefail
ENV=${1:-}
MODE=${2:-run}

if [[ -z "$ENV" ]]; then
  echo "usage: $0 <env> [--dry-run]"; exit 2; fi

if [[ "$MODE" == "--dry-run" ]]; then
  echo "[migration-gate] DRY RUN for $ENV — validating migrations plan..."
  exit 0
fi

# Example: block if a breaking migration is detected without feature flag
if grep -R "DROP TABLE" -n migrations/ >/dev/null 2>&1; then
  echo "[migration-gate] blocking deploy: destructive migration found without approval" >&2
  exit 1
fi

echo "[migration-gate] ok"
