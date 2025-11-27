# Trust & Proof Pack

A productized bundle that proves Summit operates with governed, auditable evidence—and lets customers receive the same guarantees. It combines features, artifacts, and demos so buyers and investors can verify how Summit runs and how they can adopt the same controls.

## Purpose and audiences

| Audience | Questions it answers | Proof points |
| --- | --- | --- |
| Enterprise buyer (CISO/CIO/COO) | Can I trust you with data and processes? How are agents/workflows audited? What happens when something breaks? | Governance dashboards, high-risk operations evidence bundles, disaster-recovery drill reports, policy simulation + audit exports. |
| CFO / FinOps / Procurement | Is pricing predictable and reconcilable? Can invoices map to usage? Do you understand COGS/margins? | Billing & FinOps dashboards, usage → rating → invoice evidence bundles, unit economics reports. |
| Investor / Board | Is this a real, governable platform that scales with discipline? Can we trust TAM/ARPU/margin claims? | Summit-as-tenant dashboards, redacted RevOps and high-risk evidence from internal usage, SBOM/SLSA/DR artifacts. |

## Pack contents (SKU definition)

### 1) Governance & provenance bundle

- All critical flows (RevOps, high-risk ops, billing) emit `PolicyDecision` nodes, receipts, and evidence bundles.
- Example bundles:
  - **High-Risk Ops:** requests, approvals, policy decisions, execution logs, revert events.
  - **RevOps Deal:** lead → deal → quote → approvals → contract → activation.
  - **Billing & COGS:** usage, rating, invoices, cost attribution, cost model changes.
- All evidence is exportable via API and Switchboard UI.

### 2) Governance dashboards (Switchboard)

Prebuilt, drill-through dashboards where every chart links to underlying evidence:

1. **Security / High-Risk Ops:** volume and types, approval latency/coverage, "ops without receipts" (should be zero).
2. **RevOps Governance:** lead routing SLA, discount/approval behavior, deals with policy exceptions.
3. **FinOps & Billing:** revenue and COGS per tenant/pack, margin by SKU, credits/write-offs and reasons.

### 3) Policy bundles (ready to adopt)

- High-Risk Ops: request/approve/execute rules.
- RevOps: lead routing, discount approvals, contract activation.
- Billing: price-plan changes, invoice actions, credits, cost-model changes.
- Includes simulation harnesses, tests, and reference `RevOpsConfig` / `SecurityConfig` / `BillingConfig` examples.

### 4) Supply chain & DR artifacts

- SBOMs for core components.
- SLSA/attestation metadata for builds (where supported).
- DR drill evidence: runbook, last drill receipts, achieved RPO/RTO.
- All delivered as exportable JSON/YAML bundles instead of slideware.

### 5) Operational assurances

- **Data retention & immutability:** receipts and evidence stored with tamper-evident hashes and configurable retention by tier.
- **Notarization hooks:** optional external timestamp/notary for high-risk or financial bundles.
- **Reviewability:** every bundle ships with audit-ready JSON plus human-readable PDF summaries for procurement/legal.

## Demo flow (15–30 minutes)

1. **We run Summit on this:** open Switchboard for the Summit Internal tenant; show high-risk ops, RevOps, and FinOps dashboards. Reinforce that policies and evidence shown are the same engine customers receive.
2. **Pull a real incident/high-risk op:** walk through request → approvals → execution → revert, including policy decisions and downloadable evidence bundle. Message: we provide receipts, not promises.
3. **Pull a real deal:** show lead → account → quote → approvals → contract → activation → billing lines. Export the RevOps evidence bundle to prove replayability.
4. **Billing/economics view:** display revenue & COGS per pack, drill into tenant usage/rating/invoice, and export the Billing Evidence Bundle. Message: economics claims are machine-verifiable.

## Customer enablement (what they get at activation)

1. **Feature flags turned on:** High-Risk Ops pack, RevOps pack, Billing/FinOps dashboards, evidence export APIs.
2. **Policy & config templates:** starter policies for high-risk ops, approvals, billing actions; reference configs for segments, thresholds, and approval chains.
3. **Runbooks & docs:** onboarding guides for Security and RevOps, invoice validation with evidence, and CompanyOS DR drill runbooks.
4. **Evidence-level SLAs (higher tiers):** retention for receipts/evidence, export SLAs, optional external notary for receipts.
5. **Adoption checkpoints:** 30/60/90-day validation that policies are enforced, evidence exports succeed, and DR drills meet RPO/RTO targets.

## Evidence bundle anatomy (for sales + implementation)

- **Header:** bundle type, time window, tenant, originating pack version, schema version.
- **Policy decisions:** who/what/why; input facts; policy version; simulation result when applicable.
- **Receipts & signatures:** execution receipts, revert receipts, optional notarization reference.
- **Event ledger:** ordered steps with actor, intent, inputs, outputs, and links to artifacts (contracts, invoices, deployment logs).
- **Replay manifest:** instructions to reproduce/verify (e.g., re-run policy simulation, recompute invoice from rated usage).

## Success metrics for GTM and delivery

- **Trust signals:** 0 unaudited high-risk ops per month; 100% bundles exportable within SLA; DR drills hitting target RPO/RTO.
- **Economic clarity:** 100% invoices reconcilable to rated usage; margin by SKU visible for every active tenant; discount policy exceptions tracked to closure.
- **Adoption:** % tenants with policy bundles enabled; % tenants running quarterly DR drills; export/API usage by customers and auditors.

## Activation playbook (internal readiness)

1. **Define SKU v0.1:** enumerate feature flags, bundle schemas, and SLAs in the SKU manifest.
2. **Dogfood coverage check:** for the Summit tenant, mark completed vs. missing dashboards, bundles, and policies; create owners for gaps.
3. **Demo script + fixtures:** maintain a stable dataset (redacted where needed) with at least one live example for each bundle type.
4. **Runbook library:** publish onboarding guides for Security, RevOps, Billing/FinOps, and DR drills; include escalation contacts.
5. **Evidence pipeline monitors:** alerts for missing receipts, failed exports, or policy evaluation errors; weekly report in Switchboard.
6. **Procurement packet:** PDF/JSON bundle that includes SBOM/SLSA artifacts, DR drill receipts, and a sample invoice reconciliation.

## Competitive positioning

- Competitors ship features; Trust & Proof ships **proof** across high-risk ops, revenue workflows, billing, supply chain, and DR in one auditable model.
- Policy-controlled economics ensure price, discount, and cost-model changes are governed and provable.
- Internal dogfooding provides live demos and redacted evidence bundles as credibility.

## Next steps for Summit

- Define **Trust & Proof Pack v0.1** in the SKU manifest.
- For the Summit tenant, mark what exists vs. in-progress/missing across dashboards, policies, and evidence exports.
- Create a reusable demo script and stable internal environment for sales/investor calls.
