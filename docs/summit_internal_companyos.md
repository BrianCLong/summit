# Summit as Tenant Zero

This plan wires Summit itself into CompanyOS so we prove we run the business on the platform we sell. Tenant `summit-internal` uses the same packs, workflows, policies, and dashboards as any external customer, with operational guardrails and measurable success criteria so the plan is executable (not just aspirational).

## Tenant and Pack Configuration
- **Tenant:** `summit-internal` (first-class, no bypass paths).
- **Packs enabled:**
  - **High-Risk Ops Pack (Security/Infra):** dual-control, preflight checks, execution receipts.
  - **RevOps Pack:** lead intake/routing, discount & terms governance, deal desk orchestration.
  - **FinOps Pack:** cost attribution, unit economics, and plan-aware metering.
  - **Optional HR/People Pack:** activated as needs emerge.
- **Policy posture:** default deny for destructive operations; policy bundles attached per pack with evidence logging turned on by default.
- **Operational setup checklist:**
  - Create `summit-internal` tenant with production SSO and scoped admin roles (no super-admin bypasses).
  - Enable connectors with least privilege (CRM, billing, ticketing, CI/CD, cloud accounts) and record connector-scoped secrets in the evidence ledger.
  - Seed baseline policy bundles per pack and register the expected receipt schema so dashboards have consistent dimensions from day one.
  - Define data retention windows per artifact type (evidence bundle, audit log, receipts) and enforce auto-expiry with purge manifests.

## Dogfooding the Flagship Packs
### High-Risk Ops at Summit
- **Scope of high-risk actions:** temporary prod data access, key/secret rotation for major tenants, policy bundle edits in production, destructive migrations, DR drills, purge/redaction runs.
- **Workflow requirements:** every action flows through request → policy preflight → approvals → execution → evidence receipts.
- **Controls:**
  - Dual-control for policy changes and destructive operations with approver separation (requester ≠ executor).
  - Required evidence bundles for DR drills, incident response, and purge requests (must include approvals, command transcripts, and artifact hashes).
  - Automatic rollback hooks for failed execution steps with receipt emission (rollback success/fail recorded).
- **Acceptance signals:**
  - 100% of high-risk requests have a receipt and evidence bundle before closure.
  - Approval latency p95 < 30 minutes during business hours; breaches page SecOps and log to governance dashboard.
  - Side-door attempts trigger a policy violation event and are visible in dashboards within 5 minutes.
- **Outcome:** live reference workflows we can demo; ability to surface receipts and evidence bundles from real incidents.

### RevOps at Summit
- **Lead sources:** website forms, intro emails, partner referrals; all ingested as `revops.leads_ingested_total` with source attribution and spam/duplicate flags.
- **Routing:** segment-aware routing to founder sales, early AEs, or partner managers using routing policies keyed on ICP fit, ARR band, and region; routing receipts must include assignee, timestamp, and policy version.
- **Discounts & terms:**
  - All special terms/design partners flow through discount + approval policy with receipts (include list price, final price, discount reason, and approver role).
  - Contract → activation orchestration uses the same RevOps pack wiring as customers; activation emits onboarding SLA timers and violation events.
- **Acceptance signals:**
  - 100% of routed leads carry a routing receipt; dropped/parked leads must emit a disposition event.
  - Discount approvals include rationale taxonomy (e.g., design partner, competitive, uplift) to enable margin analysis.
  - Lead routing SLA p95 < 15 minutes for hot leads; SLA breaches generate alerts and are visible on the “Summit as a customer” dashboard.
- **Outcome:** Summit’s own pipeline runs on CompanyOS; dashboards answer “How do you manage discount creep?” with live internal data.

## Telemetry and Unit Economics
### Metering primitives (per tenant/flow/feature/plan)
- **Events:** `high_risk_ops.requests_total`, `revops.leads_ingested_total`, `revops.quotes_submitted_total`, `policy.decisions_total{bundle,tenant,package}`; add `workflow.executions_total` with `status`, `pack`, and `runner` dimensions.
- **Resources:** CPU/time per decision, storage per evidence bundle/log, network/egress by connector (CRM, billing, etc.).
- **Tags:** `tenant_id`, `flow_type` (revops, secops, finops, etc.), `feature` (high_risk_ops_pack, revops_pack), `plan` (internal, Pro, Enterprise, white-label), `policy_version`, and `sla_tier`.
- **Data hygiene:** enforce schema validation on ingest; reject/park events missing tenant_id or policy_version; maintain source-of-truth mapping for tenant → plan → enabled packs.

