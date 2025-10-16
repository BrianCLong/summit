# Dashboards & Alerts

## Metrics to Chart

- API p95/p99, error rate, saturation (CPU/mem), queue lag, GC pause, DB/Neo4j latency.
- Release marker (annotation) on deploy start/finish.

## Alerts (Suggested Thresholds)

- API 5xx > 0.5% for 5m (warn), >1% for 5m (page).
- p95 > +30% vs 7d baseline for 10m (warn) / +60% (page).
- Unsigned image detected in namespace (page).

## Evidence Bundle Contents

- `manifest.json` — image→digest map.
- `sbom.spdx.json` — per image SBOM.
- `provenance.json` — SLSA predicate.
- k6 output (junit or summary) — attach to release notes.
- Lighthouse report HTML (if run).
