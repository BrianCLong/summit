#!/bin/bash

# Grafana dashboard import script
# Usage: ./grafana_import_dashboard.sh <grafana-url> <api-token>
# Example: ./grafana_import_dashboard.sh https://your-grafana.example GRAFANA_API_TOKEN

set -e

if [ $# -ne 2 ]; then
    echo "Usage: $0 <grafana-url> <api-token>"
    echo "Example: $0 https://your-grafana.example API_TOKEN"
    exit 1
fi

GRAFANA_URL=$1
API_TOKEN=$2
DASHBOARD_FILE="grafana/dashboards/llm-router-cost-slo.json"

if [ ! -f "$DASHBOARD_FILE" ]; then
    echo "Dashboard file not found: $DASHBOARD_FILE"
    exit 1
fi

echo "Importing dashboard to $GRAFANA_URL..."

# Read the dashboard JSON and wrap it in the Grafana API payload
DASHBOARD_JSON=$(cat "$DASHBOARD_FILE" | jq '.dashboard.id = null | .overwrite = true')

# Import the dashboard
curl -X POST \
  "$GRAFANA_URL/api/dashboards/db" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$DASHBOARD_JSON"

echo -e "\nDashboard imported successfully!"