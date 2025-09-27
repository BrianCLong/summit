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
