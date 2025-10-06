#!/usr/bin/env bash
set -euo pipefail

: "${GRAFANA_URL:?set GRAFANA_URL}"
: "${GRAFANA_API_KEY:?set GRAFANA_API_KEY}"
DASHBOARD_PATH="${DASHBOARD_PATH:-infra/grafana/copilot_dashboard.json}"
FOLDER_UID="${FOLDER_UID:-copilot}"

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required to import dashboards" >&2
  exit 1
fi

create_folder_if_missing() {
  local status
  status=$(curl -s -o /tmp/grafana_folder.json -w "%{http_code}" \
    -H "Authorization: Bearer ${GRAFANA_API_KEY}" \
    "${GRAFANA_URL}/api/folders/${FOLDER_UID}")

  if [[ "$status" == "200" ]]; then
    echo "Grafana folder '${FOLDER_UID}' exists"
    return
  fi

  echo "Creating Grafana folder '${FOLDER_UID}'"
  curl -sS -X POST \
    -H "Authorization: Bearer ${GRAFANA_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"uid\":\"${FOLDER_UID}\",\"title\":\"Copilot Routing\"}" \
    "${GRAFANA_URL}/api/folders" >/dev/null
}

import_dashboard() {
  local payload
  payload=$(jq -n --argfile dash "${DASHBOARD_PATH}" --arg folderUid "${FOLDER_UID}" '{ dashboard: $dash, folderUid: $folderUid, overwrite: true }')
  curl -sS -X POST \
    -H "Authorization: Bearer ${GRAFANA_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "$payload" \
    "${GRAFANA_URL}/api/dashboards/db" | jq -r '.status // "ok"'
}

create_folder_if_missing
import_dashboard
