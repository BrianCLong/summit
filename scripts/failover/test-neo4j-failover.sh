#!/usr/bin/env bash
set -euo pipefail

NAMESPACE=${1:-graph-operators}
CLUSTER_NAME=${2:-summit-neo4j}
AUTH_SECRET=${3:-summit-neo4j-auth}
TIMEOUT=${TIMEOUT_SECONDS:-420}
SLEEP_INTERVAL=15

log() {
  printf '[%s] %s\n' "$(date --iso-8601=seconds)" "$*"
}

SECRET_JSONPATH() {
  local key=$1
  kubectl get secret "$AUTH_SECRET" -n "$NAMESPACE" -o "jsonpath={.data.${key}}"
}

USERNAME=$(SECRET_JSONPATH username | base64 --decode)
PASSWORD=$(SECRET_JSONPATH password | base64 --decode)

get_core_pods() {
  kubectl get pods -n "$NAMESPACE" -l "app=neo4j,neo4j.com/cluster-name=${CLUSTER_NAME}" -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}'
}

get_leader() {
  local pod
  for pod in $(get_core_pods); do
    if [[ -z "$pod" ]]; then
      continue
    fi
    local role
    role=$(kubectl exec "$pod" -n "$NAMESPACE" -- cypher-shell --format plain -a bolt://localhost:7687 -u "$USERNAME" -p "$PASSWORD" "CALL dbms.cluster.role()" 2>/dev/null | tr -d '\r')
    role=${role//[[:space:]]/}
    if [[ "$role" == "LEADER" ]]; then
      echo "$pod"
      return 0
    fi
  done
  return 1
}

log "Detecting current Neo4j leader for cluster ${CLUSTER_NAME}"
CURRENT_LEADER=$(get_leader || true)
if [[ -z "$CURRENT_LEADER" ]]; then
  echo "Unable to detect current Neo4j leader" >&2
  exit 1
fi
log "Deleting leader pod ${CURRENT_LEADER} to trigger failover"
kubectl delete pod "$CURRENT_LEADER" -n "$NAMESPACE" --wait=false

log "Waiting for new leader election"
START_TIME=$(date +%s)
while true; do
  sleep "$SLEEP_INTERVAL"
  NEW_LEADER=$(get_leader || true)
  if [[ -n "$NEW_LEADER" && "$NEW_LEADER" != "$CURRENT_LEADER" ]]; then
    READY=$(kubectl get pod "$NEW_LEADER" -n "$NAMESPACE" -o jsonpath='{.status.containerStatuses[?(@.name=="neo4j")].ready}' 2>/dev/null || true)
    if [[ "$READY" == "true" ]]; then
      log "New Neo4j leader ${NEW_LEADER} is ready"
      break
    fi
  fi
  NOW=$(date +%s)
  if (( NOW - START_TIME > TIMEOUT )); then
    echo "Timed out waiting for Neo4j failover" >&2
    kubectl get pods -n "$NAMESPACE" -l "app=neo4j,neo4j.com/cluster-name=${CLUSTER_NAME}" >&2 || true
    exit 1
  fi
  log "Leader election still pending..."
done

log "Neo4j failover validation complete"
