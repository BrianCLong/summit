#!/usr/bin/env bash
set -euo pipefail

: "${DEV_BASE_URL:?Set DEV_BASE_URL, e.g. https://maestro.dev.intelgraph.local}"

echo "🧪 Dev smoke against ${DEV_BASE_URL}"

echo "[1/4] /healthz"
curl -fsSL -D - "${DEV_BASE_URL}/healthz" >/dev/null

echo "[2/4] /readyz (fallback to /health if missing)"
if ! curl -fsSL -D - "${DEV_BASE_URL}/readyz" >/dev/null; then
  curl -fsSL -D - "${DEV_BASE_URL}/health" >/dev/null
fi

echo "[3/4] /api/version"
curl -fsSL "${DEV_BASE_URL}/api/version" | jq . >/dev/null

echo "[4/4] Light traffic burst"
if command -v hey >/dev/null 2>&1; then
  hey -z 20s -q 5 "${DEV_BASE_URL}/api/ping" || true
else
  for i in $(seq 1 20); do curl -fsS "${DEV_BASE_URL}/api/ping" >/dev/null || true; done
fi

echo "✅ Dev smoke complete"
