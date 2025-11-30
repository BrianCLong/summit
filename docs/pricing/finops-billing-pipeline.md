# FinOps & Billing Pipeline Blueprint

This document captures the shape of the FinOps and Billing pipeline for CompanyOS, focusing on how we meter usage, attribute cost, apply pricing, and expose revenue/margin across tenants and packs.

## Objectives
- Meter behavior across CompanyOS core and packs (RevOps, High-Risk Ops, others) with neutral usage events.
- Attribute COGS per tenant, feature, and pack with defensible provenance.
- Rate usage against SKUs/tiers and produce invoice-ready rated usage.
- Expose revenue, cost, and margin in tenant + pack dashboards, with receipts for all money-impacting actions.
- Provide reconciliation, backfill, and auditability hooks so finance, RevOps, and SRE share a single source of truth.

## Core entities
- **Tenant**: billing and cost attribution anchor; includes `summit-internal`.
- **UsageEvent**: canonical, append-only events emitted by services and connectors.
- **Meter**: logical aggregations over UsageEvents (per tenant, pack, env) for billing and analytics.
- **PricePlan**: SKU/tier definitions per meter (free tiers, unit prices, discounts/commits).
- **RatedUsage**: `(tenant, meter, period)` × price with provenance (plan version, meter readings).
- **Invoice**: aggregation of RatedUsage plus adjustments/taxes per billing period.
- **CostAttribution**: COGS allocations per tenant, pack, and capability.

## Reference architecture
```
[Instrumentation] -> [Metering Bus] -> [Ingest/Normalize] -> [UsageEvent store]
                                    \-> [Warehouse/OLAP] -> [Meter compute]
[Meters + Cost data] -> [Rating] -> [RatedUsage] -> [Invoice + Receipts]
                 \-> [Dashboards: Tenant P&L, Pack GM, Ops overlays]
```
- **Storage contracts**: UsageEvents are immutable; corrections happen via compensating events and backfills, not edits.
- **Idempotency**: UsageEvent `id` is unique; MeterReadings store `(tenant, meter, period, sequence)` to avoid double-counting.
- **Time alignment**: Billing periods (UTC) align with warehouse partitions to simplify re-runs.

## Usage event pipeline
### Instrumentation
- Emit structured events from API, workflow engine, policy engine, evidence ledger, connectors.
- Required fields: `id`, `tenant_id`, timestamp, `category` (revops, high_risk_ops, companyos_core, etc.), `type` (policy_decision, workflow_run, evidence_written, api_call, etc.), `quantity`, `metadata` (feature/pack, env, actor type).
- Evidence for external costs: `external_api_call` events capture 3rd-party usage and SKU/cost hints.

### Ingestion and normalization
- Metering service consumes the bus, validates schema, and routes invalids to DLQ.
- Enrich events with tenant plan/SKU, pack/feature mapping, and environment.
- Persist normalized UsageEvents to an append-only log (e.g., Kafka) and warehouse table.
- Maintain a **reconciliation feed** that counts accepted vs. rejected events per tenant/day; alerts on drift.

### Meter computation
- Hourly batch + near-real-time updates for dashboards.
- For each Meter spec, group events by tenant/time window and aggregate quantity.
- Write `MeterReading` rows keyed by tenant, meter, period, pack/environment dimensions, plus source UsageEvent ids for traceability.
- Backfill jobs can re-materialize readings for a time range using deterministic Meter definitions.

#### Example meter specs
| Meter | Window | Selector | Aggregation |
| --- | --- | --- | --- |
| `meter:policy_decisions` | 1h | `type = policy_decision` | `sum(quantity)` |
| `meter:evidence_gb_month` | 1d (rolled to month) | `type = evidence_written` | `sum(bytes)/1e9 normalized to GB-month` |
| `revops.active_seats` | 1d (distinct in month) | `category = revops AND actor_type = user` | `count_distinct(actor_id)` |
| `high_risk_ops.executions` | 1h | `category = high_risk_ops AND type = operation_executed` | `sum(quantity)` |

## Billing meters by pack
### High-Risk Ops Pack
- `high_risk_ops.requests`: requests created.
- `high_risk_ops.executions`: operations executed successfully.
- `high_risk_ops.evidence_gb_month`: storage footprint for evidence.
- Value (non-billed) metric: `high_risk_ops.manual_effort_saved_hours`.

