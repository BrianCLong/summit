# k6 Performance Suite

This suite exercises golden journeys with smoke, baseline, stress, spike, and soak coverage. It reads targets from `perf/models.yaml` and isolates traffic using synthetic tenant metadata.

## Prerequisites

- k6 0.50+ (local or Docker).
- Access to preview/stage endpoints; avoid production except low-QPS smoke.
- Environment variables:
  - `K6_BASE_URL` (required)
  - `K6_TENANT` (default: `test-perf`)
  - `K6_HEADERS_JSON` (JSON map appended to every request; defaults to `{ "x-perf": "true", "x-tenant": "test-perf" }`).
  - `K6_DURATION_FACTOR` (scale durations, e.g., `0.5` for quicker local runs).
  - `PROM_REMOTE_URL` for remote write (optional; enables `k6 run --out experimental-prometheus-remote`).

## Running

```bash
# Smoke (quick guard)
k6 run k6/golden-baseline.js --tag run=smoke --summary-export perf/results/k6-smoke-summary.json

# Baseline with thresholds and Prometheus remote write
k6 run k6/golden-baseline.js \
  --out json=perf/results/k6-baseline.json \
  --summary-export perf/results/k6-baseline-summary.json \
  ${PROM_REMOTE_URL:+--out experimental-prometheus-remote=$PROM_REMOTE_URL}

# Stress ramp
k6 run k6/golden-stress.js --summary-export perf/results/k6-stress-summary.json

# Spike burst
k6 run k6/golden-spike.js --summary-export perf/results/k6-spike-summary.json

# Soak (default 3h, scale via K6_DURATION_FACTOR)
k6 run k6/golden-soak.js --summary-export perf/results/k6-soak-summary.json
```

Artifacts are written to `perf/results/` and consumed by `.ci/scripts/perf/pr_comment_summary.py` for PR summaries.

## Thresholds and Checks

- Global: `<1%` HTTP failures.
- Journey-specific: p95 budgets per `perf/models.yaml`.
- Application SLIs validated via `check()` blocks for response schema correctness.

## Synthetic Data and Tenancy

All scenarios send `x-perf: true` and `x-tenant: test-perf` headers. Fixtures should be pre-seeded for the `test-perf` tenant; tests must not mutate production data.

## Prometheus Remote Write

Pass `PROM_REMOTE_URL` and optional `K6_PROM_PUSH_INTERVAL` to ship metrics to long-term storage. Grafana dashboards expect `run` and `journey` tags.
