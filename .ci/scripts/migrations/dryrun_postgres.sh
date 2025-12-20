#!/usr/bin/env bash
set -euo pipefail

: "${POSTGRES_URL:?POSTGRES_URL is required}"
: "${ALEMBIC_CONFIG:?ALEMBIC_CONFIG is required}"

mkdir -p migration-plans/postgres
export PR_NUMBER="${PR_NUMBER:-local}"

echo "{\"event\":\"dryrun_postgres_start\",\"pr\":\"$PR_NUMBER\"}"

PGOPTIONS="--client-min-messages=warning" alembic -c "$ALEMBIC_CONFIG" upgrade head --sql > migration-plans/postgres/dryrun.sql

echo "{\"event\":\"dryrun_postgres_complete\",\"artifact\":\"migration-plans/postgres/dryrun.sql\",\"pr\":\"$PR_NUMBER\"}"
