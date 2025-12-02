# RevOps Flagship Workflow Pack (Lead → Opportunity → Close → Cash)

## Purpose
This pack is the single external-facing showcase for CompanyOS + Switchboard + Policy + Provenance + FinOps. It is optimized to be white-labeled per tenant, enforce RevOps guardrails, and emit durable evidence that survives audits and pricing reviews.

## Capabilities in Scope (v1)
1. **Lead & Account Routing**
   - Ingestion from marketing forms, product signals, partners, and CSV uploads.
   - Policy preflight for spam/allow/block + enrichment hints.
   - Routing via territory/segment/round-robin/capacity rules with SLA hints and conflict detection.
   - Evidence: routing PolicyDecision + Receipt snapshots, account link criteria, conflicts resolved.
2. **Discount & Deal Approvals (Deal Desk)**
   - Quote evaluation against discount/ARR/term thresholds and non-standard terms flags.
   - Automatic approval chains (sales manager, finance, legal) with counter-propose/approve/reject.
   - Evidence: policy trace, approvals, revision history bundled for Deal Evidence.
3. **Quote → Signature → Cash Orchestration**
   - Contract generation via CPQ/CLM adapter once quote approved.
   - E-signature tracking and contract activation policy checks.
   - Provisioning + billing activation gatekept by signed contract + approvals; CSM handoff with routing.

## Canonical Entities & Relationships
- Entities: Tenant, RevOpsConfig, User, Team, Account, Lead, Opportunity, Quote, Product/SKU, Contract, Order/Subscription/Invoice, Approval, RevWorkflow, PolicyDecision, Receipt, EvidenceBundle, System (connectors).
- Key edges: Lead BELONGS_TO Tenant; Lead ROUTED_TO User/Team; Account OWNED_BY User/Team; Opportunity ASSOCIATED_TO Account; Opportunity HAS_QUOTE Quote; Quote CONTAINS Product and NEEDS_APPROVAL Approval; Approval DECIDED_BY User; Quote RESULTS_IN Contract CREATES Order/Subscription; PolicyDecision APPLIES_TO Lead/Quote/Opportunity; Receipt EVIDENCES RevWorkflow steps.

## Implementation Blueprint (v1)
- **Triggering surfaces**
  - Webhooks/ingest adapters for marketing forms, product signals, and partner handoffs write to `Lead` and enqueue a policy check job.
  - Quote lifecycle events originate in CRM/CPQ; `SUBMIT_QUOTE` triggers policy + approval flow creation; `QUOTE_APPROVED` triggers contract orchestration.
- **Systems + connectors**
  - CRM (Salesforce/HubSpot) connector for lead/opportunity sync, owner updates, and account lookups.
  - CPQ/CLM connector for quote read/write and contract generation; E-sign connector for envelope status; Billing connector (Stripe/Chargebee/Netsuite) for order/subscription; Product provisioning connector for tenant activation.
- **Workflow runners**
  - Switchboard (orchestration) pipelines:
    - `lead_routing_pipeline`: ingest → policy preflight → routing policy → owner assignment → evidence emission → queue surfacing.
    - `deal_desk_pipeline`: quote submit → policy evaluation → approval graph creation → Switchboard inbox for approvers → evidence bundle assembly → contract orchestration handoff.
    - `activation_pipeline`: contract status change → policy validation → billing/provisioning execution → onboarding handoff → evidence aggregation.
- **Storage + ledger**
  - Graph: entities/relationships above with `Receipt` nodes attached to every workflow transition.
  - Evidence ledger: immutable receipt storage plus EvidenceBundle indices for Deal, Discount Policy, and Attribution bundles.
- **SLA controls**
  - Routing SLA timers set per segment/region; auto-escalate to team lead if not touched before deadline; SLA violations emitted as receipts for dashboards.

