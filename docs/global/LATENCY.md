# Latency & Routing Optimization

## Routing Rules

- **Nearest healthy region**: Default routing to lowest RTT healthy region with residency compliance check.
- **Sticky routing**: Enable tenant-scoped stickiness for interactive sessions requiring strong consistency; stickiness expires on inactivity or control-plane version change.
- **Policy-aware retries**: Cross-region retries allowed only when residency permits and request is idempotent; otherwise return controlled error.

## Latency Budgets

- **Edge to ingress**: <50ms P95 within region; <150ms cross-region fallback.
- **Ingress to service**: <25ms P95 with circuit-breaker bypass on policy failures.
- **Service to datastore**: <30ms P95 for primary-region writes; <80ms P95 for read replicas; replication lag budget <500ms.
- **End-to-end**: <250ms P95 for read paths; <400ms P95 for write paths under healthy conditions.

## Measurement & Instrumentation

- **Metrics**: `latency.edge_to_ingress`, `latency.ingress_to_service`, `latency.service_to_db`, `replication.lag.ms`, labeled by region/tenant.
- **Tracing**: Propagate W3C tracecontext with region and policy-version tags; sample failover events at 100% until stable.
- **Before/after baselines**: Capture baseline latency/error rate pre-change; compare during game days and releases.
- **Alerts**: Breach of replication lag or policy-cache staleness triggers routing dampening and alerts to SRE + governance.
