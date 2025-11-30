# COS Approval & Provenance Sprint – Jira/Linear Tickets

These tickets are grouped by epic and include suggested types, labels, and acceptance criteria. Replace the `COS-XXXX` identifiers with your project issue keys when importing into Jira or Linear.

## Epic 1 – Approval & Policy Engine for High-Risk Ops (`COS-1000`)
**Goal:** Backend approvals + policy service for `grant_elevated_access`.

### `COS-1001` – Approval Service API (create, fetch, decide)
- **Type:** Story  
- **Labels:** backend, api, approvals, companyos  
- **Description:** Implement Approval Service with APIs to create approval requests for high-risk operations, fetch approval details, and submit approval decisions for `grant_elevated_access` and future high-risk flows.  
- **Scope:**
  - Define OAS3 spec for `POST /approvals`, `GET /approvals/:id`, `POST /approvals/:id/decision`.
  - Persist approvals in Postgres/graph store with clear schema.
- **Acceptance Criteria:**
  - OAS3 spec checked in and passing API contract validation.
  - `POST /approvals` creates a new approval with status `PENDING`.
  - `GET /approvals/:id` returns full approval record (operation, requester, target, attributes).
  - `POST /approvals/:id/decision` sets outcome (`APPROVED`/`REJECTED`), records actor and rationale.
  - Unit tests ≥ 80% coverage on handlers (happy + error paths).
  - p95 latency for create and decision endpoints < 200ms in dev perf test.
  - Structured logs include correlation IDs and status transitions.

### `COS-1002` – OPA/ABAC Integration for `grant_elevated_access`
- **Type:** Story  
- **Labels:** backend, security, opa, abac  
- **Description:** Integrate OPA/ABAC for `grant_elevated_access`; OPA decides if the operation requires approval, who can request it, and who can approve it based on attributes.  
- **Scope:**
  - Model attributes: user, tenant, role, environment, jurisdiction, risk tier.
  - Author OPA policies for allow/deny, whether approval is required, and request/approver eligibility.
  - Wire OPA calls into approval creation and decision handlers.
- **Acceptance Criteria:**
  - Policy bundle for `grant_elevated_access` exists in repo with tests.
  - 100% of create/decision flows call OPA and use its result.
  - Policy decisions (allow/deny + reason) logged with correlation IDs.
  - Policy tests cover: allowed + requires approval; denied (insufficient attributes); approved with restricted approvers.
  - Configuration allows swapping policy bundle version without code changes.

### `COS-1003` – Policy Simulation CLI / API
- **Type:** Story  
- **Labels:** devex, opa, tooling  
- **Description:** Provide CLI or `/policy/simulate` endpoint so engineers/operators can see OPA decisions for a given `grant_elevated_access` scenario without creating real approvals.  
- **Scope:** CLI or HTTP path that accepts attributes and returns OPA decision + explanation.
- **Acceptance Criteria:**
  - Given JSON payload, tool returns `allow/deny`, `requires_approval`, and explanation.
  - At least three pre-canned example scenarios documented.
  - Runbook includes “how to simulate policy decisions.”
  - Simulation path is side-effect free (no approvals created, no ledger writes).

## Epic 2 – Provenance Ledger & Evidence/Receipt Schema (`COS-2000`)
**Goal:** Every approval decision emits verifiable evidence and receipts.

### `COS-2001` – Design Evidence & Receipt Schemas
- **Type:** Story  
- **Labels:** design, provenance, schema  
- **Description:** Define JSON schemas for `EvidenceBundle` and `Receipt` used for provenance of `grant_elevated_access` and future operations.  
- **Scope:**
  - `EvidenceBundle`: inputs, attributes, policy version, decision, actors, timestamps, hashes.
  - `Receipt`: stable ID, operation type, outcome, summary, hash references, redaction metadata.
- **Acceptance Criteria:**
  - JSON schema files for EvidenceBundle and Receipt checked into repo.
  - Versioning and backwards-compatibility strategy documented.
  - Example JSON instances included and validated against schemas.
  - Short markdown explainer on production and usage.

### `COS-2002` – Implement Provenance Ledger Write Path
- **Type:** Story  
- **Labels:** backend, provenance, storage  
- **Description:** Implement Provenance Service that records EvidenceBundles in an append-only ledger and returns Receipts.  
- **Scope:**
  - `recordEvidence(evidenceBundle)` API (internal).
  - Append-only storage table with logical immutability (no in-place updates).
- **Acceptance Criteria:**
  - Every approval decision calls `recordEvidence` exactly once.
  - On success, a Receipt ID is returned and persisted with the approval record.
  - On ledger write failure: operation fails (configurable behavior documented) and error logged with correlation ID/reason.
  - Unit + integration tests for happy path, storage failure, invalid evidence payload.
  - Metrics for successful vs failed ledger writes emitted.

