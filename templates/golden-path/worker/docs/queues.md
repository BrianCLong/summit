# Queue Topology

- **Primary queue:** {{SERVICE_SLUG}}
- **Dead-letter queue:** {{SERVICE_SLUG}}-dlq
- **Metrics:** Exported via BullMQ `/metrics` endpoint and scraped into Grafana dashboard `Golden Path/Worker`.

## Retry Policy

Jobs retry 5 times with exponential backoff. Adjust in `src/worker.js` as needed.
