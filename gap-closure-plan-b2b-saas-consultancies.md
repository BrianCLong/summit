# 90-Day Gap-Closure Plan (ICP: 50–500 Person B2B SaaS & Consultancies/Agencies)

## Objectives
- Close productization and packaging gaps identified in the current spec vs. market leaders.
- Deliver a thin, demonstrable vertical slice that proves provenance, policy, and cost controls while delivering operator-facing value.
- Enable repeatable deployments (internal, partner demo, hosted) with measurable ROI proof points.

## Guiding Principles
- Lead with operator-friendly surfaces while keeping an escape hatch for engineers.
- Ship batteries-included playbooks that create day-1 value; make extension easy via SDKs and connectors.
- Treat provenance, policy, and FinOps as visible features (receipts, dashboards), not just architecture.
- Prioritize one golden-path deployment and expand from there.

## Phase 0 (Weeks 0–2): Golden Path & Wedge Definition
- **Wedge**: “Provable AI OS for high-compliance B2B SaaS and agencies handling client data.”
- **Vertical Slice**: Incident/change management + approvals + cost anomaly mitigation running end-to-end with receipts.
- **Golden Environment**: One internal instance + one partner demo tenant with scripted data and integration stubs.
- **Decisions**:
  - Data-plane stance: BYO warehouse (Snowflake/BigQuery) with cached graph overlays; OLTP for workflow state; signed receipts for all cross-plane actions.
  - Pricing model draft: base platform fee + ingest units + query credits + playbook bundle add-ons.

## Phase 1 (Weeks 2–4): Operator Front Door & Trust Pack
- **Flow Studio (MVP)**: Drag-and-drop workflow builder with human-in-loop steps, policy guardrail toggles, and one-click publish-to-tenant that emits provenance receipts automatically.
- **Unified Copilot Shell**: Inbox/assistant that surfaces tasks, approvals, and insights per user; captures interaction signals into the ledger.
- **Trust Pack v1**: Public schemas + redacted receipt examples + “audit an agent action” walkthrough; security page with SOC2 timeline and shared controls.

## Phase 2 (Weeks 4–6): Batteries-Included Playbooks & Integrations
- **Playbook Catalog (v1)**: Onboarding, incident response, change/approval flows, DR drill, cost anomaly triage (internal); GTM pipeline hygiene and escalation triage (consultancies) with SLAs, metrics, and policy bundles.
- **Tier-1 Integrations**: Slack/Teams, Jira, GitHub/GitLab, Notion/Confluence, Google Workspace/Office 365 mail/calendars, Salesforce/HubSpot, GDrive/SharePoint/Box, Snowflake/BigQuery. Ship connector SDK with versioning, provenance receipts, and scoped secret handling.
- **Data-Plane Reference**: Playbooks documented for co-located vs. remote warehouse operation; caching/invalidations and latency budgets defined.

## Phase 3 (Weeks 6–8): Proof & Pricing Readiness
- **Internal Case Studies**: Before/after metrics for incident MTTR, approval latency, cost anomaly time-to-resolution, and GTM hygiene (per ICP). Publish 3–5 writeups with receipts and dashboards.
- **Unit-Economics Simulator**: Given tenant profile, forecast infra cost and propose price; overage rules codified for ingest, storage, query credits, and seats.
- **Hosted SaaS Hardening**: Multi-tenant isolation checks, purge manifests, selective disclosure paths verified; golden-path Terraform/Helm package finalized.

## Phase 4 (Weeks 8–10): Ecosystem & Self-Serve
- **Builder Program**: Developer portal, starter templates repo, “Build an internal agent in 60 minutes” tutorial, and community channel.
- **Marketplace Preview**: Connector + playbook versioning, telemetry, and policy-gated publishing for partner contributions.
- **Self-Service Trial**: Guided setup using Flow Studio + sample data; timeboxed pilot scripts for agencies to onboard client workspaces quickly.

## Phase 5 (Weeks 10–12): Launch & GTM Assets
- **Pricing Page & Bundles**: “Core” (ops + trust), “Growth” (GTM playbooks), “Agency” (multi-tenant client workspaces) with published “from” prices and overage schedule.
- **Sales/Enablement Kit**: Demo scripts for vertical slice, ROI calculator seeded from internal case studies, objection handling around data plane and compliance.
- **Post-Mortem Loop**: Weekly ROI reviews from pilots to refine credit sizing, connector SLAs, and default policies.

## Innovation & Forward-Leaning Enhancements
- **Policy-Aware Flow Studio**: Inline counterfactual policy simulation (show what would have been blocked/approved) and per-step cost/latency forecasts.
- **Receipt-Native Marketplace**: Every connector/playbook publishes signed provenance receipts; tenants can subscribe to “trust channels” for automated attestation ingestion.
- **Graph-Augmented Copilot**: Personalized retrieval across tenant graph + warehouse, with usage signals feeding adaptive guardrails and FinOps budgets.

## Success Metrics
- Time-to-first-value < 1 day via Flow Studio templates.
- ≥3 internal/partner case studies with ≥20% improvement in MTTR/approval latency/GTM hygiene metrics.
- ≥80% of pilot tenants using at least 5 Tier-1 connectors; ≥2 playbooks activated per tenant in week 1.
- Hosted SaaS p95 latency <1.5s for copilot interactions and <2s for Flow Studio publishes; p99 error <0.5%.
