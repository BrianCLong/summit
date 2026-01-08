# Migration Program Charter and Operating Plan

## Purpose and Non-Negotiables

- **Goal:** Migrate all customers to the new platform with **≥98% logo retention** and **≥102% net revenue retention (NRR)** while achieving **zero data loss** and **no surprise billing**.
- **Cutover policy:** Default to phased, tenant-level cutovers with canary → ramp → full. Each account requires signed "go/no-go" approval and rollback readiness.
- **Success metrics:**
  - Customer: retention (logos & NRR), support ticket volume/severity, CSAT ≥ 4.5, time-to-steady-state ≤ 14 days.
  - Technical: invariant pass rate ≥ 99.9%, RPO ≤ 5 minutes, RTO ≤ 30 minutes for migration jobs, dual-run parity error rate ≤ 0.1%.
  - Operational: completion vs. schedule, blocker burn-down, SLA adherence on incidents and exceptions.
- **Principles:** No data loss, no surprise billing, minimal downtime, least-privilege access, and auditability for every migration action.

## Governance and Operating Model (Epic 1, 6, 8, 9)

- **Migration steering group:** Eng (lead), CS (co-lead), PM (scope), SRE (reliability), Sec/Legal (compliance).
- **Cadence:** Weekly program review → daily war room in T-14 days to cutover; T-2 switch to twice-daily; T0 hourly checkpoints; T+14 stabilization reviews.
- **Playbook ownership & escalation:** Single runbook owner per account; escalation ladder: Eng on-call → SRE lead → PM/CS lead → Exec sponsor.
- **Rollback/stop-the-line:** Trigger if invariant breach >0.1%, data drift unexplained >30 minutes, error budget burn >50%, or customer veto. Automated rollback path required for every cutover gate.
- **Exception registry:** Track scope, owner, expiry, compensating controls; reviewed twice weekly. Freeze net-new bespoke features unless retention-critical and approved by steering group.
- **Legacy shutdown:** Decommission checklist per service (traffic=0, exports complete, backups archived/deleted with attestations, secrets revoked, redirects auto-expire).
- **Comms ladder:** Exec sponsor → admin → end users with templates for announce/reminders/cutover/post-cutover; in-product banners and status indicators must be non-intrusive and actionable.

## Identity, Accounts, and Entitlements (Epic 2)

- **Identity mapping rules:** Canonical user GUID; deterministic mapping for orgs/domains; dedupe by verified domains and SCIM IDs; provenance logged for merges/splits.
- **Account linking:** Persistent linkage old↔new tenant with full audit trail and reversible checkpoints.
- **Auth migration:** SSO/SAML plan with domain verification, failover, and cutback; remove legacy auth paths post-migration with feature-flag guardrails.
- **RBAC & entitlements:** Role/permission templates mapped to new RBAC; entitlement matrix including plans, limits, add-ons, and grandfathered terms with preview tooling for CS before cutover.
- **Billing alignment:** Billing system and product entitlements reconciled nightly; mismatch states blocked from cutover.
- **Access review:** Automated exports for enterprise migrations and "why can't I" permission introspection to deflect support.

## Data Mapping & Correctness (Epic 3)

- **System-of-record & schema:** Canonical schemas per entity with transforms/defaults/deprecations defined in a field mapping spec; provenance references stored with migrated objects.
- **Validation & invariants:** Preflight rules plus dual-run invariants (counts/hashes/sampling). Edge cases: deleted/archived/orphan/conflict handling and retention/legal hold semantics.
- **Backfill framework:** Checkpointed, batched jobs with retries and DLQ; shadow reads during ramp to prove parity.
- **Parity & reconciliation:** Automated parity reports (counts, hashes, sample diffs, invariant pass rate) and post-cutover drift detection with reconciliation jobs. Customer-safe parity report available.
- **Data lifecycle:** Delete shadow/temp datasets after verification; retention/deletion semantics enforced and attested.

## Integration & API Migration (Epic 4)

- **Inventory & compatibility:** Catalog webhooks, API keys, ETL, SIEM/SSO, and connectors per customer. Provide compatibility layers or adapters for critical endpoints/events with dual-publish windows and deprecation dates.
- **Security & resilience:** Signed webhooks with replay protection; scoped tokens and rotation workflows; rate/quota parity or explicit communication of changes.
- **Tooling:** Replay/backfill tooling for missed events; integration test harness customers can run pre-cutover; connector health dashboards and alerts per customer.
- **Sunset:** Enforce endpoint sunset after deprecation window; remove legacy credentials and vendor access as part of shutdown.

## UX & Workflow Parity (Epic 5)

- **Workflow catalog:** Top 10 workflows per segment mapped to a parity matrix (old vs. new vs. planned differences) with time-boxed compat toggles where churn risk warrants.
- **Familiarity aids:** Templates/defaults to mimic old setups; contextual walkthroughs and "what changed" panel tailored by role; redirects from old links/bookmarks.
- **Recovery & supportability:** Quick recovery controls (undo/resync/retry) for common migration errors; export/print/report parity for executive artifacts; remove legacy UI paths after window ends.

