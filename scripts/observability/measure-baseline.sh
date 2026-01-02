#!/usr/bin/env bash
#
# Baseline Measurement Script
#
# Purpose: Collect baseline metrics for SLI/SLO establishment
# Usage: ./measure-baseline.sh --environment staging --duration 7d
#

set -euo pipefail

# Default values
ENVIRONMENT="${ENVIRONMENT:-staging}"
DURATION="${DURATION:-7d}"
OUTPUT_DIR="${OUTPUT_DIR:-baselines}"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://prometheus.${ENVIRONMENT}.summit.internal:9090}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --environment)
      ENVIRONMENT="$2"
      shift 2
      ;;
    --duration)
      DURATION="$2"
      shift 2
      ;;
    --output-dir)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    --prometheus-url)
      PROMETHEUS_URL="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --environment ENV     Environment to measure (default: staging)"
      echo "  --duration DURATION   Measurement duration (default: 7d)"
      echo "  --output-dir DIR      Output directory (default: baselines)"
      echo "  --prometheus-url URL  Prometheus URL (default: auto-detect)"
      echo "  -h, --help            Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo -e "${GREEN}=== Observability Baseline Measurement ===${NC}"
echo ""
echo "Environment: $ENVIRONMENT"
echo "Duration: $DURATION"
echo "Prometheus: $PROMETHEUS_URL"
echo "Output: $OUTPUT_DIR"
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Verify Prometheus is accessible
echo -e "${YELLOW}[1/5]${NC} Verifying Prometheus connectivity..."
if curl -sf "${PROMETHEUS_URL}/-/healthy" > /dev/null; then
  echo -e "${GREEN}✓${NC} Prometheus is healthy"
else
  echo -e "${RED}✗${NC} Cannot reach Prometheus at $PROMETHEUS_URL"
  echo "Please ensure Prometheus is running and accessible"
  exit 1
fi

# Query baseline metrics
echo -e "${YELLOW}[2/5]${NC} Querying baseline metrics..."

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BASELINE_FILE="$OUTPUT_DIR/${ENVIRONMENT}-baseline-${TIMESTAMP}.json"

# Function to query Prometheus
query_prometheus() {
  local query="$1"
  local description="$2"

  echo "  - $description"

  result=$(curl -sf "${PROMETHEUS_URL}/api/v1/query?query=${query}" | jq -r '.data.result[0].value[1] // "N/A"')

  if [[ "$result" == "N/A" ]]; then
    echo -e "    ${YELLOW}⚠${NC} No data available"
  else
    echo -e "    ${GREEN}✓${NC} Value: $result"
  fi

  echo "$result"
}

# Collect metrics
echo "{" > "$BASELINE_FILE"
echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"," >> "$BASELINE_FILE"
echo "  \"environment\": \"$ENVIRONMENT\"," >> "$BASELINE_FILE"
echo "  \"duration\": \"$DURATION\"," >> "$BASELINE_FILE"
echo "  \"metrics\": {" >> "$BASELINE_FILE"

# API Server Metrics
echo "    \"api_server\": {" >> "$BASELINE_FILE"

echo "Measuring API server metrics..."

# Error rate
error_rate=$(query_prometheus \
  "sum(rate(http_requests_total{status=~\"5..\"}[${DURATION}]))/sum(rate(http_requests_total[${DURATION}]))*100" \
  "Error rate (%)")
echo "      \"error_rate_percent\": $error_rate," >> "$BASELINE_FILE"

# Latency P50
latency_p50=$(query_prometheus \
  "histogram_quantile(0.50,rate(http_request_duration_seconds_bucket[${DURATION}]))*1000" \
  "Latency P50 (ms)")
echo "      \"latency_p50_ms\": $latency_p50," >> "$BASELINE_FILE"

# Latency P95
latency_p95=$(query_prometheus \
  "histogram_quantile(0.95,rate(http_request_duration_seconds_bucket[${DURATION}]))*1000" \
  "Latency P95 (ms)")
echo "      \"latency_p95_ms\": $latency_p95," >> "$BASELINE_FILE"

# Latency P99
latency_p99=$(query_prometheus \
  "histogram_quantile(0.99,rate(http_request_duration_seconds_bucket[${DURATION}]))*1000" \
  "Latency P99 (ms)")
echo "      \"latency_p99_ms\": $latency_p99," >> "$BASELINE_FILE"

# Throughput
throughput=$(query_prometheus \
  "sum(rate(http_requests_total[${DURATION}]))" \
  "Throughput (req/s)")
echo "      \"throughput_rps\": $throughput" >> "$BASELINE_FILE"

echo "    }," >> "$BASELINE_FILE"

