# CompanyOS Observability, Audit, and Event Intelligence Guide

## Event Taxonomy

- **Activity events (product analytics):** User-initiated, business workflow steps. Examples: dashboard_viewed, case_submitted, policy_acknowledged. Purpose: activation/retention tracking, funnel analytics, approval cycle time.
- **Audit events (governance/forensics):** Security-sensitive, compliance-relevant state transitions. Immutable, append-only, WORM storage. Examples: role_assigned, permission_granted, policy_changed, export_requested. Strictly scoped to actor, tenant, target entity, action, decision, and outcome.
- **Operational metrics:** Quantitative time-series for availability, latency, error rates, saturation (CPU/memory), queue depth, throughput. No PII; tagged by service, region, deployment ring, and tenant (where safe and cardinality is controlled).
- **Traces:** Distributed request spans with request_id/trace_id; redacted attributes; sampled at dynamic rates (tail-based for high-latency/error cases).

## JSON Event Schema (shared envelope)

```json
{
  "event_id": "uuid-v7",
  "event_type": "activity | audit",
  "occurred_at": "RFC3339 timestamp",
  "recorded_at": "RFC3339 timestamp",
  "actor": {
    "type": "user | service | system",
    "id": "stable identifier",
    "role": "optional role/permission set",
    "ip": "optional, truncated/hashed per policy",
    "user_agent": "optional, normalized"
  },
  "tenant": {
    "id": "tenant-uuid",
    "slug": "optional human-safe identifier"
  },
  "entity": {
    "type": "case | document | policy | workflow | connector | auth_session | dataset | queue",
    "id": "primary identifier",
    "version": "optional version/revision"
  },
  "action": "verb in snake_case (e.g., policy_acknowledged)",
  "result": "success | failure | denied | pending",
  "reason": "optional, structured error code or policy decision",
  "correlation": {
    "request_id": "uuid",
    "trace_id": "W3C traceparent id",
    "span_id": "optional",
    "job_id": "optional batch/async job id"
  },
  "metadata": {
    "safe_fields_only": true,
    "details": { "…": "domain-specific key/values (PII/PHI forbidden)" }
  },
  "integrity": {
    "hash": "SHA-256 of canonicalized event",
    "prev_hash": "for chain-linking in immutable log"
  }
}
```

### Audit Event Extensions

- Stored in append-only ledger (e.g., WORM object store + tamper-evident hash chain).
- Signed with tenant-scoped key or HSM-backed service key.
- Indexed by `tenant.id`, `actor.id`, `occurred_at` to satisfy forensic queries.
- No mutable updates; corrections use compensating events referencing `event_id`.

## Correlation Strategy

- **Request IDs:** Generated at ingress (API gateway/reverse proxy). Propagate via `X-Request-ID` and inject into logs, traces, and audit events.
- **Trace IDs:** W3C Trace Context (`traceparent`/`tracestate`). Services propagate via OpenTelemetry SDK middleware; tail-based sampling increases rate for high latency/error spans.
- **Session/Job IDs:** Async jobs carry `job_id` + originating `request_id` in queue metadata. Cron/system tasks use synthetic `actor.type=system`.
- **Cross-system linkage:** Audit events include `trace_id`/`request_id` so forensic queries can pivot between logs, traces, and ledger events.

## Recommended Stack

- **Ingestion:** OpenTelemetry Collector (OTLP over gRPC/HTTP) for logs/metrics/traces; processors for redaction and tenant-tag validation.
- **Logs:** Structured JSON to vector-friendly backend (e.g., Elasticsearch/OpenSearch or Loki). No payload dumps; log policies enforce field allowlists.
- **Metrics:** Prometheus-compatible TSDB (Cortex/Mimir/Thanos) with recording/alerting rules. SLOs via OpenSLO spec + Alertmanager routing.
- **Tracing:** Jaeger/Tempo/Zipkin compatible via OTLP. Tail-based sampling for anomalies; service mesh (Envoy/Linkerd) adds server-side spans.
- **Event Ledger:** Immutable audit store (e.g., AWS S3 Object Lock, GCS Bucket Lock, or on-prem WORM) with Merkle-chain manifest stored in PostgreSQL/OPA data source.
- **Product Analytics:** Privacy-aware warehouse views (e.g., BigQuery/Snowflake/ClickHouse) fed from activity events after PII stripping; feature flags control optional fields.

## Dashboards (minimum set)

