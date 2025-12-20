#!/usr/bin/env bash
set -euo pipefail

: "${TYPESENSE_API_KEY:?TYPESENSE_API_KEY is required}"
: "${TYPESENSE_HOST:?TYPESENSE_HOST is required}"

mkdir -p migration-plans/typesense
export PR_NUMBER="${PR_NUMBER:-local}"

echo "{\"event\":\"plan_typesense_start\",\"pr\":\"$PR_NUMBER\"}"

find migrations/typesense -name '*.json' -type f -print0 | xargs -0 cat > migration-plans/typesense/plan.json

echo "{\"event\":\"plan_typesense_complete\",\"artifact\":\"migration-plans/typesense/plan.json\",\"pr\":\"$PR_NUMBER\"}"