# Database Metrics
echo "    \"database\": {" >> "$BASELINE_FILE"

echo "Measuring database metrics..."

# Query latency P95
db_latency_p95=$(query_prometheus \
  "histogram_quantile(0.95,rate(pg_stat_statements_mean_exec_time_bucket[${DURATION}]))" \
  "Query latency P95 (ms)")
echo "      \"query_latency_p95_ms\": $db_latency_p95," >> "$BASELINE_FILE"

# Connection pool utilization
conn_pool_util=$(query_prometheus \
  "pg_stat_database_numbackends/pg_settings_max_connections*100" \
  "Connection pool utilization (%)")
echo "      \"connection_pool_utilization_percent\": $conn_pool_util," >> "$BASELINE_FILE"

# Replication lag
repl_lag=$(query_prometheus \
  "pg_replication_lag" \
  "Replication lag (seconds)")
echo "      \"replication_lag_seconds\": $repl_lag" >> "$BASELINE_FILE"

echo "    }," >> "$BASELINE_FILE"

# Redis Metrics
echo "    \"redis\": {" >> "$BASELINE_FILE"

echo "Measuring Redis metrics..."

# Cache hit ratio
cache_hit_ratio=$(query_prometheus \
  "redis_keyspace_hits_total/(redis_keyspace_hits_total+redis_keyspace_misses_total)*100" \
  "Cache hit ratio (%)")
echo "      \"cache_hit_ratio_percent\": $cache_hit_ratio," >> "$BASELINE_FILE"

# Memory usage
memory_usage=$(query_prometheus \
  "redis_memory_used_bytes/redis_memory_max_bytes*100" \
  "Memory usage (%)")
echo "      \"memory_usage_percent\": $memory_usage" >> "$BASELINE_FILE"

echo "    }" >> "$BASELINE_FILE"

echo "  }" >> "$BASELINE_FILE"
echo "}" >> "$BASELINE_FILE"

echo ""
echo -e "${GREEN}[3/5]${NC} Baseline measurements collected"

# Calculate SLO compliance
echo -e "${YELLOW}[4/5]${NC} Calculating SLO compliance..."

# Check if metrics meet GA targets
check_slo() {
  local metric_name="$1"
  local current_value="$2"
  local target_value="$3"
  local comparison="$4"  # "less_than" or "greater_than"

  if [[ "$current_value" == "N/A" ]]; then
    echo -e "  ${YELLOW}⚠${NC} $metric_name: No data"
    return 0
  fi

  case "$comparison" in
    less_than)
      if (( $(echo "$current_value < $target_value" | bc -l) )); then
        echo -e "  ${GREEN}✓${NC} $metric_name: $current_value < $target_value (PASS)"
      else
        echo -e "  ${RED}✗${NC} $metric_name: $current_value >= $target_value (FAIL)"
      fi
      ;;
    greater_than)
      if (( $(echo "$current_value > $target_value" | bc -l) )); then
        echo -e "  ${GREEN}✓${NC} $metric_name: $current_value > $target_value (PASS)"
      else
        echo -e "  ${RED}✗${NC} $metric_name: $current_value <= $target_value (FAIL)"
      fi
      ;;
  esac
}

echo "API Server SLOs:"
check_slo "Error Rate" "$error_rate" "0.1" "less_than"
check_slo "Latency P95" "$latency_p95" "500" "less_than"
check_slo "Latency P99" "$latency_p99" "1000" "less_than"
check_slo "Throughput" "$throughput" "100" "greater_than"

echo ""
echo "Database SLOs:"
check_slo "Query Latency P95" "$db_latency_p95" "100" "less_than"
check_slo "Connection Pool Util" "$conn_pool_util" "80" "less_than"
check_slo "Replication Lag" "$repl_lag" "5" "less_than"

echo ""
echo "Redis SLOs:"
check_slo "Cache Hit Ratio" "$cache_hit_ratio" "90" "greater_than"
check_slo "Memory Usage" "$memory_usage" "80" "less_than"

# Save baseline
echo ""
echo -e "${GREEN}[5/5]${NC} Baseline saved to: $BASELINE_FILE"

# Summary
echo ""
echo -e "${GREEN}=== Measurement Complete ===${NC}"
echo ""
echo "Next steps:"
echo "1. Review baseline: cat $BASELINE_FILE | jq ."
echo "2. Generate alerts: scripts/observability/generate-alerts.sh --baseline $BASELINE_FILE"
echo "3. Create dashboards: scripts/observability/generate-dashboards.sh --baseline $BASELINE_FILE"
echo "4. Compare baselines over time: scripts/observability/compare-baselines.sh"
echo ""
