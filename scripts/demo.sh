#!/bin/bash
set -e

DUMMY_JWT='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZXYtdXNlciIsIm5hbWUiOiJUZXN0IFVzZXIiLCJpYXQiOjE1MTYyMzkwMjJ9.Q_R-K-d_3E_V-A-C-K-E-R'

echo "Starting the full stack..."
make up

echo "Waiting for all services to be healthy..."
RETRY_COUNT=0
MAX_RETRIES=30
until $(curl --output /dev/null --silent --head --fail http://localhost:4000/health); do
    if [ ${RETRY_COUNT} -ge ${MAX_RETRIES} ]; then
        echo "API service did not start in time. Aborting."
        exit 1
    fi
    printf '.'
    RETRY_COUNT=$(($RETRY_COUNT+1))
    sleep 2
done

echo "Services are healthy."

echo "Triggering ENTITY data ingest..."
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer ${DUMMY_JWT}" \
  -d '{"source": "golden/entities.csv", "type": "entities"}' \
  http://localhost:4000/api/ingest/push

echo "Entity ingest triggered. Polling for entities to appear..."
RETRY_COUNT=0
MAX_RETRIES=20
until $(curl -s -X POST -H "Content-Type: application/json" --data '{ "query": "{ searchEntities(q: \\"Acme\\", tenant: \\"default-tenant\\") { ... on Org { name } } }" }' http://localhost:4000/graphql | grep "Acme Corporation"); do
    if [ ${RETRY_COUNT} -ge ${MAX_RETRIES} ]; then
        echo "Ingested entities did not appear in time. Aborting."
        exit 1
    fi
    printf '.'
    RETRY_COUNT=$(($RETRY_COUNT+1))
    sleep 2
done
echo "Entities found."

echo "Triggering EDGE data ingest..."
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer ${DUMMY_JWT}" \
  -d '{"source": "golden/edges.csv", "type": "edges"}' \
  http://localhost:4000/api/ingest/push

echo "Edge ingest triggered. Polling for relationship to appear..."
RETRY_COUNT=0
MAX_RETRIES=20
until $(curl -s -X POST -H "Content-Type: application/json" --data '{ "query": "{ neighbors(id: \\"1\\", tenant: \\"default-tenant\\") { ... on Org { name } } }" }' http://localhost:4000/graphql | grep "Acme Corporation"); do
    if [ ${RETRY_COUNT} -ge ${MAX_RETRIES} ]; then
        echo "Ingested edges did not appear in time. Aborting."
        exit 1
    fi
    printf '.'
    RETRY_COUNT=$(($RETRY_COUNT+1))
    sleep 2
done
echo "Edges found."

echo "Running final verification queries..."
curl -X POST -H "Content-Type: application/json" \
  --data '{ "query": "{ searchEntities(q: \\"Acme\\", tenant: \\"default-tenant\\") { id ... on Org { name } } }" }' \
  http://localhost:4000/graphql | jq

echo "Demo complete. Tearing down the stack..."
make down
