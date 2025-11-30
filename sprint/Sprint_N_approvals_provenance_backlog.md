# Sprint N – Approvals & Provenance Slice (Jira/Linear Backlog)

**Duration:** 2 weeks  
**Sprint Goal:** Ship production-ready end-to-end "Grant Elevated Access" workflow with OPA/ABAC gating, signed provenance receipts, Switchboard visibility, observability, and white-label packaging.

## How to Use
- Copy each issue row into Jira/Linear. IDs are suggested and can be adapted to your project key.  
- "Type" is aligned to Jira issue types (Epic/Story/Task).  
- Acceptance criteria are explicit and should be pasted verbatim.  
- Definition of Done (DoD) checklist applies to every Story/Task unless noted: updated spec, policy diffs (if touched), tests (unit + integration; happy path + 1 failure), evidence/receipt coverage on state changes, metrics/logs/traces, runbook/doc snippet, packaging updates if needed, changelog entry with perf/cost impact.

## Backlog

### Epic 1 – Approval & Policy Engine for High-Risk Ops
- **E1-APPR: Approval & Policy Engine** (Type: Epic) — anchor for approval service + policy integration.
  - **S1-API: Approval Service API** (Type: Story) — Define and implement OAS3 for `POST /approvals`, `GET /approvals/:id`, `POST /approvals/:id/decision` with persistence.  
    **Acceptance Criteria:**
    1. OpenAPI spec merged covering endpoints, request/response models, and error shapes.  
    2. Core handlers unit-tested with ≥80% coverage; include one failure-path test per handler.  
    3. `POST /approvals` and `POST /approvals/:id/decision` p95 latency <200ms in dev test; structured logs and traces emitted on errors.  
    4. Persistence layer (e.g., Postgres/graph) stores approval lifecycle; status transitions validated.  
  - **S2-OPA: OPA/ABAC Integration for `grant_elevated_access`** (Type: Story) — Attribute model (user, tenant, role, risk tier, jurisdiction, environment) enforced via OPA.  
    **Acceptance Criteria:**
    1. Policy bundle in repo with automated tests/simulation cases.  
    2. 100% of `grant_elevated_access` requests and decisions invoke OPA; correlation IDs logged for decisions.  
    3. OPA determines approval requirement, requester eligibility, and approver eligibility; responses cached safely (no stale decisions).  
    4. Policy simulation harness available (CLI/test suite) with sample scenarios.  
  - **S3-SIM: Policy Simulation CLI/API** (Type: Story) — Side-effect-free simulation tool.  
    **Acceptance Criteria:**
    1. CLI command or `/policy/simulate` endpoint returns decision for supplied attributes.  
    2. Included in runbook for debugging; example scenarios checked in.  
    3. Covered by automated test (happy path + invalid input).

### Epic 2 – Provenance Ledger & Evidence/Receipt Schema
- **E2-PROV: Provenance & Receipts** (Type: Epic) — evidence bundles, receipts, ledger writes.
  - **S4-SCHEMA: Evidence & Receipt Schemas** (Type: Story) — JSON schema + explainer.  
    **Acceptance Criteria:**
    1. JSON Schemas for `EvidenceBundle` and `Receipt` committed with versioning/backward-compatibility notes.  
    2. Markdown explainer documenting fields: input attributes, policy bundle version, decision, actors, timestamps, signatures, hashes, redaction metadata.  
    3. Sample bundle/receipt checked in for auditors/partners.  
  - **S5-LEDGER: Provenance Ledger Write Path** (Type: Story) — `ProvenanceService.recordEvidence` with append-only storage.  
    **Acceptance Criteria:**
    1. Called for every approval decision; failures make the operation fail (configurable) and log errors.  
    2. Append-only table/log enforces immutability guarantees (logical or physical).  
    3. Unit + integration tests cover success and failure paths.  
  - **S6-NOTARY: Notary Adapter Stub** (Type: Story) — interface + no-op dev notary.  
    **Acceptance Criteria:**
    1. Notary adapter interface documented; feature flag toggles real vs. stub.  
    2. Logs include notary reference/hash even when stubbed.  
    3. Unit test validates stub path and flagging.  
  - **S7-EXPORT: Evidence Export API** (Type: Story) — `GET /receipts/:id` endpoint.  
    **Acceptance Criteria:**
    1. Authenticated requests only; returns receipt plus handle to evidence respecting redaction controls.  
    2. End-to-end test: approval → decision → receipt retrieval.  
    3. Error responses are structured/logged/traced.

