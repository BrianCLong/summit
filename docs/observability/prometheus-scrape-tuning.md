# Prometheus Scrape Interval Tuning

Scrape cadences are set to balance SLO sensitivity with resource cost. The current profile (in `ops/observability/prometheus.yml`) is optimized for fast detection of latency and availability regressions while keeping infra exporters lighter-weight.

## Current Cadence

| Job                                 | Interval | Rationale                                                                         |
| ----------------------------------- | -------- | --------------------------------------------------------------------------------- |
| Global default                      | 10s      | Matches burn-rate alert windows (5m/30m) without overwhelming receivers.          |
| intelgraph-api / intelgraph-gateway | 5s       | User-facing paths; faster sampling improves p95 accuracy and reduces alert delay. |
| Prometheus self-scrape              | 15s      | Lower cardinality; not SLO-impacting.                                             |
| Neo4j / Postgres / Redis exporters  | 20s      | Infra health changes more slowly; reduces scrape pressure on databases.           |
| cAdvisor                            | 20s      | Node/container stats are stable enough for 20s granularity.                       |

## Trade-offs

- **Lower intervals (5–10s)** increase p95 fidelity and alert responsiveness but add ~2× TSDB churn; keep retention to 7d and WAL compression enabled.
- **Higher intervals (20–30s)** lighten exporter load but risk missing short-lived regressions; rely on blackbox probes to catch outages between scrapes.
- **Evaluation cadence** at 10s keeps rule calculation aligned with scrape freshness; alerts fire faster without flapping because `for` windows are ≥5m.

## How to Adjust

1. Edit `ops/observability/prometheus.yml` and keep 2-space indentation per `ops/AGENTS.md`.
2. For high-churn services, prefer per-job overrides instead of changing the global default.
3. After changes, run `curl -X POST http://localhost:9090/-/reload` or restart Prometheus; watch `prometheus_tsdb_head_chunks` for growth and adjust retention if needed.
