# Architecture & Delivery Plan v0 (90 Days)

## North Star
- Run a critical internal workflow (high-risk ops & approvals) fully on CompanyOS + Switchboard.
- Include provenance receipts, OPA/ABAC policies, SLO dashboards, golden-path deployment, and demo-ready playbooks for high-compliance B2B SaaS.

## Guardrails
- No feature is done without tests, policies, dashboards/alerts, docs/runbooks, and provenance receipts.
- Prefer thin vertical slices over broad partials.
- Each track must output Switchboard-demoable artifacts.

## Workstreams

### Track A – Internal Vertical Slice (High-Risk Ops & Approvals)
**Owner:** Eng Lead; **Co-owners:** Security Lead, RevOps/BizOps
- Entities: Person, Role, System, ChangeRequest, Approval, Incident.
- Workflow: submit change request → policy decision (OPA) → multi-step approvals → execution hook → receipt emission.
- Switchboard: approvals inbox, change timeline, graph slice per change.
- Milestones: 
  - Days 0–30: data model/APIs, workflow endpoints, draft OPA policies, simple Switchboard views.
  - Days 31–60: mandatory internal usage; SLOs (p95 latency, p99 errors, throughput); receipts queryable.
  - Days 61–90: polished UX; incident/change postmortem view; runbook for production change approvals.
- Stage gates: Spec Ready → Build Complete → Provenance Complete → Operate Ready → Package Ready.

### Track B – Flow Studio v0.1
**Owner:** Design Lead; **Co-owner:** Eng Lead
- Canvas with steps: Trigger, Call Tool/API, Policy Check, Human Approval, Notify, Write to Graph, Emit Receipt.
- Inspector with editable parameters and guardrail templates; simulate run with policy dry-run.
- Milestones:
  - Days 0–30: UX flows and components; read-only workflow view.
  - Days 31–60: edit parameters; add/remove steps; simulation calling policy engine.
  - Days 61–90: versioning (draft/published); publish with changelog & receipt.
- Stage gates mirror Track A with provenance for publishes.

### Track C – Playbook Catalog v0
**Owner:** CPO; **Co-owners:** Eng Lead, RevOps/BizOps
- Minimum playbooks: High-Risk Change Approval; Data Export/Deletion; Incident Intake/Resolution; Customer Data Access Request; Large Deal Approval.
- Milestones:
  - Days 0–30: define entities, approvals, policies, success metrics per playbook.
  - Days 31–60: implement in Flow Studio; sample data/tenants; base dashboards (time-to-approve, volume, SLO).
  - Days 61–90: docs on problems solved, customization, metrics/outcomes.

### Track D – Integrations Tier 1
**Owner:** Eng Lead; **Co-owner:** Infra Lead
- Integrations: Slack, Identity (OIDC/OAuth2, SCIM-lite), Ticketing (Jira/Linear), Docs (GDrive/Notion), DB/warehouse.
- Milestones:
  - Days 0–30: connector framework with secrets, health checks, logging/metrics.
  - Days 31–60: implement Slack/Identity/Ticketing; end-to-end flow Switchboard → Slack approval → receipt.
  - Days 61–90: docs/examples; BYO connector example.

### Track E – Trust Pack & Compliance Motion
**Owner:** Security Lead; **Co-owner:** CTO
- Scope: evidence/receipt schemas; purge/delete manifest; audit trails for high-risk change and data deletion; compliance roadmap.
- Milestones:
  - Days 0–30: finalize schemas; implement receipts for Track A.
  - Days 31–60: selective disclosure/redaction; Audit Trail view in Switchboard.
  - Days 61–90: Trust Pack v1 with narrative, screenshots, schema snippets, SOC2/ISO mapping.

### Track F – Pricing, Telemetry & Unit Economics
**Owner:** CPO; **Co-owner:** Infra Lead
- Scope: usage metering (events, runs, storage, LLM), FinOps dashboards, pricing skeleton (internal/hosted/white-label).
- Milestones:
  - Days 0–30: metering instrumentation on key services; rough cost allocation.
  - Days 31–60: per-tenant cost dashboards; what-if calculator.
  - Days 61–90: pricing tiers and usage bands; feed Fundability Pack.

### Track G – Developer Surface & Ecosystem Seed
**Owner:** Eng Lead; **Co-owner:** CPO
- Scope: OAS3 spec v0.1; TypeScript SDK (auth, graph entities, workflows); example apps (CLI/service to create change requests, receipt listener).
- Milestones:
  - Days 0–30: stabilize core API contracts; generate OAS and TS types.
  - Days 31–60: TS SDK with examples; README-level docs.
  - Days 61–90: 60-minute internal agent tutorial; part of partner/demo onboarding.

## Timeline (Stacked)
- **0–30 days: Shape & Instrument** — model high-risk slice; stand up basic workflows/views; design Flow Studio; build connector framework; define playbooks; finalize evidence schema; start metering.
- **31–60 days: Dogfood & Close Loop** — all high-risk changes flow through CompanyOS; Flow Studio edits/simulates workflows; 3–5 Tier-1 integrations; receipts and trust views live; cost dashboards and pricing draft.
- **61–90 days: Package & Demo** — golden-path deployment; playbook catalog ships; Trust Pack v1 and Fundability pack updated; developer SDK/tutorial ready for design partners.

## Operating Rhythm & Evidence
- Weekly Switchboard demo: run high-risk change → approvals → receipt/audit → metrics & SLO dashboard.
- Bi-weekly architecture review: confirm receipts, policy gates, and observability.
- Changelog per feature: summary; impact on SLOs, security/provenance, cost/tenant; links to PRs, policies, dashboards, docs.
