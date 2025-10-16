#!/usr/bin/env bash
set -euo pipefail
mkdir -p .github/k6
UI_URL=${UI_URL:-http://localhost:3000}
API_URL=${API_URL:-http://localhost:4000}
command -v k6 >/dev/null 2>&1 || { echo "k6 not installed"; exit 1; }
UI_URL="$UI_URL" API_URL="$API_URL" k6 run .github/k6/smoke.js --summary-export .github/k6/summary.json
