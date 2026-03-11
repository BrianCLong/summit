# Summit Monitoring and Alerting Guide

## Overview

Summit utilizes a comprehensive observability stack based on OpenTelemetry (OTel), Prometheus, Jaeger, and Grafana to monitor system health, performance, and reliability. This guide details the configuration of our monitoring tools, key metrics, alert thresholds, and incident escalation paths.

## Observability Stack Configuration

### 1. OpenTelemetry (OTel)
OpenTelemetry is used across all microservices for distributed tracing and metric collection.
- **Initialization:** OTel must be initialized at the very top of application entry points (e.g., `server.ts` for Node.js apps) before any other modules are loaded.
- **Exporting:** Metrics are exported to Prometheus, and traces are exported to Jaeger.

### 2. Prometheus
Prometheus acts as the time-series database for all operational metrics.
- **Scraping:** Configured via `prometheus.yml` to scrape endpoints such as `/metrics`.
- **Targets:**
  - `intelgraph-backend` (e.g., Express applications exposing metrics via `prom-client`).
  - `neo4j` (using the Prometheus JMX Exporter or Neo4j Metrics plugin on port `2004`).

### 3. Jaeger
Jaeger provides distributed tracing capabilities, helping visualize request flows across microservices, including the API Gateway, Auth0 integration, and Neo4j queries.

### 4. Grafana
Grafana provides visualization for the data collected by Prometheus.
- **Data Source:** Configure Prometheus as the default data source.
- **Dashboards:** Import standard dashboards. A starter dashboard for Neo4j is available at `docs/monitoring/neo4j-grafana-dashboard.json`.

---

## Key Metrics to Monitor

1. **Request Latency (p95 / p99):** Measures the end-to-end response time for API requests.
2. **Error Rates (5xx):** Tracks the percentage of requests resulting in server-side errors.
3. **Graph Build Times:** Monitors the duration of Neo4j multi-hop Cypher traversals and context assembly.
4. **Ingestion Throughput:** Measures the rate of data processing through the Python worker architecture backed by Redis queues (`feed:ingest`).
5. **Model Inference Latency:** Tracks the latency of LLM queries and tool use within the Agent ecosystem.

---

## Alert Thresholds

| Metric | Warning Threshold | Paging Threshold | Duration |
|---|---|---|---|
| **API 5xx Error Rate** | > 0.5% | > 1.0% | 5 minutes |
| **Request Latency (p95)** | +30% vs 7d baseline | +60% vs 7d baseline | 10 minutes |
| **Graph Build Time** | > 2 seconds | > 5 seconds | 5 minutes |
| **Ingestion Queue Lag** | > 10,000 items | > 50,000 items | 15 minutes |
| **Model Inference Latency**| +40% vs 7d baseline | +80% vs 7d baseline | 10 minutes |

*Note: All alerts must include a `runbook_url` annotation pointing to `https://runbooks.intelgraph.io/` routing to `docs/runbooks/`.*

---

## Alert Routing and Escalation Paths

Alerts are routed to teams based on the defined ownership in `.github/CODEOWNERS`. If a specialized team does not acknowledge, it escalates to the global fallback.

- **Global Fallback:** `@intelgraph-core`
- **Infrastructure & Ops (K8s, Helm, Deployments):** `@team-ops`
- **Security & Auth:** `@intelgraph-security`
- **API Gateway & Resolvers:** `@intelgraph-api` / `@team-gateway`
- **Database & Graph (Neo4j, Postgres):** `@intelgraph-data`
- **Ingestion Pipeline (Redis `feed:ingest`):** `@team-ingest`

## Grafana Dashboard Setup Instructions

1. Log into your Grafana instance.
2. Navigate to **Configuration > Data Sources** and add Prometheus.
3. Navigate to **Dashboards > Import**.
4. Upload the provided JSON file `docs/monitoring/neo4j-grafana-dashboard.json` or paste its contents.
5. Select the configured Prometheus data source when prompted.
6. Save the dashboard. Additional service-specific dashboards should be imported similarly based on team requirements.
