#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<USAGE
Usage: $0 --tenant TENANT --service-account SA --role ROLE --budget CENTS --rps RPS [--destroy]

Environment:
  SUMMIT_API_BASE       Base URL for control plane (e.g., https://api.summit.local)
  PLATFORM_ADMIN_TOKEN  Token capable of creating tenants and service accounts

Flags:
  --tenant              Tenant ID to create or reuse
  --service-account     Service account full name (tenant/name)
  --role                Role to bind to the service account (e.g., agent-runner)
  --budget              Tenant budget cap in cents
  --rps                 Tenant rate limit (requests per second)
  --destroy             Revoke credentials and mark tenant for teardown
USAGE
}

if [[ $# -eq 0 ]]; then
  usage
  exit 1
fi

TENANT=""
SERVICE_ACCOUNT=""
ROLE=""
BUDGET=""
RPS=""
DESTROY=false
STATE_FILE="onboarding-state.json"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tenant) TENANT="$2"; shift 2 ;;
    --service-account) SERVICE_ACCOUNT="$2"; shift 2 ;;
    --role) ROLE="$2"; shift 2 ;;
    --budget) BUDGET="$2"; shift 2 ;;
    --rps) RPS="$2"; shift 2 ;;
    --destroy) DESTROY=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1"; usage; exit 1 ;;
  esac
done

require_env() {
  local name=$1
  if [[ -z "${!name:-}" ]]; then
    echo "Missing env: $name" >&2
    exit 1
  fi
}

require_env SUMMIT_API_BASE
require_env PLATFORM_ADMIN_TOKEN

if [[ -z "$TENANT" || -z "$SERVICE_ACCOUNT" || -z "$ROLE" ]]; then
  echo "tenant, service-account, and role are required" >&2
  exit 1
fi

call_api() {
  local method=$1
  local path=$2
  local body=${3:-}
  if [[ -n "$body" ]]; then
    curl -sf \
      -X "$method" \
      -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      "$SUMMIT_API_BASE$path" \
      -d "$body"
  else
    curl -sf \
      -X "$method" \
      -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN" \
      "$SUMMIT_API_BASE$path"
  fi
}

if [[ "$DESTROY" == true ]]; then
  echo "Revoking credentials and scheduling teardown for $TENANT" >&2
  call_api POST "/tenants/$TENANT/destroy" || true
  rm -f "$STATE_FILE"
  exit 0
fi

echo "Creating or updating tenant $TENANT with budget ${BUDGET:-default} and rps ${RPS:-default}" >&2
call_api POST "/tenants" "{\"tenant_id\":\"$TENANT\",\"budget_cents\":${BUDGET:-500},\"rate_limit_rps\":${RPS:-5}}" || true

SA_NAME=$(echo "$SERVICE_ACCOUNT" | awk -F/ '{print $2}')
echo "Ensuring service account $SERVICE_ACCOUNT" >&2
call_api POST "/service-accounts" "{\"tenant_id\":\"$TENANT\",\"name\":\"$SA_NAME\",\"role\":\"$ROLE\"}" || true

echo "Issuing scoped token" >&2
TOKEN_RESPONSE=$(call_api POST "/auth/token" "{\"service_account\":\"$SERVICE_ACCOUNT\",\"scopes\":[\"agent:invoke\",\"provenance:read\",\"billing:read\"],\"ttl_seconds\":3600}")
ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token')

if [[ -z "$ACCESS_TOKEN" || "$ACCESS_TOKEN" == "null" ]]; then
  echo "Failed to issue access token" >&2
  exit 1
fi

echo "Writing onboarding state to $STATE_FILE" >&2
cat <<JSON > "$STATE_FILE"
{
  "tenant_id": "$TENANT",
  "service_account": "$SERVICE_ACCOUNT",
  "role": "$ROLE",
  "budget_cents": ${BUDGET:-500},
  "rate_limit_rps": ${RPS:-5},
  "access_token": "$ACCESS_TOKEN",
  "issued_at": "$(date -Iseconds)"
}
JSON

echo "Onboarding complete. Use the access_token from $STATE_FILE for the first run." >&2

