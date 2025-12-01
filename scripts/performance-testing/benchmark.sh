#!/bin/bash
set -e

# Performance Benchmarking Script
# Runs comprehensive performance tests and generates reports

BASE_URL="${BASE_URL:-http://localhost:4000}"
RESULTS_DIR="${RESULTS_DIR:-./performance-results}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$RESULTS_DIR/$TIMESTAMP"

echo "=== Performance Benchmark Suite ==="
echo "Base URL: $BASE_URL"
echo "Results: $RESULTS_DIR/$TIMESTAMP"
echo ""

# 1. GraphQL Query Performance
echo "=== Test 1: GraphQL Query Performance ==="
k6 run \
  --out json="$RESULTS_DIR/$TIMESTAMP/graphql-queries.json" \
  --out influxdb=http://localhost:8086/k6 \
  scripts/performance-testing/load-test.js

# 2. Database Query Performance
echo "=== Test 2: Database Query Performance ==="
pgbench -h localhost -U summit -d summit_dev \
  -c 50 -j 4 -t 10000 \
  -r > "$RESULTS_DIR/$TIMESTAMP/postgres-bench.txt"

# 3. Cache Performance
echo "=== Test 3: Cache Performance ==="
redis-benchmark -h localhost -p 6379 \
  -n 1000000 -c 50 -q \
  > "$RESULTS_DIR/$TIMESTAMP/redis-bench.txt"

# 4. API Endpoint Performance
echo "=== Test 4: REST API Performance ==="
ab -n 100000 -c 100 -g "$RESULTS_DIR/$TIMESTAMP/api-gnuplot.tsv" \
  "$BASE_URL/api/health" \
  > "$RESULTS_DIR/$TIMESTAMP/api-bench.txt"

# 5. WebSocket Performance
echo "=== Test 5: WebSocket Performance ==="
artillery run \
  --output "$RESULTS_DIR/$TIMESTAMP/websocket-report.json" \
  scripts/performance-testing/websocket-test.yml

# 6. Full-text Search Performance
echo "=== Test 6: Search Performance ==="
esrally race \
  --track=geonames \
  --target-hosts=localhost:9200 \
  --report-file="$RESULTS_DIR/$TIMESTAMP/elasticsearch-bench.md"

# Generate summary report
echo "=== Generating Summary Report ==="
cat > "$RESULTS_DIR/$TIMESTAMP/SUMMARY.md" <<EOF
# Performance Benchmark Summary
**Date:** $(date)
**Base URL:** $BASE_URL

## Results

### 1. GraphQL Query Performance
- See: graphql-queries.json
- Metrics: p50, p95, p99 latency, throughput, error rate

### 2. Database Performance
- See: postgres-bench.txt
- TPS: $(grep "tps =" "$RESULTS_DIR/$TIMESTAMP/postgres-bench.txt" | awk '{print $3}')

### 3. Cache Performance
- See: redis-bench.txt
- GET: $(grep "GET:" "$RESULTS_DIR/$TIMESTAMP/redis-bench.txt" | awk '{print $2}') requests/sec
- SET: $(grep "SET:" "$RESULTS_DIR/$TIMESTAMP/redis-bench.txt" | awk '{print $2}') requests/sec

### 4. API Performance
- See: api-bench.txt
- Requests/sec: $(grep "Requests per second" "$RESULTS_DIR/$TIMESTAMP/api-bench.txt" | awk '{print $4}')
- Mean latency: $(grep "Time per request" "$RESULTS_DIR/$TIMESTAMP/api-bench.txt" | head -1 | awk '{print $4}')ms

### 5. WebSocket Performance
- See: websocket-report.json

### 6. Search Performance
- See: elasticsearch-bench.md

## Recommendations
EOF

# Compare with baseline if exists
if [ -f "$RESULTS_DIR/baseline/SUMMARY.md" ]; then
  echo "Comparing with baseline..."
  # Add comparison logic here
fi

echo ""
echo "=== Benchmark Complete ==="
echo "Results saved to: $RESULTS_DIR/$TIMESTAMP"
echo "View summary: cat $RESULTS_DIR/$TIMESTAMP/SUMMARY.md"
