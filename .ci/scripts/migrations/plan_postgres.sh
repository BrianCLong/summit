#!/usr/bin/env bash
set -euo pipefail

: "${POSTGRES_URL:?POSTGRES_URL is required}"
: "${ALEMBIC_CONFIG:?ALEMBIC_CONFIG is required}"

mkdir -p migration-plans/postgres

export LOG_FORMAT="${LOG_FORMAT:-json}"
export PR_NUMBER="${PR_NUMBER:-local}"

echo "{\"event\":\"plan_postgres_start\",\"pr\":\"$PR_NUMBER\"}"

alembic -c "$ALEMBIC_CONFIG" upgrade head --sql > migration-plans/postgres/plan.sql

echo "{\"event\":\"plan_postgres_complete\",\"artifact\":\"migration-plans/postgres/plan.sql\",\"pr\":\"$PR_NUMBER\"}"
