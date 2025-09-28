#!/usr/bin/env bash
set -euo pipefail

OUT_DIR=${1:-"perf_snapshot"}
mkdir -p "$OUT_DIR"

echo "# Metrics" > "$OUT_DIR/README.md"
date -Iseconds >> "$OUT_DIR/README.md"

echo "Fetching /metrics ..."
curl -s http://localhost:4000/metrics > "$OUT_DIR/api_metrics.json" || echo '{}' > "$OUT_DIR/api_metrics.json"

echo "Running k6 smoke ..."
if command -v k6 >/dev/null 2>&1; then
  k6 run load/k6_smoke.js > "$OUT_DIR/k6_smoke.txt" || true
else
  echo "k6 not installed" > "$OUT_DIR/k6_smoke.txt"
fi

echo "Perf snapshot written to $OUT_DIR"

