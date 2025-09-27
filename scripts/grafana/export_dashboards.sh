#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${GRAFANA_URL:-}" || -z "${GRAFANA_TOKEN:-}" ]]; then
  echo "Set GRAFANA_URL and GRAFANA_TOKEN env vars" >&2
  exit 1
fi

DIR=${1:-server/grafana}

for f in "$DIR"/*.json; do
  name=$(basename "$f" .json)
  echo "Importing $name from $f"
  payload=$(jq -c --arg title "$name" '{ dashboard: (. + {title: $title, id: null, uid: null}), folderId: 0, overwrite: true }' "$f")
  curl -sS -X POST "$GRAFANA_URL/api/dashboards/db" -H "Authorization: Bearer $GRAFANA_TOKEN" -H 'Content-Type: application/json' -d "$payload" >/dev/null
done

echo "Done."

