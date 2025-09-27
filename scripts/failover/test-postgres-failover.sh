#!/usr/bin/env bash
set -euo pipefail

NAMESPACE=${1:-database-operators}
CLUSTER_NAME=${2:-summit-postgres}
TIMEOUT=${TIMEOUT_SECONDS:-300}
SLEEP_INTERVAL=10

log() {
  printf '[%s] %s\n' "$(date --iso-8601=seconds)" "$*"
}

log "Locating current PostgreSQL primary in cluster ${CLUSTER_NAME}"
PRIMARY_POD=$(kubectl get pods -n "$NAMESPACE" -l "cluster-name=${CLUSTER_NAME},spilo-role=master" -o jsonpath='{.items[0].metadata.name}')
if [[ -z "${PRIMARY_POD}" ]]; then
  echo "Unable to determine current primary pod" >&2
  exit 1
fi
log "Deleting primary pod ${PRIMARY_POD} to trigger failover"
kubectl delete pod "$PRIMARY_POD" -n "$NAMESPACE" --wait=false

log "Waiting for a new primary to be elected"
START_TIME=$(date +%s)
NEW_PRIMARY=""
while true; do
  sleep "$SLEEP_INTERVAL"
  NEW_PRIMARY=$(kubectl get pods -n "$NAMESPACE" -l "cluster-name=${CLUSTER_NAME},spilo-role=master" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)
  if [[ -n "$NEW_PRIMARY" && "$NEW_PRIMARY" != "$PRIMARY_POD" ]]; then
    READY=$(kubectl get pod "$NEW_PRIMARY" -n "$NAMESPACE" -o jsonpath='{.status.containerStatuses[0].ready}' 2>/dev/null || true)
    if [[ "$READY" == "true" ]]; then
      log "New primary ${NEW_PRIMARY} is ready"
      break
    fi
  fi
  NOW=$(date +%s)
  if (( NOW - START_TIME > TIMEOUT )); then
    echo "Timed out waiting for PostgreSQL failover" >&2
    kubectl get pods -n "$NAMESPACE" -l "cluster-name=${CLUSTER_NAME}" >&2 || true
    exit 1
  fi
  log "Failover still pending..."
done

log "PostgreSQL failover validation complete"