## Workflow Specifications
### 1) Lead & Account Routing
1. Ingest adapters normalize lead payloads with source/UTM/geo/segment/company size/email domain.
2. Preflight policy: action `CREATE_LEAD` with subject + lead attributes → allow/deny, enrichment requirements, route hints.
3. Routing policy: territory/segment/round-robin/account-owner-follows/capacity-based → assignee/team + SLA (e.g., time-to-first-touch) + conflict flags.
4. Assignment: update Lead.owner_id/routed_at; surface queue in Switchboard (e.g., "New MQLs for SDR Team West"); emit PolicyDecision + Receipt with attribute snapshot + policy trace.
5. Account/Opportunity linking: domain/firmographic matching to Account, optional Opportunity creation; evidence notes link criteria and conflict outcomes.

### 2) Discount & Terms Approvals
1. Trigger: Quote saved or progressed to `pending_approval` with list price, discount %, term length, non-standard terms flag, segment.
2. Policy evaluation: action `SUBMIT_QUOTE` with user role/segment permissions + quote/account attributes → allow/deny + required approval chain + thresholds (per segment/role) + flags (legal required, strategic deal).
3. Workflow creation: create Approval nodes (e.g., SALES_MANAGER_APPROVAL, FINANCE_APPROVAL, LEGAL_APPROVAL); set Quote.status `pending_approval`; emit PolicyDecision + Receipt.
4. Switchboard Deal Desk: approvers see quote summary, discount vs threshold, segment/risk, non-standard terms; actions approve/reject/counter_propose recorded as evidence.
5. Finalization: once mandatory approvals completed → Quote.status `approved`; aggregate evidence bundle (policy decisions, approvals, revisions) → triggers contract generation + provisioning pre-checks.

### 3) Quote → Signature → Cash
1. Contract generation: on Quote `approved`, call CLM/CPQ adapter to draft contract with correct template/line items; emit Receipt `GENERATE_CONTRACT` with quote snapshot.
2. E-signature: track Contract.status `sent` → `viewed` → `signed`; evidence emitted on each transition.
3. Contract policy check: validate signers, jurisdiction/terms, presence of required approvals; block activation and route to Deal Desk if failed.
4. Provisioning & billing: create Order/Subscription via billing adapter and product provisioning only after contract passes; enforce "no provisioning without signed contract" and "no invoice without payment terms".
5. CSM handoff: create Onboarding entity linked to Account/Contract/Subscription; assign CSM using routing policy; compile onboarding evidence bundle.

## Policy Bundle (OPA/ABAC)
- Modules: `lead_routing.rego`, `discount_approvals.rego`, `contract_activation.rego`, `segment_definitions.rego`, `tenant_overrides.rego`.
- Each module ships with attribute catalog, decision schema, examples, and tests.
- Attribute highlights:
  - Lead: country, state, company_size, industry, segment, utm_campaign.
  - Account: owner_id, customer_status, region.
  - User: role (sdr/ae/partner_manager/finance/legal), territories, capacity.
  - Quote: segment, list_price_total, discount_percentage, term_length_months, has_non_standard_terms, product_mix.
  - TenantConfig: routing strategy, territory map, capacity thresholds, discount thresholds per segment/role, approval requirements, term/liability limits.
- Example logic: existing customer → account owner/CSM; enterprise NA → named AE team; SMB → round robin available SDRs; AE can self-approve SMB discounts ≤20%, manager above 20%, finance above 30% or ARR threshold; enterprise non-standard terms → legal required.

### Decision schemas (OPA outputs)
- `lead_routing.rego` → `{ "allow": bool, "assignee": user_id/team_id?, "route_strategy": "territory"|"segment"|"round_robin"|"account_owner_follows"|"capacity", "sla_minutes": int?, "conflicts": [reason], "required_enrichment": [attr] }`.
- `discount_approvals.rego` → `{ "allow": bool, "max_allowed_discount": number, "required_approvals": ["SALES_MANAGER"|"FINANCE"|"LEGAL"|"VP_SALES"], "flags": { "legal_required": bool, "strategic": bool }, "rationale": string }`.
- `contract_activation.rego` → `{ "allow": bool, "blocking_issues": [string], "required_receipts": [receipt_type], "allowed_jurisdictions": [country_code?] }`.
- All policy calls must include the evaluated attributes and decision payload in the associated `Receipt` for traceability.

