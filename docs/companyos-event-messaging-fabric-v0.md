# CompanyOS Event & Messaging Fabric v0

## Purpose

Provide a paved road for asynchronous communication across services, features, and tenants using topics/streams, queues, and consumer groups that are reliable, observable, and governable by default.

## Event & Messaging Model

### Event Types

- **Domain events**: Immutable facts about business state changes (e.g., `billing.invoice.issued`).
- **Audit events**: Actor-intent trail for compliance (e.g., `auth.user.login_succeeded`).
- **Integration/webhook events**: Contracted payloads for partners/SaaS bridges with explicit delivery SLAs and replayable history.
- **System health events**: Platform observability signals (scaling, throttling, DLQ saturation, schema violations).

### Message Contract (paved-road fields)

Every message MUST include the following envelope fields; payload contracts are versioned separately:

- `event_id` (UUID v7) — unique, dedup-able key; also used for idempotency.
- `event_type` — namespaced type (`<domain>.<entity>.<action>`).
- `tenant_id` — required for multitenant isolation and billing; `null` only for global/system events.
- `occurred_at` — when the fact happened (producer clock, RFC 3339).
- `emitted_at` — when it was put on the bus.
- `source` — service or agent emitting the event.
- `schema_version` — semantic version of the payload contract registered in the schema catalog.
- `correlation_id` — ties a flow together (propagated across hops); `causation_id` optional for provenance chains.
- `partition_key` — stable key for ordering (often `tenant_id` or entity id) applied by SDKs.
- `ttl` (optional) — for messages where late arrival is meaningless.
- `payload` — schema-validated body; no PII unless encrypted fields are declared.

### Delivery Semantics

- **At-least-once (default)**: All domain/integration events; consumers must be idempotent (use `event_id` + state versioning). Reason: durability and replay matter more than dedupe cost.
- **Effectively-once**: Achieved via idempotent writes, dedup cache, and transactional outbox pattern at producers; used for payment state, ledger mutations, and cross-tenant governance signals.
- **At-most-once**: Only for low-value health signals where freshness beats completeness (e.g., ephemeral autoscale metrics) and where aggregation compensates for drops.

## Infrastructure Patterns

### Core Building Blocks

- **Topics/streams**: Durable append-only logs per domain with partitioning; minimum 7–30 day retention, longer for compliance domains.
- **Queues**: Per-consumer or per-tenant queues fed by topic subscriptions; support DLQ and retry policies.
- **Consumer groups**: Parallelize processing while preserving per-partition ordering; support pausing and lag alerts.

### Multitenancy Patterns

- **Partitioned shared topics (default)**: Shared topic per domain, partitioned by `tenant_id` to balance throughput; isolation enforced via ACLs and per-tenant quotas.
- **Per-tenant topics (sensitive/regulated)**: For regulated data or noisy tenants; higher isolation and custom retention; cross-tenant backpressure avoided.
- **Hybrid**: Shared control plane + per-tenant data plane for high-risk domains (e.g., audit, payments) with mirrored observability.

### Ordering, Partitioning, Replay

- **Partitioning keys**: `tenant_id` for tenancy isolation; entity IDs for strong ordering on aggregates; workflow IDs for long-running sagas.
- **Ordering**: Guaranteed within a partition. SDK enforces consistent hash on the chosen key; cross-partition ordering is unsupported and must be modeled via version numbers or orchestrators.
- **Replay strategy**: Time-bounded replay from offsets + snapshot exports. Consumers must handle reprocessing safely; DLQ replay is gated by feature flags and rate limits.
- **Retention tiers**: Hot (7–30 days), warm (object storage for 90–365 days), and cold (archive) with cataloged schema versions for historical rehydration.

## Developer Experience & Guardrails

### Publish/Subscribe Flow

- **SDKs/libraries**: Provide typed producers/consumers with auto-enrichment (correlation IDs, tenant, clocks), partition-key helpers, retry/backoff defaults, idempotency cache, and structured logging.
- **Configuration**: Declarative topic bindings (YAML/JSON) checked into repo; validated against the schema catalog in CI.
- **Local dev**: Docker compose profile with embedded broker, schema registry, and DLQ viewer; fixture generators for common events.

### Contract Registration & Evolution

- **Schema catalog**: Central registry (OpenAPI/JSON Schema/Avro) with lint rules and backwards-compatibility checks (no required-field removals, additive changes preferred).
- **Versioning**: Semantic version on envelope and payload. Producers must emit the latest minor; consumers must be forward-compatible within a major.
- **Governance hooks**: PR checks enforce schema registration, changelog entry, and data-classification tags (PII/PCI). Breaking changes require migration plan and dual-write/dual-read windows.

### Limits & Protections

- **Quotas**: Per-tenant and per-producer rate limits; circuit breakers that drop to at-most-once sampling for health noise during storms.
- **Fan-out controls**: Topic subscription caps and explicit allowlists; bulk fan-out requires approval and staged rollout via feature flags.
- **Poison message handling**: Max retry with exponential backoff → DLQ with reason codes and payload hashes; automated slack/page when DLQ rate crosses SLO.
- **Observability**: Per-topic lag dashboards, consumer success/error rates, and correlation-id tracing across hops.

