#!/bin/bash
set -euo pipefail

# scripts/ops/verify-prometheus-metrics.sh
# Verifies that all required Prometheus metrics for Argo Rollouts analysis exist

PROMETHEUS_URL="${PROMETHEUS_URL:-http://kube-prometheus-stack-prometheus.monitoring.svc:9090}"
NAMESPACE="${NAMESPACE:-intelgraph-prod}"

echo "🔍 Verifying Prometheus metrics for Argo Rollouts..."

# Function to check if metric exists
check_metric() {
    local metric="$1"
    local description="$2"
    
    echo "Checking: $description"
    
    # Query Prometheus for the metric
    local response
    if response=$(curl -s -f "${PROMETHEUS_URL}/api/v1/query?query=${metric}" 2>/dev/null); then
        local status
        status=$(echo "$response" | jq -r '.status')
        
        if [[ "$status" == "success" ]]; then
            local result_count
            result_count=$(echo "$response" | jq '.data.result | length')
            
            if [[ "$result_count" -gt 0 ]]; then
                echo "✅ $description - Found $result_count series"
                return 0
            else
                echo "⚠️  $description - Metric exists but no data points"
                return 1
            fi
        else
            echo "❌ $description - Query failed"
            return 1
        fi
    else
        echo "❌ $description - Cannot reach Prometheus or metric not found"
        return 1
    fi
}

echo ""
echo "=== Blackbox Exporter Metrics ==="

# Check blackbox availability metric (used in rollout analysis)
check_metric "probe_success{job=\"blackbox\"}" "Blackbox probe success metric"

# Check blackbox TTFB metric (used in rollout analysis) 
check_metric "probe_http_duration_seconds{job=\"blackbox\",phase=\"first_byte\"}" "Blackbox TTFB metric"

# Check blackbox exporter is up
check_metric "up{job=\"blackbox\"}" "Blackbox exporter up status"

echo ""
echo "=== Maestro Target Metrics ==="

# Check maestro-specific probes
check_metric "probe_success{job=\"blackbox\",instance=~\".*maestro.*\"}" "Maestro endpoint availability"

check_metric "probe_http_duration_seconds{job=\"blackbox\",instance=~\".*maestro.*\",phase=\"first_byte\"}" "Maestro endpoint TTFB"

echo ""
echo "=== Service Monitor Status ==="

# Check if ServiceMonitor is being scraped
check_metric "prometheus_sd_discovered_targets{job=\"serviceMonitor/monitoring/blackbox-exporter/0\"}" "ServiceMonitor discovery"

echo ""
echo "=== Prometheus Target Status ==="

# Query active targets
echo "Checking Prometheus active targets..."
if targets_response=$(curl -s -f "${PROMETHEUS_URL}/api/v1/targets" 2>/dev/null); then
    blackbox_targets=$(echo "$targets_response" | jq '.data.activeTargets[] | select(.job == "blackbox")')
    
    if [[ -n "$blackbox_targets" ]]; then
        echo "✅ Blackbox targets are configured"
        echo "$blackbox_targets" | jq -r '.scrapeUrl'
    else
        echo "❌ No blackbox targets found in Prometheus"
    fi
else
    echo "❌ Cannot retrieve Prometheus targets"
fi

echo ""
echo "=== Summary ==="
echo "✅ Metrics verification completed"
echo ""
echo "Note: If any metrics are missing, ensure:"
echo "1. Blackbox exporter is deployed and running"
echo "2. ServiceMonitor is created and has proper labels"
echo "3. Prometheus has the blackbox scrape configuration"
echo "4. Network policies allow Prometheus to scrape blackbox exporter"