### RevOps Pack
- `revops.active_seats`: distinct active users per month.
- `revops.leads_routed`: leads processed by routing policies.
- `revops.deals_processed`: quotes/opps with approval flows.
- `revops.policy_decisions`: policy decisions executed in RevOps.

### CompanyOS Core
- `companyos.graph_queries`
- `companyos.workflow_runs`
- `companyos.evidence_gb_month`
- `companyos.switchboard_active_users`

## Cost attribution (COGS)
### Infra cost ingestion
- Pull provider statements (compute, storage, DB, queue, notary, etc.).
- Map raw costs to internal resource identifiers (cluster, service, namespace tags).

### Resource → tenant/pack allocation
- Direct cost: tenant-scoped resources tagged with `tenant_id`.
- Shared cost: allocate using usage signals (CPU/requests, DB I/O, queue messages) by tenant.
- Produce `CostAttribution` rows: tenant, capability/pack, resource type, cost amount, period.

### Per-pack COGS and margin
- Sum `CostAttribution` by tenant and pack.
- Join with rated revenue per tenant/pack to compute gross margin and unit costs (e.g., cost per policy decision, per lead routed).
- Maintain **variance reports**: COGS per meter vs. target unit economics, highlighting regressions.

## Pricing and rating
### SKUs and plans
- Separate SKUs for Internal Edition (transfer pricing for `summit-internal`), White-Label, and Hosted SaaS tiers (Pro/Enterprise, residency add-ons, optional packs).
- PricePlan per meter: free tier allowances, unit price, billing interval, discounts/commits/fair-use caps.
- Versioned price plans with effective_from/effective_to to support historical re-rating and credits.

### Rating workflow
1. For each billing cycle and tenant, load PricePlan and MeterReadings.
2. Apply inclusions (free tiers), tiering, discounts/commits; generate line-level adjustments for credits/overages.
3. Emit `RatedUsage` with provenance (plan version + source meter readings).
4. Persist **rating receipts** referencing input readings, applied discounts, and the policy decision authorizing the plan.

## Invoicing
- Aggregate RatedUsage per tenant/period with base fees, pack line items, taxes/VAT by region.
- Export invoices to finance stack (Stripe/Chargebee/Netsuite) while retaining links to the same tenant/usage/cost graph.
- Generate pseudo-invoices for `summit-internal` to expose transfer pricing and BU-level charges.
- Support **rebill/re-run**: store invoice version + lock-rated-usage snapshot; adjustments are separate credit/debit memos with receipts.

## Receipts, governance, and provenance
- Every price change, discount/credit, invoice, or adjustment yields a `Receipt` linked to a `PolicyDecision`.
- Billing-related policy bundle controls who can change price plans, apply credits, or adjust invoices; all actions are auditable in Switchboard.
- Maintain an Economics Evidence Bundle (pricing versions, cost methodology, sample invoices, backing usage/cost data, policy decisions) for audits/investors.
- Add **data quality monitors**: missing tenant tags, zero-quantity events, anomalous surges, and orphaned costs (no tenant mapping).

## Dashboards
### Tenant P&L
- Revenue by base platform and packs, COGS by compute/storage/3rd-party, gross margin.
- For `summit-internal`, revenue shows transfer pricing; COGS stays actual.
- Include trend lines, forecast vs. actual, and alerts for negative margin or commit burn-down risk.

### Pack profitability
- Revenue and COGS by pack, gross margin %, and unit costs (cost per policy decision, per lead routed, per high-risk op).
- Highlights pricing/efficiency opportunities.
- Show infra drivers: top costly services/resources for the pack and tenant distribution.

### Operational overlays
- SLO breach/credit exposure, 3rd-party API overages, and per-region cost differences for residency.
- Reconciliation widgets: events seen vs. rated vs. invoiced; cost allocated vs. unallocated.

## End state
- Telemetry → UsageEvents → MeterReadings → RatedUsage → Invoice/receipts with parallel COGS attribution.
- Dashboards reflect the same source-of-truth graph, enabling confident pricing, margin tracking, and self-billing for Summit on CompanyOS.
- Provenance-first design ensures every dollar of revenue or cost is explainable, replayable, and governable.
