#!/bin/bash
set -euo pipefail

echo ">>> Starting IntelGraph Demo"

# 1. Ensure the stack is up
echo ">>> Checking for running services..."
docker compose ps

# 2. Ingest data (Note: This is a mocked ingest process for the scaffold)
echo ">>> Triggering ingest worker..."
docker compose run --rm ingest-worker

# 3. Run sample queries (Note: Gateway returns mocked data for now)
echo ">>> Running persisted queries..."
GATEWAY_URL="http://localhost:4000/graphql"

# Example: Get entity by ID
curl -s -X POST -H "Content-Type: application/json" --data '{ "query": "{ entityById(id: \"person-1\", tenant: \"dev-tenant\") { id labels } }" }' $GATEWAY_URL
echo

# Example: Search entities
curl -s -X POST -H "Content-Type: application/json" --data '{ "query": "{ searchEntities(q: \"Alice\", tenant: \"dev-tenant\") { id labels } }" }' $GATEWAY_URL
echo

echo ">>> Demo Complete"