- **Availability:** Uptime % by service/region/ring; SLI burn-rate panels mapped to SLOs.
- **Latency:** p50/p90/p99 for read/write paths, broken out by tenant and critical workflows (login, search, approval, export).
- **Error Rates:** 4xx/5xx by endpoint, top error codes, rollback indicator; correlation with deploys.
- **Queue Depth & Lag:** Per queue/topic depth, processing lag, DLQ volume, retry rate, worker saturation.
- **Auth Failures:** Login failure rate, MFA challenges, lockouts, token refresh errors, anomalous geo/ASN patterns.
- **Resource Saturation:** CPU, memory, disk I/O, connection pool usage with autoscaling signals.

## Product Analytics Signals

- **Activation:** First successful login + first dashboard_viewed + first data import within 24h.
- **Retention:** D7/D30 active users per tenant; weekly active workflows executed.
- **Approval Cycle Time:** Median/95th percentile from request_submitted to approval_granted; broken down by policy type.
- **Policy Acknowledgment Rate:** Unique actors acknowledging latest policy version ÷ total targeted actors; time-to-acknowledge distribution.
- **Feature Adoption:** Usage of key workflows (e.g., investigation created, connector enabled) per release cohort.

## Data Retention & Redaction

- **PII Minimization:** Default denylist; allowlist only stable IDs and coarse geo (country). Strip content bodies, file names, query strings. Hash IPs (prefix-preserving) where required for fraud/anomaly only.
- **Retention:**
  - Activity events: 13 months (analytics), aggregated thereafter.
  - Audit events: 7 years (configurable per tenant/regulation) in WORM; hashed chain retained indefinitely for integrity proofs.
  - Logs: 30-90 days hot, 1 year cold with redacted fields; traces: 7-14 days (tail-sampled anomalies kept 90 days).
  - Metrics: 18-24 months with downsampling after 90 days.
- **Redaction Controls:** OpenTelemetry Collector processors and ingest pipelines enforce field-level scrubbing; CI checks block additions to disallowed keys. Secrets and payload blobs forbidden in logs/events.

## Incident Forensics Playbook (first checks)

1. **Service outage/5xx spike:** Check availability/error dashboards; correlate deploys; inspect trace exemplars with tail-sampled errors; validate upstream/downstream dependency health; confirm request_id propagation.
2. **Latency regression:** Inspect p99 panels; pull slowest traces; check DB/queue saturation and lock metrics; verify autoscaling events and GC pauses.
3. **Auth failures surge:** Review auth failure dashboard; confirm IdP reachability; check MFA/TOTP provider status; inspect audit events for role/permission changes and anomalous geo/ASN.
4. **Queue backlog/DLQ growth:** Inspect queue depth/lag; review worker saturation; examine DLQ payload metadata (without PII); trace job_id lineage; evaluate recent schema/contract changes.
5. **Data access anomaly:** Query audit ledger by tenant + actor + time window for sensitive actions; validate integrity chain; review policy decision logs (OPA) and correlate with trace_ids to confirm enforcement paths.

## Privacy-by-Design Controls

- Default sampling/logging policies exclude request/response bodies and free-text inputs.
- Strong schema validation with allowlists; metadata must be `safe_fields_only=true` and schema-validated.
- Tenant-tag validation to prevent cross-tenant leakage; high-cardinality fields capped with hash/pseudonymization.
- Access to audit ledger requires least-privilege roles; queries are logged as audit events themselves.

## SLOs & Alerting Principles

- Define SLIs for availability, latency, and error budget burn; alerts based on multi-window, multi-burn-rate to reduce noise.
- Pager alerts only for user-visible impact; informative alerts for trend detection routed to chat/issue tracker.
- Shadow/soak deploy monitors compare baseline vs. canary for latency/error budgets.

## Acceptance Alignment

- **Immutability:** Audit events stored append-only with hash chaining; corrections are compensating entries. Indexed for `tenant.id`, `actor.id`, and time ranges to satisfy forensic queries.
- **SLO-ready metrics:** Metrics and dashboards map to SLIs; alerting via burn-rate rules ensures low-noise detection.
- **Privacy defaults:** No sensitive payloads; redaction processors and allowlists enforce PII minimization at ingest.

## Forward-Leaning Enhancements

- **Differential privacy for product analytics cohorts** to preserve aggregate insights while minimizing re-identification risk.
- **Adaptive sampling** that auto-increases trace capture for high-risk tenants or workflows based on anomaly detectors.
- **Ledger anchoring** to public blockchains or transparency logs for high-assurance customers requiring external integrity proofs.