### `COS-2003` – Notary Adapter Stub with Feature Flag
- **Type:** Story  
- **Labels:** backend, notary, feature-flag  
- **Description:** Create a notary adapter interface for external notarization of evidence hashes, with default no-op/dev implementation guarded by feature flag.  
- **Scope:**
  - Interface for `NotaryAdapter` (e.g., `notarize(hash)`).
  - Default implementation logs “notarized” and returns stub reference.
  - Feature flag to toggle real/notary stub (real can be unimplemented for now).
- **Acceptance Criteria:**
  - Provenance service calls NotaryAdapter for each EvidenceBundle (or batch, per design).
  - Logs include notary reference (even if stubbed).
  - Feature flag documented and defaults to stub in all environments.
  - Unit test: disabling adapter does not break ledger write path.

### `COS-2004` – Evidence & Receipt Retrieval API
- **Type:** Story  
- **Labels:** backend, api, provenance  
- **Description:** Implement API to retrieve receipts and associated evidence for authorized users.  
- **Scope:**
  - `GET /receipts/:id` endpoint returning Receipt plus handle/partial EvidenceBundle with future redaction support.
- **Acceptance Criteria:**
  - AuthN/AuthZ enforced via ABAC/role-based rules.
  - Given valid receipt ID, API returns Receipt and minimal evidence view (operation, timestamps, actors, hash references).
  - Invalid/unauthorized IDs return 404/403 with structured errors.
  - End-to-end test: create approval → make decision → fetch receipt via API.

## Epic 3 – Switchboard UI: Approvals & Rationale Center v1 (`COS-3000`)
**Goal:** Switchboard provides full approvals UX with rationale capture.

### `COS-3001` – Approvals List View in Switchboard
- **Type:** Story  
- **Labels:** frontend, switchboard, ui/ux  
- **Description:** Implement list view in Switchboard for approvals, focusing first on `grant_elevated_access`.  
- **Scope:** Table of approvals showing operation, requester, target, tenant, age, status, risk tier; filters for status/tenant/operation/risk tier.
- **Acceptance Criteria:**
  - List populated from approvals API with server-side pagination.
  - Filters update data without full page reload and preserve URL or local state.
  - Loading/error states clearly shown.
  - UI tests for filter behavior, pagination, empty state.

### `COS-3002` – Approval Detail & Decision Drawer with Rationale
- **Type:** Story  
- **Labels:** frontend, switchboard, ux, opa  
- **Description:** Detail view/drawer for an approval with context, policy simulation summary, and approve/reject actions with mandatory rationale for high-risk operations.  
- **Scope:** Shows requester, target, operation, attributes, risk tier; link to raw attribute JSON; approve/reject actions call decision API; rationale textbox required for high risk.
- **Acceptance Criteria:**
  - Users cannot approve `grant_elevated_access` without providing rationale.
  - After decision, status updates in detail view and list.
  - Backend errors surfaced with user-friendly messages.
  - UI tests for approve with rationale, reject with rationale, API error handling.

### `COS-3003` – Policy Simulation Panel in Approval Detail
- **Type:** Story  
- **Labels:** frontend, switchboard, opa, devex  
- **Description:** Display compact policy decision preview using simulation API for approvers to understand recommended outcome.  
- **Scope:** Call simulation API with approval attributes; render system recommendation (`allow/deny`, `requires_approval`) and key factors.
- **Acceptance Criteria:**
  - Simulation is read-only and does not modify approvals.
  - Errors handled gracefully (e.g., “Simulation unavailable” banner).
  - Demo env includes at least one approval with meaningful simulation output.

### `COS-3004` – Timeline Integration for `grant_elevated_access` Events
- **Type:** Story  
- **Labels:** frontend, timeline, switchboard  
- **Description:** Show `grant_elevated_access` approvals and decisions on timeline pane with links to receipts.  
- **Scope:** Timeline events for approval created and approved/rejected; clicking opens approval detail with receipt metadata.
- **Acceptance Criteria:**
  - Timeline shows sequence of access elevation events per user/tenant.
  - Each event includes link/icon to view associated receipt.
  - Verified working in demo env for at least one test user.

### `COS-3005` – Theming Hooks for Approvals UI (White-Label Ready)
- **Type:** Story  
- **Labels:** frontend, theming, white-label  
- **Description:** Ensure Approvals & Rationale Center respects theme tokens and can be branded per tenant/partner.  
- **Scope:** Use existing theme system for colors/typography/logo areas; validate across at least two themes (Summit + partner demo).
- **Acceptance Criteria:**
  - Approvals screens render correctly under multiple themes.
  - No hard-coded Summit-specific colors/fonts in this module.
  - Short doc/snippet added to white-label kit: “How to rebrand the Approvals Center.”

## Epic 4 – Observability, SLOs, and FinOps Hooks (`COS-4000`)
**Goal:** Observability and basic cost attribution from day zero.

