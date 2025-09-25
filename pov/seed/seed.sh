#!/usr/bin/env bash
# Seed a demo org/tenant/users via GraphQL
set -euo pipefail

API="${API:-http://localhost:4000/graphql}"
DATA="${1:-pov/seed/acme-health.json}"

ORG_NAME=$(jq -r '.organization.name' "$DATA")
ORG_SLUG=$(jq -r '.organization.slug' "$DATA")

ORG_ID=$(jq -n --arg n "$ORG_NAME" --arg s "$ORG_SLUG" \
'{"query":"mutation($name:String!,$slug:String!){ createOrganization(input:{name:$name,slug:$slug}){ id }}","variables":{"name":$n,"slug":$s}}' \
| curl -s -H "Content-Type: application/json" -d @- "$API" | jq -r '.data.createOrganization.id')

TEN_NAME=$(jq -r '.tenants[0].name' "$DATA")
TEN_SLUG=$(jq -r '.tenants[0].slug' "$DATA")
TEN_SECTOR=$(jq -r '.tenants[0].sector' "$DATA")
TEN_REGION=$(jq -r '.tenants[0].region' "$DATA")

TEN_ID=$(jq -n --arg org "$ORG_ID" --arg n "$TEN_NAME" --arg s "$TEN_SLUG" --arg sec "$TEN_SECTOR" --arg r "$TEN_REGION" \
'{"query":"mutation($orgId:ID!,$name:String!,$slug:String!,$sector:String!,$region:String!){ createTenant(input:{organizationId:$orgId,name:$name,slug:$slug,sector:$sector,region:$region}){ id }}","variables":{"orgId":$org,"name":$n,"slug":$s,"sector":$sec,"region":$r}}' \
| curl -s -H "Content-Type: application/json" -d @- "$API" | jq -r '.data.createTenant.id')

jq -c '.users[]' "$DATA" | while read -r u; do
  EMAIL=$(jq -r '.email' <<<"$u")
  ROLE=$(jq -r '.role' <<<"$u")
  jq -n --arg tid "$TEN_ID" --arg email "$EMAIL" --arg role "$ROLE" \
  '{"query":"mutation($tenantId:ID!,$email:String!,$role:String!){ inviteUser(input:{tenantId:$tenantId,email:$email,role:$role}){ id }}","variables":{"tenantId":$tid,"email":$email,"role":$role}}' \
  | curl -s -H "Content-Type: application/json" -d @- "$API" >/dev/null
  echo "Invited $EMAIL as $ROLE"
done

echo "Seed complete: OrgID=$ORG_ID TenantID=$TEN_ID"