### Epic 3 – Switchboard UI: Approvals & Rationale Center v1
- **E3-UI: Switchboard Approvals UX** (Type: Epic) — list/detail/decision experience.
  - **S8-LIST: Approvals List View** (Type: Story) — Table of pending approvals with filters/search/pagination.  
    **Acceptance Criteria:**
    1. Integrated with approvals API; shows operation, requester, tenant, age, risk.  
    2. Filters: status, tenant, risk tier; includes loading and error states.  
    3. Pagination/search functional; UI test covers list load + filter.  
  - **S9-DETAIL: Approval Detail & Decision Drawer** (Type: Story) — Rich context + approve/reject with rationale.  
    **Acceptance Criteria:**
    1. Displays who/what/why + policy attributes; includes simulated policy outcome view.  
    2. Approve/Reject blocked without rationale for high-risk ops.  
    3. Decision updates backend, triggers provenance, and refreshes UI status; UI test for approve and reject.  
  - **S10-TIMELINE: Timeline Integration** (Type: Story) — timeline entries linking to receipts.  
    **Acceptance Criteria:**
    1. Timeline shows `grant_elevated_access` events for at least one test tenant/user; click opens detail with receipt info.  
    2. Works in demo/staging; includes linkability to receipts.  
  - **S11-THEME: White-Label Theming Hooks** (Type: Story) — ensure module honors theme tokens.  
    **Acceptance Criteria:**
    1. Validated in at least two theme variants (e.g., Summit default + Partner demo).  
    2. Doc snippet for White-Label Kit on rebranding the approvals module.  
    3. Visual regression or snapshot coverage for themes (where applicable).

### Epic 4 – Observability, SLOs, and FinOps Hooks
- **E4-OBS: Observability & SLOs** (Type: Epic) — metrics, tracing, SLOs, FinOps tagging.
  - **S12-METRICS: Metrics & Tracing** (Type: Story) — spans across request → OPA → ledger → notary stub.  
    **Acceptance Criteria:**
    1. Metrics for count/latency/success-error on approvals and decisions; Grafana (or equivalent) dashboard with p95 latency, error rate, throughput.  
    2. Traces show complete path for at least one sampled request; trace IDs logged.  
    3. Synthetic span/assertion in tests to validate instrumentation hooks.  
  - **S13-SLO: SLO Definition & Alerts** (Type: Story) — p95 <1.5s, p99 error rate <0.5%.  
    **Acceptance Criteria:**
    1. SLO dashboard + alerting rules committed; error budget policy documented.  
    2. Synthetic check hitting approvals endpoint in staging; alert tested (or dry-run).  
    3. Runbook entry for responding to SLO burn.  
  - **S14-FINOPS: FinOps Tagging** (Type: Story) — usage tags for tenants/approvers.  
    **Acceptance Criteria:**
    1. Metrics tagged per tenant and per approver action; wiring into metering pipeline (even partial).  
    2. Basic per-tenant approvals usage report producible (manual or automated).  
    3. Cost-impact note added to changelog/runbook.

### Epic 5 – Packaging, Runbooks, and Compliance Artifacts
- **E5-PACK: Packaging & Compliance** (Type: Epic) — deployment + documentation.
  - **S15-HELM: Helm/Terraform Updates** (Type: Story) — add services/env/secrets/flags for approvals+provenance stack.  
    **Acceptance Criteria:**
    1. `helm install`/`terraform apply` can bring up working stack in fresh environment.  
    2. Feature flags/env vars documented; secrets managed appropriately.  
    3. Deployment tested in staging (or sandbox) with proof in notes.  
  - **S16-RUNBOOK: Runbook – Grant Elevated Access Flow** (Type: Story) — operational guide.  
    **Acceptance Criteria:**
    1. Documents preconditions, trigger steps, expected behavior, debugging (policy simulate, failure triage), how to read receipts.  
    2. Linked from Switchboard and repo docs; used in sprint demo.  
    3. Updated if simulation tooling or APIs change.  
  - **S17-THREAT: Security & Threat Model Update** (Type: Story) — elevation/policy bypass/evidence tampering focus.  
    **Acceptance Criteria:**
    1. Threat model updated in repo with at least two implemented mitigations referenced in PRs.  
    2. Least-privilege IAM for services; dual-control for destructive policy changes documented.  
    3. Security review checklist completed.  
  - **S18-EVIDENCE: Evidence Bundle Sample & Compliance Notes** (Type: Story) — auditor-ready sample.  
    **Acceptance Criteria:**
    1. Sample evidence bundle + receipt JSON checked in; aligns with Trust & Proof Pack.  
    2. Short note mapping flow to SOC2/ISO-style controls.  
    3. Cross-referenced from compliance docs.

## Stage Gates (Sprint Exit Criteria)
1. **Spec Ready:** OAS3 for approvals/evidence/receipts; OPA policy spec + attribute catalog documented.  
2. **Build Complete:** Core APIs implemented with tests green; UI integrated with backend in staging.  
3. **Provenance Complete:** Evidence/receipts emitted for every approval decision; receipts retrievable via API and visible in Switchboard.  
4. **Operate Ready:** SLO dashboards + alerts live; runbook and policy simulation tools usable by oncall.  
5. **Package Ready:** Helm/Terraform updated; white-label theming hooks and doc snippet complete; sample evidence included in Trust & Proof Pack.

## Innovation / Stretch (Optional but Recommended)
- **STR1-CACHE:** Add policy decision memoization with bounded TTL + attribute-aware cache keys to reduce OPA latency while preserving freshness guarantees.  
- **STR2-C2PA:** Prototype pluggable C2PA signing for receipts to align with emerging content provenance standards.
