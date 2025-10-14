# Sample Service SLO Summary

- **Service:** sample-service
- **Environment:** production
- **Objective Owner:** Sample Team (sre-sample@summit)
- **Last Review:** 2025-09-28

## Objectives
| SLO | Target | Measurement | Alert | Runbook |
| --- | ------ | ----------- | ----- | ------- |
| Availability | 99.9% (30d) | Error budget burn via `request_error_rate` | `error-budget-burn` | [Error Budget Runbook](../runbooks/error-budget-runbook.md) |
| Latency | p99 < 750ms (7d) | `request_latency_ms` p99 | `latency-burn-multiwindow` | [Latency Runbook](../runbooks/latency-slo-runbook.md) |
| Saturation | Queue depth <500 (15m) | `worker_queue_depth` | `saturation-queue-depth` | [Saturation Runbook](../runbooks/saturation-runbook.md) |

## SLIs
- `request_latency_ms` histogram exported by API gateway
- `request_error_rate` counter from API responses
- `worker_queue_depth` gauge from queue exporter

## Dependencies
- Postgres `orders-primary`
- Redis `jobs-cache`
- Upstream service: `identity-api`

## Review Notes
- 2025-09-21: Latency incident caused by Redis saturation; scaled cluster.
- Next review: 2025-10-05 (bi-weekly cadence).
