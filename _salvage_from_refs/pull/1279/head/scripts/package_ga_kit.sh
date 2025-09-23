#!/usr/bin/env bash
set -euo pipefail

OUT=${1:-intelgraph-ga-kit.zip}

FILES=(
  docs/runbooks/ga-operational-scorecard.md
  docs/runbooks/ga-go-no-go-checklist.md
  docs/incident/pagerduty-routing-matrix.md
  docs/releases/RELEASE_NOTES_v1.0.0.md
  ops/README.md
)

echo "Packaging GA kit to $OUT"
zip -r "$OUT" "${FILES[@]}" ops/k6 ops/chaos ops/prometheus ops/alertmanager ops/grafana ops/helm ops/cd >/dev/null
echo "Created $OUT"
