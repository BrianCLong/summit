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
- For Neo4j, enable metrics via APOC or use the Neo4j Prometheus plugin (ports vary by version; update accordingly).
- Grafana: add Prometheus as a data source and import standard Node.js/Express and Neo4j dashboards.

