Prometheus/Grafana Setup

Prometheus scrape config example (prometheus.yml):

scrape_configs:

- job_name: 'intelgraph-backend'
  static_configs:
  - targets: ['server:4000']
    metrics_path: /metrics

- job_name: 'neo4j'
  static_configs:
  - targets: ['neo4j:2004']
    metrics_path: /metrics

Notes

- Backend exposes /metrics when prom-client is installed and enabled (already added).
- Neo4j: enable metrics via Prometheus JMX Exporter or Neo4j Metrics plugin:
  - JMX Exporter sidecar (recommended for OSS):
    - Add JVM opts to Neo4j: NEO4J_dbms_jmx_enabled=true
    - Run jmx_exporter as a Java agent or sidecar scraping `:12345` and configure Prometheus to scrape it.
  - Neo4j Metrics plugin (Enterprise): enable Prometheus endpoint and expose it (commonly 2004) by setting env vars or `neo4j.conf`:
    - `metrics.prometheus.enabled=true`
    - `metrics.prometheus.endpoint=0.0.0.0:2004`
  - Sample Prometheus job is provided above (targets: neo4j:2004).

Grafana Dashboards

- A starter dashboard JSON is included at `docs/monitoring/neo4j-grafana-dashboard.json`.
- Import it in Grafana, and point the panels to your Prometheus data source.
- Grafana: add Prometheus as a data source and import standard Node.js/Express and Neo4j dashboards.

## GraphQL Gateway OpenTelemetry Metrics

- OpenTelemetry instrumentation for GraphQL requests lives in `server/src/graphql/plugins/otelMetricsPlugin.ts`.
- Metrics are exported over the existing `/metrics` endpoint via the OTLP Prometheus exporter and are scrapeable with the configs above.

### Metric catalog

- `graphql_requests_total` (counter): total GraphQL requests observed by the API gateway, labelled with `operation` and `operation_type`.
- `graphql_request_errors_total` (counter): GraphQL resolver failures grouped by operation, operation type, and error code.
- `graphql_query_complexity` (histogram): cost-based query complexity derived from `graphql-query-complexity`; useful for p95/99 percentile tracking.
- `graphql_error_rate` (observable gauge): per-operation and aggregate error ratios derived from the request and error counters for quick SLO checks.

### Dashboards & alerts

- Grafana export: `ops/grafana/dashboards/intelgraph-graphql-otel.json` adds availability/error-rate stats, complexity p95 trends, and top operations by complexity.
- Prometheus alert rules: `ops/prometheus/prometheus-rule-graphql.yaml` defines recordings and alerts that enforce the 99.9% availability SLO and highlight sustained complexity spikes.
- SLO guardrails:
  - Availability alert fires when 5-minute error rate exceeds 0.1% (breaching the 99.9% target).
  - Fast-burn alert pages at >0.5% error rate (5× the budget) for two minutes.
  - Complexity spike warning triggers if p95 complexity stays above 750 for ten minutes.

### Operational checklist

1. Import the Grafana dashboard JSON into the operations folder and map it to your Prometheus data source.
2. Include both `prometheus-rule-slo.yaml` and `prometheus-rule-graphql.yaml` in Alertmanager deployments to enforce SLO coverage.
3. Confirm that `graphql_requests_total` and `graphql_query_complexity_bucket` appear on the `/metrics` endpoint before enabling alerts in production.
