#!/usr/bin/env bash
set -euo pipefail

BASE=${BASE:-http://localhost:4000}
API="$BASE/api/maestro/v1"

echo "== Health =="
curl -fsS "$BASE/api/health" | jq '.'
curl -fsS "$BASE/api/ready" | jq '.'

echo "== Metrics (first lines) =="
curl -fsS "$BASE/metrics" | head -n 10

echo "== Pipelines policy hints (OPA) =="
curl -fsS -X POST "$API/pipelines/hints" \
  -H 'Content-Type: application/json' \
  -d '{"nodes":[{"id":"n1","type":"llm","temperature":0.9}]}' | jq '.'

echo "== MCP servers (read-only) =="
curl -fsS "$API/mcp/servers" | jq '.'

echo "== Prometheus and Grafana availability =="
curl -fsS http://localhost:9090/api/v1/status/buildinfo | jq '.'
curl -fsS http://localhost:3001/api/health | jq '.'

echo "Smoke OK"
