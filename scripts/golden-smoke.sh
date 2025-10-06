#!/usr/bin/env bash
# Golden-path smoke validation for IntelGraph deployable-first workflow

set -euo pipefail

API_URL="${INTELGRAPH_API_URL:-http://localhost:4000}"
GRAPHQL_URL="${INTELGRAPH_GRAPHQL_URL:-${API_URL%/}/graphql}"
AUTH_TOKEN="${INTELGRAPH_AUTH_TOKEN:-dev-token}"
MAX_WAIT="${INTELGRAPH_SMOKE_MAX_WAIT:-60}"
TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

require_cmd() {
  local cmd="$1"
  command -v "$cmd" >/dev/null 2>&1 || {
    echo "Required command '$cmd' not found" >&2
    exit 1
  }
}

require_cmd curl
require_cmd jq

log() {
  printf '%s\n' "$1"
}

wait_for_endpoint() {
  local name="$1"
  local url="$2"
  local attempt=1
  local max_attempts="$MAX_WAIT"
  while (( attempt <= max_attempts )); do
    if curl -sf "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
    (( attempt++ ))
  done
  echo "Timed out waiting for $name at $url" >&2
  return 1
}

graphql_request() {
  local query="$1"
  local variables_json="$2"
  local payload
  payload=$(jq -n --arg q "$query" --argjson vars "$variables_json" '{query:$q,variables:$vars}')
  curl -sS "$GRAPHQL_URL" \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    --data-raw "$payload"
}

assert_no_errors() {
  local response="$1"
  local errors
  errors=$(printf '%s' "$response" | jq -r '.errors // empty')
  if [[ -n "$errors" ]]; then
    printf '%s\n' "$response" >"${TMP_DIR}/graphql-error.json"
    echo "GraphQL error encountered. See ${TMP_DIR}/graphql-error.json" >&2
    printf '%s\n' "$errors" >&2
    exit 1
  fi
}

log "Checking API health..."
wait_for_endpoint "health" "${API_URL%/}/health"
log "Health endpoint ready"

log "Checking metrics endpoint..."
wait_for_endpoint "metrics" "${API_URL%/}/metrics"
log "Metrics endpoint ready"

log "Creating investigation via GraphQL..."
create_investigation_query='mutation CreateInvestigation($input: InvestigationInput!) {
  createInvestigation(input: $input) {
    id
    title
  }
}'
create_investigation_vars='{"input":{"title":"Golden Smoke Validation","description":"Automated smoke validation"}}'
create_investigation_response=$(graphql_request "$create_investigation_query" "$create_investigation_vars")
assert_no_errors "$create_investigation_response"
investigation_id=$(printf '%s' "$create_investigation_response" | jq -er '.data.createInvestigation.id')
log "Created investigation ${investigation_id}"

log "Creating sample entities..."
create_entity_query='mutation CreateEntity($input: EntityInput!) {
  createEntity(input: $input) {
    id
  }
}'
entity_one_vars=$(jq -n --arg inv "$investigation_id" '{input:{type:"PERSON",label:"Smoke Entity Alpha",investigationId:$inv}}')
entity_one_response=$(graphql_request "$create_entity_query" "$entity_one_vars")
assert_no_errors "$entity_one_response"
entity_one_id=$(printf '%s' "$entity_one_response" | jq -er '.data.createEntity.id')

entity_two_vars=$(jq -n --arg inv "$investigation_id" '{input:{type:"ORGANIZATION",label:"Smoke Entity Beta",investigationId:$inv}}')
entity_two_response=$(graphql_request "$create_entity_query" "$entity_two_vars")
assert_no_errors "$entity_two_response"
entity_two_id=$(printf '%s' "$entity_two_response" | jq -er '.data.createEntity.id')
log "Created entities ${entity_one_id} and ${entity_two_id}"

log "Linking entities with relationship..."
create_relationship_query='mutation CreateRelationship($input: RelationshipInput!) {
  createRelationship(input: $input) {
    id
  }
}'
create_relationship_vars=$(jq -n \
  --arg inv "$investigation_id" \
  --arg from "$entity_one_id" \
  --arg to "$entity_two_id" \
  '{input:{type:"ASSOCIATED_WITH",label:"Smoke Link",investigationId:$inv,fromEntityId:$from,toEntityId:$to}}'
)
create_relationship_response=$(graphql_request "$create_relationship_query" "$create_relationship_vars")
assert_no_errors "$create_relationship_response"
relationship_id=$(printf '%s' "$create_relationship_response" | jq -er '.data.createRelationship.id')
log "Created relationship ${relationship_id}"

log "Starting Copilot run..."
start_copilot_query='mutation StartCopilotRun($goalText: String!, $investigationId: ID!) {
  startCopilotRun(goalText: $goalText, investigationId: $investigationId) {
    id
    status
  }
}'
start_copilot_vars=$(jq -n --arg inv "$investigation_id" '{goalText:"Summarize the key connections", investigationId:$inv}')
start_copilot_response=$(graphql_request "$start_copilot_query" "$start_copilot_vars")
assert_no_errors "$start_copilot_response"
copilot_status=$(printf '%s' "$start_copilot_response" | jq -er '.data.startCopilotRun.status')
log "Copilot run started with status ${copilot_status}"

log "Requesting Copilot suggestion..."
copilot_suggest_query='query CopilotSuggest($investigationId: ID!) {
  copilotSuggest(investigationId: $investigationId) {
    summary
    ok
  }
}'
copilot_suggest_vars=$(jq -n --arg inv "$investigation_id" '{investigationId:$inv}')
copilot_suggest_response=$(graphql_request "$copilot_suggest_query" "$copilot_suggest_vars")
assert_no_errors "$copilot_suggest_response"
copilot_ok=$(printf '%s' "$copilot_suggest_response" | jq -er '.data.copilotSuggest.ok')
log "Copilot suggestion returned ok=${copilot_ok}"

log "Cleaning up smoke data..."
delete_relationship_query='mutation DeleteRelationship($id: ID!) { deleteRelationship(id: $id) }'
cleanup_rel_vars=$(jq -n --arg id "$relationship_id" '{id:$id}')
cleanup_rel_response=$(graphql_request "$delete_relationship_query" "$cleanup_rel_vars")
assert_no_errors "$cleanup_rel_response"

delete_entity_query='mutation DeleteEntity($id: ID!) { deleteEntity(id: $id) }'
cleanup_entity_one=$(graphql_request "$delete_entity_query" "$(jq -n --arg id "$entity_one_id" '{id:$id}')")
assert_no_errors "$cleanup_entity_one"
cleanup_entity_two=$(graphql_request "$delete_entity_query" "$(jq -n --arg id "$entity_two_id" '{id:$id}')")
assert_no_errors "$cleanup_entity_two"

delete_investigation_query='mutation DeleteInvestigation($id: ID!) { deleteInvestigation(id: $id) }'
cleanup_inv=$(graphql_request "$delete_investigation_query" "$(jq -n --arg id "$investigation_id" '{id:$id}')")
assert_no_errors "$cleanup_inv"

echo "GOLDEN_FLOW=PASS INV_ID=${investigation_id}"