### `COS-4001` – Metrics & Tracing for Approval Flow
- **Type:** Story  
- **Labels:** observability, metrics, tracing  
- **Description:** Add metrics and distributed tracing around approvals and provenance paths.  
- **Scope:** Metrics for requests/latencies/error counts per endpoint and ledger write success/failure; traces spanning Approval API → OPA → Provenance → Notary.
- **Acceptance Criteria:**
  - Grafana (or equivalent) dashboard shows p50/p95 latency per endpoint, error rate, throughput.
  - At least one trace sample shows full `grant_elevated_access` path.
  - Documentation on filtering traces for a specific approval ID.

### `COS-4002` – SLOs & Alerts for Approvals API
- **Type:** Story  
- **Labels:** slo, alerting, reliability  
- **Description:** Define and implement SLOs and alerting for approval create/decision endpoints.  
- **Scope:** SLOs: p95 latency < 1.5s for `POST /approvals` and `POST /approvals/:id/decision`; p99 error rate < 0.5% over rolling window; alerting and error-budget policy.
- **Acceptance Criteria:**
  - SLO dashboard configured and committed to infra/config repo.
  - Alert rules created for SLO breach conditions.
  - Synthetic probe hitting approvals endpoints in staging with visible dashboards.
  - Runbook section added: “What to do on approvals SLO breach.”

### `COS-4003` – FinOps Tagging & Usage Metrics for Approvals
- **Type:** Story  
- **Labels:** finops, billing, metrics  
- **Description:** Tag and collect usage metrics for approvals to support per-tenant cost attribution.  
- **Scope:** Emit metrics by tenant for approval requests and decisions; integrate tags with metering pipeline.
- **Acceptance Criteria:**
  - Simple report (script/notebook) can produce “approvals per tenant over period X.”
  - Metrics clearly labeled with tenant ID/slug.
  - FinOps docs include how the metric will be used in pricing/cost attribution.

## Epic 5 – Packaging, Runbooks, Security & Compliance (`COS-5000`)
**Goal:** Deployable, operable, and auditor-ready elevated access flow.

### `COS-5001` – Helm/Terraform Updates for Approvals & Provenance
- **Type:** Story  
- **Labels:** infra, helm, terraform, devops  
- **Description:** Update deployment artifacts to include approvals, OPA, provenance, and related components.  
- **Scope:** Helm charts for services/config/secrets/env/feature flags; Terraform for DB tables/buckets/queues as needed.
- **Acceptance Criteria:**
  - Fresh environment can be brought up with `helm install`/`terraform apply` supporting full approvals flow.
  - Secrets/config values documented (not hard-coded) in values files.
  - CI pipeline updated to deploy new components in staging.

### `COS-5002` – Runbook: Grant Elevated Access Flow
- **Type:** Story  
- **Labels:** runbook, docs, sre  
- **Description:** Operational runbook for end-to-end `grant_elevated_access` flow, including triggering, observing, approving, debugging, simulation, and retrieving receipts/evidence.  
- **Acceptance Criteria:**
  - Runbook lives in repo (Docs-as-Code) and is used as demo script.
  - Linked from Switchboard (help/context) and internal wiki.

### `COS-5003` – Security & Threat Model Update for Elevated Access
- **Type:** Story  
- **Labels:** security, threat-model, governance  
- **Description:** Extend threat model to cover elevated access flows and update mitigations (policies, IAM, logging).  
- **Scope:** Identify threats (policy bypass, evidence tampering/deletion, unauthorized elevation); ensure mitigations (least-privilege IAM, dual-control for policy changes, logging/tracing for sensitive ops).
- **Acceptance Criteria:**
  - Threat model document updated and checked in.
  - At least two concrete mitigations implemented and referenced (e.g., IAM changes, dual-control checks).
  - Security review “red stamp” recorded for this flow.

### `COS-5004` – Sample Evidence Bundle & Compliance Notes
- **Type:** Story  
- **Labels:** compliance, docs, provenance  
- **Description:** Produce sample evidence bundle + receipt and document how this supports SOC2/ISO-style controls.  
- **Scope:** Capture real sample from staging (scrub/redact if needed); document mapping to audit controls (change management, access control).
- **Acceptance Criteria:**
  - Sample JSON files for EvidenceBundle and Receipt in repo.
  - “Trust & Proof Pack” doc updated with how auditors consume these and which controls they satisfy.
  - Ready for fundraising/partner security conversations.

## Shared Story-Level Definition of Done
Add this checklist to each ticket:
- [ ] Updated spec (API/schema/UX) if applicable
- [ ] Policy diffs and tests if OPA/ABAC is touched
- [ ] Unit tests (happy & at least one failure path)
- [ ] Integration test for core flow where applicable
- [ ] Evidence/receipt emission for stateful operations
- [ ] Metrics + logs + traces wired in
- [ ] Docs/runbook updated or confirmed accurate
- [ ] Helm/Terraform/feature flags updated if needed
- [ ] Changelog entry with performance & cost impact