## Evidence & Dashboards
- Evidence Bundles:
  - **Deal Evidence Bundle**: leads/accounts touched, routing decisions, quote versions/approvals, contract signatures, activation/provisioning events.
  - **Discount Policy Bundle**: discount distribution vs thresholds, exceptions/rationales, approver decisions.
  - **Revenue Attribution Bundle**: lead sources and campaigns to closed-won revenue with traceable path.
- Dashboards (Switchboard/Observability):
  - Pipeline Governance: % leads routed within SLA, % quotes requiring approval by reason, time-to-approve by segment/approver, discount bands vs win rate.
  - Revenue Control: deals with policy exceptions, missing/late approvals, activation failures due to policy.
  - Exec Snapshot: ARR/TCV by segment & discount band, approver bottlenecks, shadow revenue risk (provisioned before approvals).

## Multi-Tenant & White-Labeling
- **RevOpsConfig entity/file per tenant** defining segments, regions, routing strategy, discount thresholds, approval chains, connected systems (Salesforce/HubSpot, DocuSign, billing, product provisioning). Policies consume attributes from this config rather than hard-coded rules.
- **Theming/localization**: Switchboard honors tenant brand (colors/logo/labels) while reusing shared flows.
- **Packaging**: Helm/Terraform `revops-pack` module installs policies, workflows, dashboards, connectors, and seed data. Profiles: `revops_default_profile`, `revops_smb_profile`, `revops_enterprise_profile`. Inputs cover thresholds/approvals, connector credentials, feature flags (advanced flows on/off).
- **Retention controls**: evidence retention and compaction are configurable per tenant/tier.

### Sample RevOpsConfig inputs (per tenant)
```yaml
segments:
  - name: smb
    arr_max: 50000
  - name: enterprise
    arr_min: 250000
routing:
  default_strategy: territory
  territories:
    na_west: ["US-CA", "US-OR", "US-WA"]
  round_robin_pools:
    sdr_global: ["user:sdr-1", "user:sdr-2"]
discounts:
  smb:
    ae_self_approve_pct: 0.2
    manager_required_pct: 0.2
    finance_required_pct: 0.3
  enterprise:
    ae_self_approve_pct: 0.1
    finance_required_pct: 0.3
    legal_required_for_non_standard: true
approvals:
  high_arr_threshold: 250000
  approval_chains:
    default: ["SALES_MANAGER"]
    over_high_arr: ["SALES_MANAGER", "FINANCE"]
    non_standard_terms: ["LEGAL"]
connectors:
  crm: salesforce
  esign: docusign
  billing: stripe
```

### Evidence shape for receipts
- Each `Receipt` records: `id`, `workflow_step` (`ROUTE_LEAD`, `EVALUATE_QUOTE`, `GENERATE_CONTRACT`, `ACTIVATE_ORDER`), `subject` (user/system), `resource_ref` (entity + version), `policy_decision` payload, `timestamp`, `sha256` content hash, and `previous_receipt_id` for chain-of-custody.
- Evidence bundles index receipts by `opportunity_id` + `quote_id` to support dispute resolution and audit exports.

## Tests
- Acceptance (examples): `lead_routing_existing_customer_goes_to_account_owner`, `lead_routing_enterprise_uk_goes_to_enterprise_team_eu`, `quote_discount_25_percent_smb_requires_manager_approval`, `enterprise_contract_with_nonstandard_liability_requires_legal`, `no_provisioning_without_signed_contract_receipt`.
- Policy table tests: segment × discount band × term length × product mix × risk level combinations, surfaced in policy simulation UI for RevOps what-if analysis.
- Integration tests: fake CRM/CPQ/CLM/e-sign/billing + policy/workflow/ledger stack covering lead ingest → routing → opportunity, quote → approvals → contract → activation, and failure modes (missing approval, billing error, policy denial at activation).

## Changelog Notes for v0.1
- Feature: RevOps Pack v0.1 (Lead Routing, Discount Approvals, Deal Desk).
- Perf: p95 latency added on quote save due to policy + workflow creation; extra graph load for routing/evidence assembly.
- Cost: increased evidence/metric volume proportional to lead/quote volume; mitigated via configurable retention/compaction.
- Security/Governance: blocks side-door discounting and provisioning; exports evidence bundles for CFO/RevOps/Legal.
