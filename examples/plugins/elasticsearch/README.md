# Elasticsearch Plugin Example

This example demonstrates how to stream Summit investigation data into Elasticsearch for federated search or anomaly detection. It uses the REST API and assumes Elasticsearch is reachable at `ELASTICSEARCH_URL` with basic auth credentials.

## Prerequisites

- Node.js 20+
- Elasticsearch 8.x with an index named `summit-events` (auto-created if missing)
- Environment variables:
  - `ELASTICSEARCH_URL` (e.g., `https://localhost:9200`)
  - `ELASTICSEARCH_USERNAME`
  - `ELASTICSEARCH_PASSWORD`

## Usage

```bash
cd examples/plugins/elasticsearch
node index.js
```

The script writes a sample investigation document and prints the indexed ID. Replace the payload with your own investigation or entity records.

## Production Tips

- Rotate credentials using Kubernetes secrets or Vault and inject via `envFrom`.
- Use ILM (Index Lifecycle Management) to roll over logs daily and delete data older than 30 days by default.
- Enable the `async` bulk API for high-volume ingest and tune `refresh_interval` to `30s` during backfills.
