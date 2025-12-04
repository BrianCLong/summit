# Service Level Objectives: Narrative Prioritization Service

## SLO Definitions

| Objective | Target | Measurement Window |
|-----------|--------|--------------------|
| **Latency** | p95 < 1500ms | 5 minutes |
| **Availability** | 99.9% Success Rate | 30 days |

## Enforcement

- **CI/CD**: k6 load tests (`k6/narrative-prioritization.js`) run on every PR to `main` and release branches.
- **Monitoring**: Prometheus alerts trigger if p95 latency exceeds 1500ms for > 5 minutes.
- **Dashboard**: `observability/dashboards/narrative-prioritization.json`.

## Methodology

Latency is measured from the ingress of the HTTP request to the egress of the HTTP response at the `/api/narrative-prioritization/prioritize` endpoint.
