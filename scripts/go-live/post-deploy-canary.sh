#!/bin/bash
set -e

# Configuration
BASE_URL="${BASE_URL:-https://summit.example.com}"
METRIC_PREFIX="${METRIC_PREFIX:-process_}"
SHA="${GITHUB_SHA:-$(git rev-parse HEAD)}"
OUTPUT_DIR="artifacts/evidence/post-deploy/${SHA}"
OUTPUT_FILE="${OUTPUT_DIR}/canary.json"

mkdir -p "${OUTPUT_DIR}"

echo "Starting Post-Deploy Canary..."
echo "Target: ${BASE_URL}"
echo "Output: ${OUTPUT_FILE}"

# Helper to check endpoint
check_endpoint() {
    local endpoint=$1
    local expected_code=$2
    local check_content=$3
    local url="${BASE_URL}${endpoint}"

    echo -n "Checking ${endpoint}... "

    local start_time=$(date +%s%N)
    local http_code=$(curl -s -o /tmp/canary_response.txt -w "%{http_code}" "${url}" || echo "000")
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 )) # ms

    local status="pass"
    local error=""

    if [ "$http_code" -ne "$expected_code" ]; then
        status="fail"
        error="Expected ${expected_code}, got ${http_code}"
        echo "FAIL (${http_code})"
    else
        if [ -n "$check_content" ]; then
            if ! grep -q "$check_content" /tmp/canary_response.txt; then
                status="fail"
                error="Content check failed: '$check_content' not found"
                echo "FAIL (content mismatch)"
            else
                echo "PASS (${duration}ms)"
            fi
        else
            echo "PASS (${duration}ms)"
        fi
    fi

    # Append to JSON array (using temporary file to construct)
    echo "{\"endpoint\": \"${endpoint}\", \"status\": \"${status}\", \"code\": ${http_code}, \"latency_ms\": ${duration}, \"error\": \"${error}\"}" >> /tmp/canary_results.jsonl
}

# Clear temp file
> /tmp/canary_results.jsonl

# Run checks
# Note: In a real environment, we'd want to handle connection refused explicitly,
# but curl return code handling covers basic "cannot connect" as 000
check_endpoint "/readyz" 200 ""
check_endpoint "/healthz" 200 ""
check_endpoint "/health" 200 ""
check_endpoint "/metrics" 200 "${METRIC_PREFIX}"
check_endpoint "/status" 200 "version"

# Aggregate results
if [ -s /tmp/canary_results.jsonl ]; then
    RESULTS=$(jq -s '.' /tmp/canary_results.jsonl)
else
    RESULTS="[]"
fi

OVERALL_STATUS="pass"
if echo "$RESULTS" | grep -q '"status": "fail"'; then
    OVERALL_STATUS="fail"
fi

# Write final JSON
cat <<EOF > "${OUTPUT_FILE}"
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "base_url": "${BASE_URL}",
  "commit_sha": "${SHA}",
  "overall_status": "${OVERALL_STATUS}",
  "checks": ${RESULTS}
}
EOF

echo "Canary complete. Status: ${OVERALL_STATUS}"
if [ "$OVERALL_STATUS" == "fail" ]; then
    exit 1
fi
