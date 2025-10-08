#!/usr/bin/env bash
set -euo pipefail

host="${1:-http://localhost:8080}"

echo "• Hitting ${host}/healthz ..."
curl -fsSL "${host}/healthz" >/dev/null
echo "  OK"

echo "• Fetching ${host}/version ..."
ver="$(curl -fsSL "${host}/version" || echo 'unknown')"
echo "  Version: ${ver}"

echo "Smoke passed."