#!/usr/bin/env bash
set -euo pipefail
# Usage: scripts/import-grafana-dashboard.sh https://grafana.example.com $TOKEN
GRAFANA=${1:?grafana url}; TOKEN=${2:?api token}
curl -sS -X POST "$GRAFANA/api/dashboards/db" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  --data-binary @<(jq -n --argjson d @observability/grafana/dashboards/mc-platform.json '{dashboard:$d, folderId:0, overwrite:true}')