# Post-Deploy Health Dashboards

This directory contains operator-facing Grafana dashboards and alert rules designed for post-deploy validation, first-week operations, and runtime stability monitoring.

## Included Dashboards

1. **`post-deploy-validation.json`**: Provides an overview of post-deploy validation status, including pass/fail metrics for synthetic checks and core service health indicators.
2. **`runtime-stability.json`**: Monitors runtime stability signals such as service error rates, request volume, and latency percentiles (p50, p95, p99).
3. **`dependency-health.json`**: Tracks the health and performance of critical dependencies including the database (PostgreSQL), cache (Redis), and external API integrations.

## How to Import Dashboards

To import these dashboards into your Grafana instance:

1. Open your Grafana web interface.
2. Navigate to **Dashboards** -> **New** -> **Import** (or click the "+" icon and select "Import").
3. You can either:
   * Upload the JSON file directly by clicking "Upload JSON file" and selecting the desired dashboard file from this directory.
   * Or, copy the contents of the JSON file and paste it into the "Import via panel json" text area, then click "Load".
4. If prompted, select the appropriate Prometheus data source for your environment.
5. Click "Import" to finalize.

No manual edits to the JSON definitions are required.

## Prometheus Rules

The `prometheus/rules/post-deploy-health.yml` file contains Prometheus recording rules that pre-calculate error rates and latency quantiles (p50, p95, p99). These rules are required for the dashboards to function optimally and should be loaded into your Prometheus server.
