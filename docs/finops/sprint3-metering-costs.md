# Sprint 3 FinOps & Billing Enablement

## Objective

Enable reliable per-tenant metering, cost attribution, and billing hooks for approvals, graph queries, and provenance writes so that Hosted and White-Label SKUs can report usage and estimated costs.

## Metering Event Contract (A1)

- **Required fields:** `event_id` (UUID), `tenant_id`, `feature`, `quantity`, `unit`, `timestamp`, `source_service`, `trace_id`.
- **Recommended fields:** `resource_id`, `flow_id`, `provenance_receipt_id`, `schema_version`, `dedupe_key`, `cost_hint` (estimated marginal cost), `metadata` (opaque map), `signature` (hashed payload for audit).
- **Features:** `approvals.request`, `approvals.decision`, `approvals.escalation`, `graph.query`, `provenance.write`.
- **Idempotency:** use `dedupe_key = tenant_id + feature + source_service + trace_id` (or upstream receipt ID) to drop duplicates.
- **Provenance:** include `provenance_receipt_id` pointing to ledger receipts; optionally embed `signature = sha256(canonical_payload)`.
- **Observability metrics:** `metering_events_emitted_total{feature,tenant}`, `metering_emit_errors_total{feature,tenant}`, `metering_event_size_bytes` histogram.

### Example Events

- See `examples/metering-event-approvals.json` and `examples/metering-event-provenance.json` for canonical payloads aligned to the schema.

## Usage Storage Model (B1)

Daily bucket schema for `usage_summaries` (warehouse or time-series table):

- `tenant_id`, `feature`, `period_start` (UTC day), `period_end`, `quantity`, `unit`, `last_event_timestamp`, `aggregation_version`, `ingest_watermark`.
- Retention: 13 months, with weekly compaction to reduce storage.
- API surface: `GET /usage?tenant_id=&from=&to=&feature=` returning daily rows; pagination by `(tenant_id, period_start)`.

## Aggregator Job (B2)

- **Input:** raw metering topic `metering.raw.v1`.
- **Windowing:** daily tumbling buckets with 2h lateness grace; re-runs idempotent via `(tenant_id, feature, period_start)` upserts.
- **Outputs:** `usage_summaries` table + lag metrics `aggregation_lag_seconds`, `aggregation_errors_total`, and a heartbeat `usage_aggregation_last_success_timestamp` gauge.
- **Runbook (stuck/failing):**
  1. Check consumer offsets vs. producer lag; alert if lag > 1h.
  2. Verify watermark advancement in metrics; restart job with `--reprocess-days=N` for backfill.
  3. Inspect DLQ (`metering.dlq`) for schema violations; patch offending producer or add transform rule.

## Cost Model v0 (C1)

- **Cost inputs (configurable YAML):** `cpu_per_ms_usd`, `db_read_per_k_usd`, `db_write_per_k_usd`, `storage_gb_month_usd`, `external_notary_per_call_usd`, `email_per_message_usd`.
- **Feature mappings:**
  - `approvals.request`: `cpu_ms * cpu_per_ms_usd + db_write_ops/1000 * db_write_per_k_usd + email_notifications * email_per_message_usd`.
  - `approvals.decision`: similar CPU + read/write mix, omit email if not sent.
  - `graph.query`: `(cpu_ms + db_read_ops)/1000` weighted by CPU and read unit costs; flag queries exceeding complexity threshold.
  - `provenance.write`: `bytes_written/1GB * storage_gb_month_usd` amortized plus write ops.
- **Accuracy target:** 80–90% vs. measured infra bills; tune coefficients monthly.

## Cost Attribution Engine (C2)

- **Inputs:** `usage_summaries` + cost config.
- **Process:** apply feature formula → write `cost_summaries(tenant_id, feature, period_start, period_end, quantity, unit, cost_usd, model_version)`.
- **API:** `GET /costs?tenant_id=&from=&to=` returning breakdown and totals; include `model_version` and `assumptions` block for transparency.
- **Evidence:** store `{period_start, tenant_id, feature}` lineage to metering events via `usage_event_ids[]` for audit.

## Pricing Model v0 (D1)

Configurable per-tier pricing (YAML or JSON loaded at runtime):

- **Internal:** base `$0`, soft caps for observability only.
- **White-Label:** base `$500/mo` includes `10k approvals`, `100 graph queries`, `10 GB provenance writes`; overages `$0.05` per approval, `$0.10` per graph query, `$0.20` per GB write.
- **Hosted SaaS:** base `$200/mo` includes `2k approvals`, `50 graph queries`, `5 GB writes`; overages `$0.10`, `$0.20`, `$0.30` respectively.
- Provide sample scenario calculations for 3 tenants to validate math before launch.

## Billing Export (D2)

- **API:** `GET /billing/statement?billing_period=2026-07&tenant_id=demo-tenant`.
- **Columns:** `tenant_id`, `billing_period`, `feature`, `quantity`, `unit`, `unit_price`, `line_amount_usd`, `taxes_adjustments_usd`, `model_version`, `pricing_tier`, `evidence_link` (URI to metering events/receipts).
- **Batch export:** nightly job writes CSV to `billing/statements/2026-07/tenant_id=.csv`; S3-compatible bucket with retention policy 18 months.

## FinOps Dashboard & Alerts (E1/E2)

- **Dashboard widgets:** top tenants by usage and cost; feature-level cost splits; margin view (revenue vs. cost) using pricing tier; trend lines for last 7/30/90 days; filters for tenant/tier.
- **Alerts:**
  - `tenant_daily_cost_spike`: triggers when daily cost > 2.5x 7-day median.
  - `platform_cost_drift`: total daily cost deviates >20% from forecast.
  - Synthetic alert test: replay fixture events to trip spike rule.
- **Runbook:** check recent deployments, compare usage vs. billing export, trace back to raw events using `trace_id` + `provenance_receipt_id`.

## Provenance & Audit (F1)

- Each billing line references `evidence_link` → API that returns underlying metering events and provenance receipts.
- Event signature: `signature = base64(sha256(canonical_payload))`, stored alongside `schema_version` for verification.
- Audit flow: `invoice line item → evidence_link → usage_summaries → raw metering events → provenance_receipts`.

## White-Label Packaging (F2)

- Partner-facing docs should include: how metering works, schema, pricing template examples (flat fee + usage, pure usage, seat-based), and sample API calls for usage/cost/billing exports.
- Config templates: provide default YAML stubs for partners to override pricing + cost coefficients without code changes.

## Next Steps & Enhancements

- Add streaming dedupe service keyed by `dedupe_key` to harden idempotency at ingress.
- Introduce anomaly detection via robust z-score on 1d/7d windows for early drift detection.
- Deploy Helm charts for `metering.raw` and `usage-aggregator` jobs with horizontal autoscaling based on lag metrics.
- Publish TypeScript types + JSON Schema for metering events to enable compile-time validation across services.
