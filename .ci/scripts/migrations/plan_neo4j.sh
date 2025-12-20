#!/usr/bin/env bash
set -euo pipefail

: "${NEO4J_URI:?NEO4J_URI is required}"
: "${NEO4J_USER:?NEO4J_USER is required}"
: "${NEO4J_PASSWORD:?NEO4J_PASSWORD is required}"

mkdir -p migration-plans/neo4j
export PR_NUMBER="${PR_NUMBER:-local}"

echo "{\"event\":\"plan_neo4j_start\",\"uri\":\"masked\",\"pr\":\"$PR_NUMBER\"}"

cat migrations/neo4j/**/**/*.cypher > migration-plans/neo4j/plan.cypher

echo "{\"event\":\"plan_neo4j_complete\",\"artifact\":\"migration-plans/neo4j/plan.cypher\",\"pr\":\"$PR_NUMBER\"}"
