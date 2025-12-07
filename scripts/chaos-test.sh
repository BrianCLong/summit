#!/bin/bash
set -e

# IntelGraph Chaos Testing Script
# Usage: ./scripts/chaos-test.sh [scenario]

SCENARIO=$1
NAMESPACE=${NAMESPACE:-default}

echo "Starting Chaos Test for Scenario: $SCENARIO"

case $SCENARIO in
  "pod-kill")
    echo "Killing a random API pod..."
    # Requires kubectl and access to the cluster
    POD=$(kubectl get pods -n $NAMESPACE -l app=server -o jsonpath='{.items[0].metadata.name}')
    if [ -z "$POD" ]; then
      echo "No server pod found!"
      exit 1
    fi
    echo "Deleting pod $POD"
    kubectl delete pod $POD -n $NAMESPACE
    ;;

  "db-restart")
    echo "Restarting PostgreSQL..."
    # Assuming docker-compose environment for local chaos
    docker compose restart postgres
    ;;

  "ingest-backlog")
    echo "Simulating ingestion backlog..."
    # Flood the queue using the admin API (if available) or k6 script
    # This is a placeholder for running a high-load k6 script
    k6 run k6/ingest-flood.js
    ;;

  *)
    echo "Unknown scenario: $SCENARIO"
    echo "Available scenarios: pod-kill, db-restart, ingest-backlog"
    exit 1
    ;;
esac

echo "Chaos injected. Monitor SLOs for impact."
