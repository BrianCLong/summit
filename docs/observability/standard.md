# Summit Observability Standard

## Purpose

This contract defines the minimum telemetry that every Summit service must emit so new services can become debuggable, supportable, and auditable within 30 minutes of bootstrapping.

## Logging Contract (Structured JSON)

Every log line **must** include the following fields:

| Field         | Purpose                                                                       |
| ------------- | ----------------------------------------------------------------------------- |
| `trace_id`    | Correlate logs to traces and spans. Accept inbound `x-trace-id` when present. |
| `span_id`     | Identify the current span context.                                            |
| `request_id`  | Stable request correlation identifier (idempotency, retries).                 |
| `actor`       | Authenticated subject (user/service).                                         |
| `customer_id` | Tenant or customer identifier (emit only when policy allows).                 |
| `decision_id` | Business/policy decision reference (AB tests, allow/deny).                    |
| `build_sha`   | Build or release fingerprint for drift and rollback.                          |

Additional recommendations:

- Emit `level`, `ts` (ISO8601), `message`, `service`, `environment`, and `route`.
- Prefer JSON logs; avoid multi-line payloads. Redact secrets; never log credentials or tokens.
- Propagate inbound headers: `x-trace-id`, `x-span-id`, `x-request-id`, `x-actor-id`, `x-customer-id`, `x-decision-id`.

## Metrics Baseline

Each service must expose Prometheus-compatible metrics for:

- **Rate**: `http_requests_total{method,code}`
- **Error rate**: `http_request_errors_total{code}`
- **Latency**: `http_request_duration_ms_bucket`, `http_request_duration_ms_sum`, `http_request_duration_ms_count`
- **Saturation**: `resource_saturation_ratio{resource}` (CPU, worker pool, db pool)
- **Queues**: `queue_depth{queue}`
- **Retries**: `http_retries_total`
- **Cache**: `cache_hits_total` (emit `cache_miss_total` if a cache exists)

## Tracing Conventions

- Start an inbound HTTP span named `http.request` with attributes `http.method`, `http.route`, `http.target`, `net.peer.ip`.
- Create child spans for key internal work: `db.query`, `cache.get`, `queue.publish`, `external.http`, and business-critical units such as `work.db` or `policy.evaluate`.
- Attach error tags: `error=true`, `error.type`, `error.message`, `status_code` on failures.
- Propagate `trace_id`/`span_id` via HTTP headers; prefer W3C `traceparent` when interoperating with external systems.

## Golden Dashboard (Grafana)

Import `docs/observability/golden-dashboard.json` to provision a standard view with:

1. Request rate & error rate (stacked by status code)
2. Latency heatmap and P50/P95/P99
3. Saturation gauges (CPU / worker pool)
4. Queue depth trend
5. Retry + cache-hit ratio
6. Top error signatures with links to traces
7. Service overview panel linking to runbook and SLO

## Alert Rules

See `docs/observability/alert-rules.yaml` for Prometheus alert definitions covering:

- Elevated 5xx rate (>2% for 5 minutes)
- Latency SLO violation (P95 over threshold)
- Queue backlog growth
- Worker saturation (>85% for 10 minutes)
- Error budget burn (fast and slow burn)

## SLO Template

Use these defaults for a new HTTP service (update thresholds per service characteristics):

- **Objective**: 99.5% of requests served < 500 ms over 30d, with 99% availability.
- **Indicators (SLIs)**:
  - Availability: `1 - (5xx / all)` using `http_requests_total`
  - Latency: P95 from `http_request_duration_ms_*`
  - Reliability: queue processing success ratio when applicable
- **Error budget**: 0.5% monthly (fast burn 2%/1h, slow burn 1%/6h alerts)
- **SLO document**: start from `docs/observability/runbook-template.md` and fill the SLO section.

## Adoption in <30 Minutes

1. Add the obs SDK middleware: `const { httpMiddleware } = require('services/obs-demo-service/obs-sdk.cjs');`
2. Wrap your HTTP handler with `httpMiddleware` to auto-create trace/log context.
3. Emit structured logs using `log(level, message, fields)`.
4. Create spans with `startSpan(name, attributes, fn)` for DB/cache/external calls.
5. Expose `/metrics` via `exportPrometheus()`.
6. Import the golden dashboard JSON; link alerts to your PagerDuty routing key.
7. Fill out the runbook template with owner, pager, dashboards, and playbooks.

## Operational Expectations

- Run 500-rate synthetic tests against `/maybe-error?fail=1` to validate alerting.
- Keep metrics scrape interval ≤30s; traces retained ≥7 days for tier-1, ≥3 days for tier-2.
- Every incident ticket must include at least one trace URL and the correlated `trace_id` from logs.

## Security & Governance

- Do not emit `customer_id` when policy forbids it; gate with data-classification checks.
- Mask PII and secrets at the edge; never log secrets or access tokens.
- Follow the escalation paths in `docs/governance/AGENT_MANDATES.md` for ambiguous policies.
