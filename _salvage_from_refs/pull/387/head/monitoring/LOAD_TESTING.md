# API Load Testing

Use this guide to stress test IntelGraph APIs and observe metrics through Grafana and Prometheus.

## Run the test

```bash
node scripts/api-load-test.js http://localhost:4000/health 10000 200
```

- **Endpoint** – API URL to test
- **Requests** – total number of requests
- **Concurrency** – number of simultaneous requests (default 100)

Prometheus collects request rate and latency while the test runs. Ensure the API exposes `/metrics` and Prometheus is scraping it.

## Visualize

Open Grafana and use the HTTP dashboard to watch traffic spikes and response times during the load test.

Example PromQL queries:

```promql
rate(http_requests_total[1m])
```

```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

Import `deploy/grafana/dashboards/http.json` for a starter dashboard or build a custom panel.
