#!/bin/bash
set -euo pipefail

# Maestro Grafana Setup Script
# Provisions dashboards, datasources, and service accounts

GRAFANA_URL="${GRAFANA_URL:-https://grafana.maestro-dev.topicality.co}"
GRAFANA_ADMIN_TOKEN="${GRAFANA_ADMIN_TOKEN:-}"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://prometheus:9090}"
JAEGER_URL="${JAEGER_URL:-http://jaeger:16686}"

if [[ -z "$GRAFANA_ADMIN_TOKEN" ]]; then
    echo "Error: GRAFANA_ADMIN_TOKEN environment variable is required"
    exit 1
fi

echo "🔧 Setting up Grafana for Maestro..."

# Function to make API calls to Grafana
grafana_api() {
    local method="$1"
    local endpoint="$2"
    local data="${3:-}"
    
    local curl_args=(
        -X "$method"
        -H "Authorization: Bearer $GRAFANA_ADMIN_TOKEN"
        -H "Content-Type: application/json"
        -w "HTTP %{http_code}"
        -s
    )
    
    if [[ -n "$data" ]]; then
        curl_args+=(-d "$data")
    fi
    
    curl "${curl_args[@]}" "$GRAFANA_URL/api/$endpoint"
}

# Create datasources
echo "📊 Creating datasources..."

# Prometheus datasource
prometheus_config=$(cat <<EOF
{
  "name": "Maestro Prometheus",
  "type": "prometheus",
  "url": "$PROMETHEUS_URL",
  "access": "proxy",
  "jsonData": {
    "timeInterval": "30s",
    "queryTimeout": "60s",
    "httpMethod": "POST"
  },
  "secureJsonData": {}
}
EOF
)

echo "Creating Prometheus datasource..."
grafana_api POST "datasources" "$prometheus_config"
echo ""

# Jaeger datasource
jaeger_config=$(cat <<EOF
{
  "name": "Maestro Jaeger",
  "type": "jaeger",
  "url": "$JAEGER_URL",
  "access": "proxy",
  "jsonData": {
    "traceQuery": {
      "timeShiftEnabled": true,
      "spanStartTimeShift": "1h",
      "spanEndTimeShift": "-1h"
    }
  }
}
EOF
)

echo "Creating Jaeger datasource..."
grafana_api POST "datasources" "$jaeger_config"
echo ""

# Create service accounts
echo "👤 Creating service accounts..."

# Maestro readonly service account
readonly_sa=$(cat <<EOF
{
  "name": "maestro-readonly",
  "role": "Viewer"
}
EOF
)

echo "Creating maestro-readonly service account..."
readonly_result=$(grafana_api POST "serviceaccounts" "$readonly_sa")
readonly_id=$(echo "$readonly_result" | grep -o '"id":[0-9]*' | cut -d: -f2 | head -1)
echo "Service account ID: $readonly_id"

# Create token for readonly service account
readonly_token_config=$(cat <<EOF
{
  "name": "maestro-readonly-token",
  "role": "Viewer"
}
EOF
)

echo "Creating token for maestro-readonly service account..."
readonly_token_result=$(grafana_api POST "serviceaccounts/$readonly_id/tokens" "$readonly_token_config")
echo "Readonly token created (save this): $readonly_token_result"
echo ""

# Maestro admin service account
admin_sa=$(cat <<EOF
{
  "name": "maestro-admin",
  "role": "Admin"
}
EOF
)

echo "Creating maestro-admin service account..."
admin_result=$(grafana_api POST "serviceaccounts" "$admin_sa")
admin_id=$(echo "$admin_result" | grep -o '"id":[0-9]*' | cut -d: -f2 | head -1)
echo "Service account ID: $admin_id"

# Create token for admin service account
admin_token_config=$(cat <<EOF
{
  "name": "maestro-admin-token",
  "role": "Admin"
}
EOF
)

echo "Creating token for maestro-admin service account..."
admin_token_result=$(grafana_api POST "serviceaccounts/$admin_id/tokens" "$admin_token_config")
echo "Admin token created (save this): $admin_token_result"
echo ""

# Create dashboards
echo "📈 Creating dashboards..."

# Overview Dashboard
overview_dashboard=$(cat <<'EOF'
{
  "dashboard": {
    "uid": "maestro-overview",
    "title": "Maestro Overview",
    "tags": ["maestro", "overview"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Build Success Rate",
        "type": "stat",
        "gridPos": {"h": 8, "w": 6, "x": 0, "y": 0},
        "targets": [
          {
            "expr": "maestro_runs_success_rate",
            "legendFormat": "Success Rate",
            "datasource": {"type": "prometheus", "uid": "maestro-prometheus"}
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "thresholds": {
              "steps": [
                {"color": "red", "value": 0},
                {"color": "yellow", "value": 90},
                {"color": "green", "value": 95}
              ]
            }
          }
        }
      },
      {
        "id": 2,
        "title": "Pipeline Runs (Last 24h)",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 12, "x": 6, "y": 0},
        "targets": [
          {
            "expr": "rate(maestro_runs_total[5m])",
            "legendFormat": "Runs/min",
            "datasource": {"type": "prometheus", "uid": "maestro-prometheus"}
          }
        ]
      },
      {
        "id": 3,
        "title": "Active Pipelines",
        "type": "stat",
        "gridPos": {"h": 8, "w": 6, "x": 18, "y": 0},
        "targets": [
          {
            "expr": "maestro_pipelines_active_total",
            "legendFormat": "Active",
            "datasource": {"type": "prometheus", "uid": "maestro-prometheus"}
          }
        ]
      }
    ],
    "time": {
      "from": "now-24h",
      "to": "now"
    },
    "refresh": "30s"
  },
  "overwrite": true
}
EOF
)

