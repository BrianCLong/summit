# Sprint 4 – Partner Console + FinOps v1 Execution Plan

## Goal
Deliver a partner-ready Switchboard experience that exposes tenant health, usage, and plan enforcement while wiring per-tenant metering into pricing/export flows for invoice-ready reporting.

## Scope Overview
- Partner Console v1: tenant catalog and tenant detail experiences gated to partner/admin roles.
- Metering & Aggregation v1: canonical metering events, aggregation pipeline, and attribution tables.
- Pricing & Plans v1: SKU/plan definitions with policy-based limit enforcement.
- Billing Readiness: exportable usage reports and unit economics dashboards.
- Safety & Ops: dual-control for destructive actions, evidence bundles, install packaging, and docs.

## Milestones & Phasing
1. **Week 1 – Foundations & Schemas**
   - Finalize metering event schema (ingest_unit, storage_gb_month, query_credit, seat) with idempotency keys.
   - Land plan/SKU config and provenance hooks; add policy stubs for soft/hard limits.
   - Instrument tenant catalog queries for metrics/traces; add synthetic access control test harness.
2. **Week 2 – Partner Console UX & Aggregation**
   - Build tenant catalog with filters (plan, status, region, high-risk) and tri-pane tenant detail shell.
   - Implement aggregation job producing `tenant_usage` (tenant_id, period, metric, quantity, cost_estimate) with late-arrival handling.
   - Wire quick actions with policy checks (`can_change_plan`, `can_suspend_tenant`, `can_impersonate`).
3. **Week 3 – Billing Exports & Controls**
   - Add CSV/JSON export API/UI for per-tenant/period usage with signed evidence hashes.
   - Enforce plan limits for at least one metric (e.g., approvals/day) with surfaced banner/incident.
   - Dual-control flows for suspend/delete with approval requests and rollback path exercised.
4. **Week 4 – Hardening & Fundability Artifacts**
   - Validation/backfill jobs, DLQ/runbook for aggregation, provenance on plan/feature changes.
   - Dashboards for revenue proxy, COGS/user, margin by tenant/tier; sample exports in CI/demo seed.
   - Performance targets: tenant list p95 < 1.0s; daily aggregation <10 min for target tenant scale.

## Architecture Outline
- **Metering Events**: protobuf/JSON schema stored under version control; emitted with tenant_id, unit, quantity, source_service, idempotency_key; traces/metrics on emit.
- **Aggregation Service/Job**: consumes bus, buckets events daily/hourly, handles late arrivals within configurable window; writes `tenant_usage` with cost estimation and provenance record; DLQ with runbook.
- **Plan & SKU Model**: config-driven definitions for Internal/Pro/Enterprise including included usage, overage pricing, feature gates; versioned changes with audit trail.
- **Policy Enforcement**: OPA packages for soft (80%) and hard limits; surfaces breaches via banners/incidents and emits metrics.
- **Partner Console**: role-gated section showing tenant catalog + tri-pane detail (profile, timeline, graph) with quick actions bound to policy checks; queries emit metrics/traces.
- **Billing Exports**: API + UI to download monthly per-tenant usage (units, cost, plan vs overage) with signed hash and evidence bundle; runbook for invoicing.
- **Unit Economics Dashboard**: Grafana/Switchboard views linking usage → cost estimate → margin; tagged for fundability demos.

## Deliverables & Acceptance Hooks
- Partner Console accessible only to partner/admin roles; synthetic tests ensure no cross-tenant leaks.
- Tenant detail shows last 30 days of usage, incidents, MTTR, approvals; quick actions enforced by policies with evidence bundles.
- Metering in staging/prod-like env for ≥3 unit types; event generators tested in at least two services.
- Aggregation validation within 1–2% against sampled recomputation; backfill job available.
- Plan changes are versioned/auditable; policy tests cover threshold behaviors and breach metrics.
- Billing exports signed/logged; sample exports produced in CI/demo seed; dashboards display top/bottom tenants by margin.

## Workstreams & Owners
- **Partner Console UX**: build catalog/detail, filters, tri-pane shell, quick actions, access control, telemetry.
- **Metering & Attribution**: schemas, event emitters, aggregation job, DLQ, backfill, validation harness.
- **Pricing & Policies**: SKU/plan config, plan assignment flows, OPA packages for limits, evidence on changes.
- **Billing & Unit Economics**: export API/UI, signed evidence, dashboards, cost model documentation.
- **Safety & Packaging**: dual-control suspend/delete, chaos test bypass attempts, install manifests, SBOM/signing, runbooks.

## Risks & Mitigations
- **Data accuracy (<95%)**: introduce idempotency keys, late-arrival buffers, validation recompute, DLQ with alarms.
- **Performance regressions**: cache tenant catalog filters, paginate, async load heavy panels; size aggregation batches and parallelize per-tenant.
- **Policy gaps**: default deny for partner actions; policy unit tests; provenance on plan/status changes.
- **Billing integrity**: evidence bundles with hashes; signed exports; audit logs for generation requests.
- **Operational errors**: dual-control for destructive actions; DR drill/rollback playbook; monitoring on aggregation lag and policy breaches.

## Metrics & Observability
- Tenant list p95 latency, filter cache hit rate, partner console authorization denials.
- Metering emit rate, dedupe counts, DLQ size, aggregation lag, validation mismatch %, backfill duration.
- Plan limit breach counts (soft/hard), overage events, policy decision latencies.
- Export generation counts, signature verification failures, dashboard freshness.
- Revenue proxy, COGS proxies, gross margin by tier/tenant; top/bottom 5 tenants by margin.

## Testing & Evidence Plan
- Unit tests for catalog table, filters, and policy guards; Playwright synthetic access control checks.
- Jest/OPA policy tests for `can_change_plan`, `can_suspend_tenant`, limit thresholds.
- Integration tests for metering emitters (at least two services) and aggregation correctness within tolerance.
- Backfill/DLQ runbook validation; chaos test for suspend/delete bypass; signed export verification.
- CI artifacts: sample billing export, cost model assumptions doc, screenshots of dashboards/console.

## Innovation Notes
- Consider a **usage reconciliation service** that periodically compares aggregated usage to raw event samples, auto-opening incidents when deviation exceeds SLO.
- Explore **per-tenant cost guardrails** that dynamically adjust soft-limit thresholds based on margin trends and anomaly detection.
- Prototype a **partner-embeddable mini console** (read-only) powered by signed, time-limited URLs for secure external sharing.
