# FinOps & Billing Pipeline Shape

This document outlines the neutral data model, meters, pricing surfaces, and evidence flows required to convert CompanyOS and pack usage into revenue, margin, and auditable billing artifacts.

## Goals
- Meter every tenant (including `summit-internal`) across CompanyOS core and add-on packs.
- Attribute infrastructure and third-party costs precisely per tenant, pack, and feature.
- Apply SKU/tier pricing to produce revenue, margin, and invoice-ready rated usage.
- Emit receipts and provenance for all money-affecting actions.

## Core entities
- **Tenant**: Billing party; includes `summit-internal` for showback.
- **UsageEvent**: Canonical, append-only telemetry emitted by workflows, services, and connectors. Includes `id`, `tenant_id`, `time`, `category` (e.g., `revops`, `high_risk_ops`, `companyos_core`), `type` (e.g., `policy_decision`, `workflow_run`), `quantity`, and `metadata` (feature/pack/env/actor).
- **Meter**: Logical counters rolled up from UsageEvents, scoped by aggregation window, dimensions (tenant/env/feature/pack), and a formula.
- **PricePlan**: Per SKU/tier meter pricing (free tier, unit price, interval), with discounts, commits, and caps.
- **RatedUsage**: `(tenant, meter, period)` with quantity, price, and amount after rating.
- **Invoice**: Aggregates RatedUsage plus base fees, adjustments, and tax for a billing period.
- **CostAttribution**: COGS rows per tenant/pack/capability/resource type/period.

## Event pipeline (behavior → UsageEvent)
1. **Instrumentation**: API, workflow engine, policy engine, evidence ledger, and connectors emit structured events to the metering bus, always tagging `tenant_id` and feature/pack context. Key event types: `policy_decision`, `workflow_run` (start/end), `evidence_write/compact`, and `external_api_call` for third-party visibility.
2. **Ingestion & normalization**: Metering service validates schema, routes invalids to a DLQ, enriches with tenant plan/SKU, pack/feature mapping, and environment, then writes canonical UsageEvents to an append-only stream (e.g., Kafka) plus warehouse/OLAP storage.
3. **Meter computation**: Hourly batch plus near-real-time rollups compute `MeterReading` per meter spec by grouping events (tenant + window) and applying formulas (e.g., sum `policy_decision` events; convert evidence bytes to GB-months).

## Pack meters
- **High-Risk Ops Pack**: `high_risk_ops.requests`, `high_risk_ops.executions`, `high_risk_ops.evidence_gb_month`; optional value metric `high_risk_ops.manual_effort_saved_hours` (not billed).
- **RevOps Pack**: `revops.active_seats`, `revops.leads_routed`, `revops.deals_processed`, `revops.policy_decisions` (primary billing signals: seats + deals/leads, while tracking all).
- **CompanyOS Core**: `companyos.graph_queries`, `companyos.workflow_runs`, `companyos.evidence_gb_month`, `companyos.switchboard_active_users` underpin base SKUs.

## Cost attribution (COGS)
1. **Infra cost ingestion**: Import provider statements (compute, storage, DB, queue, notary, etc.) mapped to internal resource IDs.
2. **Resource → tenant attribution**:
   - Direct: tenant-scoped resources carry `tenant_id` tags.
   - Shared: allocate via per-tenant usage signals (CPU/requests, DB I/O, queue messages).
3. **Per-pack COGS**: Because UsageEvents carry `pack`, aggregate cost by tenant and pack to derive `COGS_per_tenant_per_pack` and compare against revenue for margin.

## Pricing & rating
1. **SKUs & plans**: Internal Edition (showback/transfer pricing), White-Label Edition (base + per-tenant + optional packs), Hosted SaaS tiers (Pro/Enterprise with thresholds, data residency add-ons).
2. **Rating flow (per billing cycle)**:
   - Fetch tenant PricePlan and MeterReadings.
   - Apply free tiers, tiered pricing, discounts/commits/fair-use caps.
   - Emit RatedUsage with provenance (meter, readings, price plan version).
3. **Invoicing**: Generate Invoice rows per tenant/period with base fees and itemized RatedUsage; export to finance stack (Stripe/Chargebee/Netsuite). For `summit-internal`, produce pseudo-invoices for showback.

## Dashboards & economics
- **Tenant P&L**: Revenue split by base platform and packs; COGS split by compute/storage/third-party; gross margin. For `summit-internal`, revenue is internal but COGS remains.
- **Pack profitability**: Revenue and COGS per pack; gross margin %; unit metrics (e.g., cost per policy decision or lead routed) to guide pricing and optimization.
- **SRE/Sec/RevOps overlays**: Show SLO breach credits/penalties, third-party API overages, and regional cost deltas.

## Governance, receipts, and evidence
- Billing treated as a high-risk domain: policy bundles govern price changes, credits/discounts, and invoice adjustments.
- Every invoice/price change/credit emits a **Receipt** linked to the governing PolicyDecision and is visible in Switchboard Audit → Billing.
- Exportable **Economics Evidence Bundles** include cost attribution methodology, pricing plans and changes, sample invoices with backing usage/cost data, and the related policy decisions.

## Near-term nexts
- Wire Switchboard dashboards for tenant P&L and pack profitability using MeterReadings, RatedUsage, and CostAttribution.
- Stand up internal edition showback with pseudo-invoices for `summit-internal` to baseline unit economics.
- Finalize billing policy bundle (approvers, change receipts) and align evidence bundle format for audits/investors.