### Cost attribution
- **Unit costs tracked:** CPU-seconds, storage GB-months, outbound API calls, notary/attestation calls, queue/DB/cache usage; capture cloud SKU/pricing version for auditability.
- **Derived metrics:**
  - **COGS per tenant:** infra + services (+ optional support).
  - **COGS per capability/pack:** monthly cost per tenant/seat/opportunity.
  - **COGS per SLA tier:** map p95/p99 SLO targets to incremental infra cost to price premium tiers credibly.
- **Benchmark:** `summit-internal` is the baseline—cost per month and per pack is computed and reviewed to tune pricing/margins; publish monthly FinOps memo with deltas, top cost drivers, and planned optimizations.

## Leadership Dashboards (“Summit as a customer”)
### Operational SLOs
- p95 latency for policy decisions, workflow executions, and Switchboard key interactions.
- Error rate by flow (revops, high_risk_ops, evidence ledger).
- Targets: p95 < 1.5s on our internal graph; p99 error rate < 0.5% for critical flows.
- **Instrumentation:** publish SLI definitions (query + threshold) and store them alongside the policy version that controls each flow to prove governance and performance are tied.

### Governance & Security Posture
- High-Risk Ops dashboard: counts by type (prod access, key rotation, policy changes), approval latency, % with complete receipts/evidence.
- Policy coverage: % of internal flows gated by OPA/ABAC; side-door attempts (blocked or not) with alerts.
- **Drill-readiness:** show DR drill cadence, last run date, RPO/RTO achieved vs target, and evidence bundle completeness.

### Revenue & Discount Control (Internal RevOps)
- Lead routing SLAs and breach alerts.
- Discount usage vs thresholds with exception rationales.
- Approval latency vs close rate; evidence-backed deal desk trail.
- **Pipeline hygiene:** conversion by source, SLA compliance by segment, and aging buckets for routed-but-unworked leads.

### Unit Economics & Pricing Inputs (FinOps)
- COGS per tenant and per pack; margin per SKU (Internal Edition, White-Label Edition, Hosted tiers).
- Sensitivity analysis: impact of including/excluding High-Risk Ops pack on base SKU margin; storage optimization scenarios.
- **Pricing inputs:** map COGS + SLA tier + attestation frequency into a proposed SKU table that can be sanity-checked monthly using `summit-internal` data.

## Trust & Proof Artifacts
- **SBOM + SLSA attestations** for every build we deploy to `summit-internal`; attach policy version, build pipeline ID, and signer identity to each attestation.
- **Purge manifests** for internal data wipes/redactions; receipts must include scope, data classes affected, and validation of tombstones or redaction markers.
- **DR drill reports** from real drills with RPO/RTO metrics, step-by-step evidence, and restore validation receipts.
- Bundle redacted artifacts (DR report, governance dashboard views, selected incident/deal evidence) as the investor-facing “Trust & Proof” packet showing we run on CompanyOS.
- **Cadence & freshness:**
  - SBOM/attestation per release; publish digest to evidence ledger.
  - Purge manifests logged weekly (even if noop) to prove enforcement.
  - DR drills at least quarterly; show last-run age on dashboard and block GA claims if stale.

## Next Layer Down
- Expand FinOps/Billing pipeline: events → meter → aggregate → invoice hooks, aligned with the packs above so pricing and TCO conversations are backed by first-party usage data.
- Ship minimal dashboards + alerts with the packs: each pack must render its own SLA, coverage, and cost panels by default when enabled for `summit-internal` (dogfood-first delivery).
- Document runbooks for the three exemplar workflows (policy change, destructive migration, design-partner discount) including approval matrix, evidence expectations, and rollback/playback steps.