echo "Creating Overview dashboard..."
grafana_api POST "dashboards/db" "$overview_dashboard"
echo ""

# SLO Dashboard
slo_dashboard=$(cat <<'EOF'
{
  "dashboard": {
    "uid": "maestro-slo",
    "title": "Maestro SLOs",
    "tags": ["maestro", "slo"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "SLO Error Budget",
        "type": "stat",
        "gridPos": {"h": 8, "w": 8, "x": 0, "y": 0},
        "targets": [
          {
            "expr": "maestro_slo_error_budget_remaining",
            "legendFormat": "Error Budget",
            "datasource": {"type": "prometheus", "uid": "maestro-prometheus"}
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "thresholds": {
              "steps": [
                {"color": "red", "value": 0},
                {"color": "yellow", "value": 10},
                {"color": "green", "value": 50}
              ]
            }
          }
        }
      },
      {
        "id": 2,
        "title": "P95 Latency",
        "type": "timeseries", 
        "gridPos": {"h": 8, "w": 8, "x": 8, "y": 0},
        "targets": [
          {
            "expr": "histogram_quantile(0.95, maestro_request_duration_seconds_bucket)",
            "legendFormat": "P95 Latency",
            "datasource": {"type": "prometheus", "uid": "maestro-prometheus"}
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "s"
          }
        }
      },
      {
        "id": 3,
        "title": "SLO Burn Rate",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 8, "x": 16, "y": 0},
        "targets": [
          {
            "expr": "maestro_slo_burn_rate",
            "legendFormat": "Burn Rate",
            "datasource": {"type": "prometheus", "uid": "maestro-prometheus"}
          }
        ]
      }
    ],
    "time": {
      "from": "now-24h",
      "to": "now"
    },
    "refresh": "30s"
  },
  "overwrite": true
}
EOF
)

echo "Creating SLO dashboard..."
grafana_api POST "dashboards/db" "$slo_dashboard"
echo ""

# Cost Dashboard
cost_dashboard=$(cat <<'EOF'
{
  "dashboard": {
    "uid": "maestro-cost",
    "title": "Maestro Cost & Budget",
    "tags": ["maestro", "finops"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Daily Spend",
        "type": "stat",
        "gridPos": {"h": 8, "w": 6, "x": 0, "y": 0},
        "targets": [
          {
            "expr": "maestro_cost_daily_total",
            "legendFormat": "Daily Spend",
            "datasource": {"type": "prometheus", "uid": "maestro-prometheus"}
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "currencyUSD"
          }
        }
      },
      {
        "id": 2,
        "title": "Budget Utilization",
        "type": "gauge",
        "gridPos": {"h": 8, "w": 6, "x": 6, "y": 0},
        "targets": [
          {
            "expr": "maestro_budget_utilization_percent",
            "legendFormat": "Utilization",
            "datasource": {"type": "prometheus", "uid": "maestro-prometheus"}
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "thresholds": {
              "steps": [
                {"color": "green", "value": 0},
                {"color": "yellow", "value": 80},
                {"color": "red", "value": 95}
              ]
            }
          }
        }
      },
      {
        "id": 3,
        "title": "Cost Trend",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0},
        "targets": [
          {
            "expr": "maestro_cost_hourly_total",
            "legendFormat": "Hourly Cost",
            "datasource": {"type": "prometheus", "uid": "maestro-prometheus"}
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "currencyUSD"
          }
        }
      }
    ],
    "time": {
      "from": "now-7d",
      "to": "now"
    },
    "refresh": "1m"
  },
  "overwrite": true
}
EOF
)

echo "Creating Cost dashboard..."
grafana_api POST "dashboards/db" "$cost_dashboard"
echo ""

echo "✅ Grafana setup complete!"
echo ""
echo "📋 Summary:"
echo "- Created datasources: Maestro Prometheus, Maestro Jaeger"  
echo "- Created service accounts: maestro-readonly, maestro-admin"
echo "- Created dashboards: Overview, SLOs, Cost & Budget"
echo ""
echo "🔗 Dashboard URLs:"
echo "- Overview: $GRAFANA_URL/d/maestro-overview"
echo "- SLOs: $GRAFANA_URL/d/maestro-slo" 
echo "- Cost: $GRAFANA_URL/d/maestro-cost"
echo ""
echo "⚠️  Save the service account tokens from above - they won't be shown again!"