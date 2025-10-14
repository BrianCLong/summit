#!/usr/bin/env bash
set -euo pipefail

SERVICE_URL="${SERVICE_URL:-http://localhost:8080}"

response=$(curl -fsS "$SERVICE_URL/healthz")
echo "Health check response: $response"
