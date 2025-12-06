# Trust & Proof Pack v0.1 backlog

A minimal, demo-safe release plan that delivers one governed security flow, one governed RevOps flow, and a slim FinOps path.
The goal is to ship v0.1 in ~60–90 days through four sprints, each with concrete definitions of done (DoD).

## Release contents (v0.1)
- **High-risk operations**: one operation type (e.g., temporary prod DB read for a tenant ≤2 hours) gated by policy preflight,
  dual approvals, adapter-instrumented execution, and time-bound auto-revert.
- **RevOps**: one inbound enterprise lead routed to a single team, single quote with large discount, approval chain, and contract
  activation stub.
- **FinOps**: minimal metering of policy decisions, workflow runs, and evidence storage; simple rating into one mock invoice for
  `summit-internal` and one design-partner tenant.
- **Tenants**: `summit-internal` exercised for real; `demo-external` seeded and fully drivable from Switchboard.
- **Evidence**: policy decisions, receipts, and bundle export APIs for high-risk ops and RevOps deals.
- **Dashboards**: High-Risk Ops (30-day stats, approvals, missing receipts), RevOps Governance (routing, approvals, latency),
  FinOps (usage + rated invoice).

## Sprint 1 (Weeks 1–2): Skeletons & golden paths
**Goal**: End-to-end happy paths for high-risk ops and RevOps with minimal policy, receipts, and Switchboard lists.

**High-Risk Ops v0.1**
- APIs: `POST /high-risk-ops/requests`, `/requests/:id/approve`, `/requests/:id/execute`.
- Operation: `TEMP_DB_READ_ACCESS`; simple state machine for request/approvals/execution.
- Policy: hard-coded Rego—engineers can request; approvals required: `team_lead` + `security_officer`; max duration 2 hours.
- Evidence: minimal `PolicyDecision` + `Receipt` persisted.
- DoD: request as `user-engineer`; approvals by `user-team-lead` and `user-security`; stub execution logged; visible list in
  Switchboard; export bare-bones evidence bundle JSON per request.

**RevOps v0.1**
- APIs: `POST /revops/leads`, `/revops/quotes`, `/revops/quotes/:id/submit-for-approval`, `/revops/quotes/:id/approve`,
  `/revops/quotes/:id/activate`.
- Flow: single tenant/segment (`enterprise`) routed to one team; lead → opp → quote.
- Policy: ≤20% discount self-approvable by AE; >20% requires manager + finance.
- Evidence: policy decision on discount approval; receipt on activation.
- DoD: POST lead auto-promotes to opp + assigned team; create 30% discount quote; submit and require manager + finance approvals;
  activate and record contract event; history visible in Switchboard list.

**Switchboard basics**
- Security workspace: list of high-risk requests with status.
- RevOps workspace: list of quotes with status and discount.

## Sprint 2 (Weeks 3–4): Policy, graph, evidence bundles
**Goal**: Governed, inspectable, exportable flows.

**Policy bundles & tests**
- Extract Rego modules: `policy/high_risk/operations.rego` and `policy/revops/discount_approvals.rego` with JSON input schemas.
- Add `*_test.rego` with 5–10 cases each; run via OPA in dev and CI (`opa test`).
- DoD: policies executed by OPA; CI fails on policy regressions; include sample “policy diff” for threshold changes.

**Graph modeling**
- Persist entities: `User`, `Team`, `Tenant`, `HighRiskOperationRequest`, `Approval`, `PolicyDecision`, `Receipt`, `Lead`,
  `Opportunity`, `Quote`, `ContractStub`.
- API: `GET /graph/entity/:id` returns neighbors.
- DoD: for a high-risk request ID, fetch neighborhood (users, approvals, decision, receipt); same for a quote; Switchboard right
  pane shows related objects/graph.

**Evidence bundle v0.1**
- APIs: `GET /evidence/high-risk-ops/:id`, `GET /evidence/revops/deals/:id`.
- Bundles: entity snapshots, related policy decisions, receipts, manifest with timestamps/IDs.
- DoD: endpoints return stable JSON sufficient to reconstruct the story.

## Sprint 3 (Weeks 5–6): Metering, billing, dashboards
**Goal**: Tie behavior to cost/price for 1–2 tenants.

**Metering**
- Emit `UsageEvent` for `policy_decision` (tenant_id, package) and `workflow_run` (high-risk op, RevOps).
- Pipeline: store events → nightly aggregate `MeterReadings` (`policy_decisions_per_day`, `workflow_runs_per_day` per tenant).
- DoD: daily counts visible for `summit-internal` (policy decisions + workflow runs).

**Pricing & rating v0.1**
- Plan `companyos-internal-demo`: base $0 for us; demo tenants charged base + per-1k policy decisions + per-1k workflow runs.
- Rating job: for each tenant/month, read `MeterReadings`, apply pricing, emit `RatedUsage` and JSON invoice.
- DoD: for `demo-external`, show breakdown “N policy decisions + M workflow runs → $AMOUNT” (mock invoice only).

**Dashboards v0.1**
- High-Risk Ops: requests last 30 days, executed, missing receipts.
- RevOps Governance: deals count, % needing approvals, avg approval time.
- FinOps: per-tenant usage (policy decisions, workflow runs) and rated usage ($) for `demo-external`.
- DoD: accessible from Switchboard; charts driven by live metrics (no mock JSON).

## Sprint 4 (Weeks 7–8+): Hardening & showtime
**Goal**: Demo-safe and investor-safe.

**Dogfooding**
- Eng/Sec use high-risk flow for 1–2 real prod access events.
- Founders/RevOps run at least one real deal through RevOps flow; backfill evidence as needed.

**Stability, SLOs, guardrails**
- Track p95 for policy decisions and workflow executions.
- Alerts for evidence write failures, missing receipts, metering lag.
- DoD: dashboard showing “Last 7 days: policy decisions p95 < 500ms, no missing receipts”; at least one tested alert rule.

**Pack definition & docs**
- SKU manifest with enabled workflows, dashboards, APIs, and policy bundles.
- Short docs (3–4 pages) covering contents, onboarding for internal/external tenants, and golden-path demo script.
- DoD: onboarding new tenant via Helm/Terraform + runbook; can flip on pack for `demo-external` and run end-to-end demo.

## Guardrails if time-constrained (60-day path)
- Preserve full golden paths; trim graph viz to related-object lists.
- Limit metering to policy decisions + workflow runs.
- Keep billing to single mock invoice view (no multi-tenant UI).
- Prioritize: high-risk ops evidence → RevOps approvals → minimal metering + invoice.
