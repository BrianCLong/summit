# Summit Observability SLOs

This document defines the production SLO contract for critical services. It is backed by the machine-readable source of truth at [`config/slo.yaml`](../../config/slo.yaml).

## SLO Types

| SLO           | Definition                                                                              | Target (default)                        |
| ------------- | --------------------------------------------------------------------------------------- | --------------------------------------- |
| Availability  | Percentage of successful requests per 30d window                                        | 99.9% APIs / 99.0% pipelines            |
| Latency (p95) | 95th percentile end-to-end request latency over rolling 7d window                       | 500–750ms APIs / 3s LLM / 15s ingestion |
| Error Budget  | Allowed failure window derived from availability target over 30d (e.g., 0.1% for 99.9%) | Burn actions in `config/slo.yaml`       |

### Error Budget Policy

- **Windows:** 30d rolling window with 1h (fast) and 6h (slow) burn checks.
- **Actions:**
  - Freeze deploys if fast burn rate > 6 over 1h.
  - Page SRE and open RCA if slow burn > 1 over 6h.
  - Require rollback plan when remaining budget < 25%.

## Service Coverage

| Service              | Availability | Latency (p95) | Error Metric                            | Throughput Metric                         |
| -------------------- | ------------ | ------------- | --------------------------------------- | ----------------------------------------- |
| `api-gateway`        | 99.9%        | 500ms         | `errors_total`                          | `http_requests_total`                     |
| `intelgraph-api`     | 99.9%        | 750ms         | `errors_total`                          | `http_requests_total`                     |
| `llm-orchestrator`   | 99.5%        | 3s            | `llm_invocations_total{status="error"}` | `llm_tokens_total{token_type="output"}`   |
| `ingestion-pipeline` | 99.0%        | 15s           | `errors_total`                          | `ingestion_throughput_records_per_second` |

## Dashboards & Alerts

- Grafana dashboard: [`grafana/dashboards/observability-slo-v1.json`](../../grafana/dashboards/observability-slo-v1.json)
- Alerting aligns to RED/USE metrics exported via `@intelgraph/observability`:
  - Request rate: `http_requests_total`
  - Latency: `http_request_duration_seconds` and `llm_invocation_duration_seconds`
  - Error budget burn: derived from availability/error-rate objectives per service

## Operability Expectations

- All production-critical services **must**:
  - Export Prometheus-compatible counters, histograms, and gauges via `@intelgraph/observability`.
  - Declare SLO entries in `config/slo.yaml` with availability, p95 latency, and error budget targets.
  - Attach dashboards and runbooks referenced from the SLO source of truth.
- GA gate fails if any required service is missing an SLO definition or required metric linkage.
