#!/usr/bin/env bash
set -euo pipefail

GRAFANA_URL=${GRAFANA_URL:-}
GRAFANA_TOKEN=${GRAFANA_TOKEN:-}
USER=${USER_NAME:-viewer}
EMAIL=${USER_EMAIL:-viewer@example.com}
PASSWORD=${USER_PASSWORD:-$(openssl rand -hex 12)}

if [[ -z "$GRAFANA_URL" || -z "$GRAFANA_TOKEN" ]]; then
  echo "Set GRAFANA_URL and GRAFANA_TOKEN (admin API token)" >&2
  exit 1
fi

echo "Creating Grafana viewer user: $USER <$EMAIL>"
resp=$(curl -sS -X POST "$GRAFANA_URL/api/admin/users" \
  -H "Authorization: Bearer $GRAFANA_TOKEN" \
  -H 'Content-Type: application/json' \
  -d @- << JSON
{ "name": "$USER", "email": "$EMAIL", "login": "$USER", "password": "$PASSWORD" }
JSON
)
echo "$resp" | jq . || echo "$resp"
echo "Password: $PASSWORD" >&2

# Set role to Viewer explicitly (Grafana OSS)
uid=$(echo "$resp" | jq -r '.id // empty')
if [[ -n "$uid" ]]; then
  curl -sS -X PATCH "$GRAFANA_URL/api/users/$uid" \
    -H "Authorization: Bearer $GRAFANA_TOKEN" \
    -H 'Content-Type: application/json' \
    -d '{"isGrafanaAdmin": false}' >/dev/null || true
fi

echo "Viewer created. Store the credentials securely."

# Optional: create viewer-only folder and set permissions
FOLDER_TITLE=${FOLDER_TITLE:-CompanyOS Viewer}
echo "Creating folder: $FOLDER_TITLE"
fresp=$(curl -sS -X POST "$GRAFANA_URL/api/folders" \
  -H "Authorization: Bearer $GRAFANA_TOKEN" \
  -H 'Content-Type: application/json' \
  -d @- << JSON
{ "title": "${FOLDER_TITLE}" }
JSON
)
echo "$fresp" | jq . || echo "$fresp"
fuid=$(echo "$fresp" | jq -r '.uid // empty')
if [[ -n "$fuid" ]]; then
  echo "Setting folder permissions (Viewer=view only)"
  # Replace permissions list with a single Viewer role view permission
  curl -sS -X PUT "$GRAFANA_URL/api/folders/$fuid/permissions" \
    -H "Authorization: Bearer $GRAFANA_TOKEN" \
    -H 'Content-Type: application/json' \
    -d '{ "items": [ { "role": "Viewer", "permission": 1 } ] }' | jq . || true
fi