## Reliability, DR, and Cutover Mechanics (Epic 6)

- **Cutover strategy:** Phased, per-tenant progression with canary tenants → ramp → full; traffic routing and feature flags enabling automated rollback.
- **Observability:** Migration SLOs (error rate, latency, drift, job completion) with synthetic checks for critical flows during windows; load tests for migration jobs and post-cutover spikes.
- **DR:** DR plan for migration tooling/data stores; GameDay scenarios including stalled jobs, dependency outages, and rollback execution.
- **Comms triggers:** Notifications bound to metric thresholds, not sentiment.

## Legal, Privacy, and Contracts (Epic 7)

- **Obligation mapping:** Inventory SLAs, retention, residency, and data transfer bases; map promises to system controls with gap remediation.
- **Data handling:** Verified deletion/attestations for legacy systems; DSAR continuity spanning old+new; incident notification matrix across obligations.
- **Contracts & claims:** Updated DPAs/subprocessors, migration addendums/consents where required, and a vetted claim library for Sales/CS during migration. Audit-ready evidence pack maintained.

## Customer Support & Change Management (Epic 8)

- **Runbooks:** Customer-specific runbook with steps, owners, timelines, validation checks, and go/no-go checklist requiring sign-off.
- **Support lane:** Dedicated migration support queue with SLA; office hours and escalation channels for high-risk accounts; proactive outreach for stalled migrations.
- **Training & feedback:** Short videos, "new in 10 minutes" guides, FAQs, and feedback loop tagging issues → owners → ship dates.

## Execution Dashboard & Reporting (Epic 1 & 11)

- **Live dashboard requirements:**
  - Status by account (phase, cutover window, SSO readiness, data parity state, integration health, UX parity, blockers, next actions/owner/ETA).
  - Invariant pass rate, RPO/RTO, job throughput, error/drift trends, support ticket volume/severity, comms status.
  - Exception registry, rollback readiness, and freeze policy adherence.
- **Data sources:** Migration job telemetry, parity reports, integration health checks, billing/entitlement reconciliations, support system, and comms logs.
- **Consumers:** Steering group, CS/Support, exec sponsors; exportable snapshot for customer-facing parity reports.

## Timeline Framework

- **T-60 to T-30:** Finalize mapping specs, integration inventory, entitlement/billing reconciliation, and GameDay rehearsal.
- **T-29 to T-15:** Dry-run backfills, enable preview entitlements, publish customer-facing timelines, and start weekly dashboard reviews.
- **T-14 to T-3:** Daily war room; lock freeze; finalize rollback plans; complete SSO/domain verification; customer harness tests.
- **T-2 to T0:** Twice-daily checkpoints; canary cutovers; dual-run and parity validation; go/no-go with rollback proof.
- **T+1 to T+14:** Drift detection, reconciliation, support surge coverage, removal of legacy auth/UI paths, and progressive shutdown.
- **T+15+:** Decommission legacy systems, revoke credentials, archive required data with attestations, and publish "what we retired." Postmortem feeds future playbook.

## Roles & Ownership Model

- **Technical lead:** Owns architecture, invariants, and rollback design.
- **Data lead:** Owns field mapping, backfill framework, parity/reconciliation.
- **Integrations lead:** Owns compatibility layers, webhook signing, replay tooling, and integration guides.
- **Identity/Billing lead:** Owns identity mapping, SSO/SCIM, RBAC, entitlements, billing parity.
- **CS lead:** Owns customer runbooks, previews, comms ladder, and support lane.
- **SRE lead:** Owns migration SLOs, synthetic checks, load tests, DR plan, and dashboards.
- **Legal/Privacy lead:** Owns obligations, DPAs, deletion attestations, and claim library.
- **Program manager:** Maintains exception registry, cadence, freeze enforcement, and executive reporting.

## Risks and Mitigations

- **Data drift or loss:** Dual-run with invariants, checkpoints, DLQ, and fast rollback; shadow reads during ramp.
- **Identity/SSO failures:** Domain pre-verification, failover SP metadata, temporary compat mode, and quick cutback to legacy auth (time-boxed).
- **Integration breakage:** Compatibility adapters, dual-publish events, replay tooling, and customer test harnesses before cutover.
- **Billing mismatches:** Nightly entitlement/billing reconciliations and cutover block on mismatch resolution.
- **Change fatigue:** Compat toggles, contextual walkthroughs, and role-based "what changed" notes; limit disruptive UI shifts until post-stabilization.
- **Operational overload:** War room staffing plan, on-call rotations, and automation for parity/drift detection to reduce manual toil.

## Forward-Looking Enhancements

- **Predictive risk scoring:** Use telemetry to score accounts (drift likelihood, integration fragility, SSO risk) and prioritize canaries/ramp sequencing.
- **Automated rollback rehearsal:** Scheduled chaos-style drills that execute rollback workflows in staging with parity assertions.
- **Customer co-pilot:** Embedded "why can't I" + entitlement preview + guided recovery flows surfaced in-product during migration windows.