## Artifacts

### "CompanyOS Event & Messaging Fabric v0" Outline

1. Principles & scope
2. Event taxonomy and naming conventions
3. Message envelope contract + schema governance
4. Delivery semantics and transactional outbox patterns
5. Infrastructure topology (topics, partitions, queues, consumer groups)
6. Multitenancy and data isolation
7. Ordering, replay, and retention tiers
8. Developer experience (SDKs, local stack, CI checks)
9. Guardrails (quotas, DLQ, PII handling)
10. Operations (runbooks, observability, incident response)

### Example Event Schemas

- **Billing** — `billing.invoice.issued` (domain)
  ```json
  {
    "event_id": "0194a5c1-3f24-7b7a-bc59-5f23d81f5b1a",
    "event_type": "billing.invoice.issued",
    "tenant_id": "tenant-123",
    "occurred_at": "2026-06-10T12:30:00Z",
    "emitted_at": "2026-06-10T12:30:01Z",
    "source": "billing-service",
    "schema_version": "1.2.0",
    "correlation_id": "flow-789",
    "partition_key": "tenant-123",
    "payload": {
      "invoice_id": "inv-456",
      "customer_id": "cust-001",
      "amount": 12500,
      "currency": "USD",
      "due_date": "2026-07-10",
      "line_items": 8
    }
  }
  ```
- **Identity** — `auth.user.login_succeeded` (audit)
  ```json
  {
    "event_id": "0194a5c1-3f25-7b7a-bc59-5f23d81f5b1a",
    "event_type": "auth.user.login_succeeded",
    "tenant_id": "tenant-123",
    "occurred_at": "2026-06-10T14:02:10Z",
    "emitted_at": "2026-06-10T14:02:10Z",
    "source": "authz-gateway",
    "schema_version": "1.0.1",
    "correlation_id": "req-456",
    "partition_key": "tenant-123",
    "payload": {
      "user_id": "user-42",
      "ip": "203.0.113.10",
      "mfa": true,
      "client_id": "web-portal",
      "device_fingerprint": "dfp-abc123"
    }
  }
  ```
- **Workflow Orchestration** — `workflow.instance.completed` (integration/webhook)
  ```json
  {
    "event_id": "0194a5c1-3f26-7b7a-bc59-5f23d81f5b1a",
    "event_type": "workflow.instance.completed",
    "tenant_id": "tenant-789",
    "occurred_at": "2026-06-10T15:45:00Z",
    "emitted_at": "2026-06-10T15:45:02Z",
    "source": "workflow-engine",
    "schema_version": "2.0.0",
    "correlation_id": "wf-12345",
    "partition_key": "workflow-12345",
    "payload": {
      "workflow_id": "workflow-12345",
      "status": "succeeded",
      "duration_ms": 9850,
      "outputs_uri": "s3://tenant-789/workflows/12345/outputs.json",
      "webhook": {
        "target": "https://hooks.partner.example/notify",
        "signature": "v1=abcde",
        "delivery_state": "pending"
      }
    }
  }
  ```

### Topic Layout Examples

- **Billing**
  - Topic: `billing.domain.v1` (partitioned by `tenant_id`; 30-day hot retention; DLQ: `billing.domain.v1.dlq`).
  - Consumer groups: `billing-ledger-writer`, `billing-emailer`, `revrec-sync`.
- **Identity/Audit**
  - Topic: `auth.audit.v1` (per-tenant or hybrid; 365-day warm retention; strict ACLs; DLQ: `auth.audit.v1.dlq`).
  - Consumer groups: `siem-forwarder`, `anomaly-detector`, `access-analytics`.
- **Workflow/Integrations**
  - Topic: `workflow.events.v1` (partition by workflow/tenant; 14-day hot + object storage archive; DLQ: `workflow.events.v1.dlq`).
  - Consumer groups: `webhook-dispatcher`, `orchestration-saga-runner`, `ops-lag-monitor`.

## Production-Readiness Checklist (publishers & consumers)

- [ ] Message schema registered with catalog; version bump reviewed; data classification tagged.
- [ ] Envelope fields populated (ids, timestamps, tenant, correlation_id, schema_version, partition_key).
- [ ] Producer uses transactional outbox or equivalent to avoid dual-write gaps.
- [ ] Consumer is idempotent (dedup on `event_id` + entity version) and handles replays.
- [ ] Partition key chosen for required ordering; backpressure behavior defined.
- [ ] Retries, backoff, and DLQ routing configured with alerting thresholds.
- [ ] Load/throughput SLOs defined; per-tenant quotas enforced; fan-out impact assessed.
- [ ] Observability: logs with correlation IDs, metrics (lag, error rate), traces emitted.
- [ ] Security: ACLs on topics/queues; secrets in vault; PII fields encrypted or minimized.
- [ ] Runbook documented for replay, DLQ drain, and webhook retries.
