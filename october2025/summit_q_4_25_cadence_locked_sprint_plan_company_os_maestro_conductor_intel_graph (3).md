# Summary

This plan locks delivery to the stated operating cadence (daily/weekly/monthly/quarterly) and ensures there are **no gaps** in prerequisites, artifacts, or governance for **Summit CompanyOS**, **Maestro Conductor (MC)**, and **IntelGraph**. It maps 2‑week sprints for Q4’25, nests them within weekly reviews and monthly releases, and ties each deliverable to Disclosure‑first artifacts (SBOM, SLSA, DPA/DPIA when applicable) and canary/rollback criteria.

> **Timeframe:** Oct 6 – Dec 28, 2025 (6 sprints)  
> **Cadence anchors:** Daily Dispatch → Weekly Portfolio & Risk → Monthly Strategy & Metrics → Quarterly Board Brief

---

## 0) Cadence Lock & Governance “Rail Guards”

- **Daily (Horizon 01):** CEO Daily Dispatch (yesterday, today, blockers, risk heat), cash runway & pipeline delta.
- **Weekly (Horizon 02):** Portfolio Review (product/GTM/ops traffic lights + owner + next step), Risk & Compliance (incidents, policy drift, attestations).
- **Monthly (Horizon 03):** Strategy Update (bets, focus, capital rotation), Metrics Pack (OKR progress, SLOs, unit economics, CAC/LTV).
- **Quarterly (Horizon 04):** Board Brief (one‑pager + appendix + disclosure pack), Roadmap Review (bets reprioritized).

**Release Gate (MC) — required every releasable increment:**

- SBOM ✅ SLSA provenance ✅ Risk assessment ✅ DPA/DPIA if applicable ✅ Rollback plan ✅ Disclosure pack ✅
- **Canary policy:** traffic slice = 10%; auto‑rollback on SLO breach (2x window), security finding, data‑policy violation.

**Decision Protocol:**

- Classify one‑way vs two‑way doors; log each **Decision** node to IntelGraph with evidence and Maestro run IDs.
- Use the brief template: _Context, Options, Decision, Reversible?, Risks, Owners, Checks._

**Definitions:**

- **DoR (Definition of Ready):** JIRA story linked to IntelGraph claims, acceptance criteria, test plan, data policy labels.
- **DoD (Definition of Done):** Code + tests green, SLOs met, security checks passed, SBOM/SLSA attached, runbook + rollback, change logged to IntelGraph.

---

## 1) Program Calendar (Q4’25)

- **Sprint 0** (hardening/bootstrap): **Sep 30 – Oct 5** (setup only; no feature commitments)
- **Sprint 1:** **Oct 6 – Oct 19**
- **Sprint 2:** **Oct 20 – Nov 2**
- **Sprint 3:** **Nov 3 – Nov 16**
- **Sprint 4:** **Nov 17 – Nov 30**
- **Sprint 5:** **Dec 1 – Dec 14**
- **Sprint 6:** **Dec 15 – Dec 28**

**Standing ceremonies & artifacts:**

- **Mon-Fri (Daily):** Dispatch + Blockers; tag Decision/Incident nodes in IntelGraph.
- **Thu (Weekly):** Portfolio Review + Risk & Compliance; update traffic lights; freeze decisions by EOD Fri.
- **Last weekday each month:** Strategy Update + Metrics Pack; publish Release Notes + Disclosure Pack.
- **Dec 29–31:** Quarter close: Board Brief + Roadmap Review + retrospective & replan.

---

## 2) Workstreams & Cross‑cutting Tracks

### Workstream A — **Summit CompanyOS**

**Objectives (Q4):** multi‑tenant workspace shell; policy‑labeled pages/records; role‑aware apps; admin ops; audit export.  
**Key SLOs:** p95 < 300ms; 99.9% uptime; P0 security defects = 0; provenance manifest coverage = 100%.

**Milestones by Sprint:**

- **S1:** Tenant bootstrap + AuthN (WebAuthn/FIDO2) + ABAC policy scaffold; skeleton UI; audit log MVP.
- **S2:** Page/Record primitives + policy labels (origin, sensitivity, legal_basis); export w/ redactions.
- **S3:** App containerization (widgets, forms, list views), search index, admin ops & quotas.
- **S4:** Templates pack (Risk & Ethics Memo, Customer Value Memo, Execution Order) w/ IntelGraph deep links.
- **S5:** Billing hooks (plan/seat), usage metering, reliability hardening, SOC2‑lite report generation.
- **S6:** Multi‑region read; DR runbook; scale/load test; holiday freeze hardening & bug debt burn down.

### Workstream B — **Maestro Conductor (MC)**

**Objectives (Q4):** plan→run→artifact pipeline; budgets, attestations; canary + rollback orchestration; run provenance.

**Milestones by Sprint:**

- **S1:** Run spec v1 (YAML/JSON), run IDs, artifact attachment; budgets (cost/time) fields.
- **S2:** Attestation hooks (cosign, osv-scan, trivy); SBOM ingest; Disclosure Pack generator CLI.
- **S3:** Canary controller (10% traffic slice) + SLO gates; auto‑rollback conditions wired.
- **S4:** Freeze windows & change calendar; approval workflows; integration with CompanyOS releases.
- **S5:** Multi‑env promotions (dev→staging→prod) with evidence carry‑forward; cost dashboards.
- **S6:** Reliability SLO alerting; incident postmortem auto‑draft from run artifacts; QoQ wrap.

### Workstream C — **IntelGraph**

**Objectives (Q4):** claim ledger; entity/claim reference; decision nodes; policy labels; query API & SDKs; redaction.

**Milestones by Sprint:**

- **S1:** Core schema (Entity, Claim, Evidence, Decision), policy label fields; API v0 read/write.
- **S2:** Provenance manifest ingestion; source hashing; minimal query language; SDK stubs (TS/Python).
- **S3:** Access controls (ABAC context), lineage views, audit export.
- **S4:** Decision protocol helpers (templates, checks), diff/compare of claims; JIT redaction.
- **S5:** Performance pass; graph analytics primitives (degree, reach, recency filters).
- **S6:** Backfills, migration tools, archival & retention policies.

### Cross‑cutting Tracks

- **Security & Compliance:** DLP redactions, residency controls, SBOM/SLSA on every release; monthly SOC2‑lite pack.
- **Platform/Infra:** IaC baselines, observability (logs, traces, metrics), multi‑region posture, cost guards.
- **GTM Enablement:** design‑partner onboarding kit, pricing guardrails, demo sandboxes, SLAs/DPAs.

---

## 3) Sprint‑by‑Sprint Plan (no gaps)

### Sprint 0 (Sep 30 – Oct 5) — Bootstrap & Hardening (no feature commitments)

**Goals:** environments ready; policy bundles loaded; CI/CD green; baselines enforced.  
**Entry:** cloud accounts; DNS/TLS; secret mgmt; artifact registry.  
**Exit:** green pipelines; base images signed; vulnerability budget set; **Release Gate** dry‑run passed.  
**Deliverables:** IaC repo baseline; org policy + ABAC starter; obs stack; incident/responder on‑call; access reviews.

---

### Sprint 1 (Oct 6 – Oct 19)

**CompanyOS:** Tenant bootstrap, WebAuthn, ABAC scaffold, audit log MVP.  
**MC:** Run spec v1, run IDs, artifact attachment, budget fields.  
**IntelGraph:** Core schema + API v0; Decision nodes; policy labels.  
**Cross‑cutting:** SBOM/SLSA pipeline wiring; DLP redaction library seed.  
**Dependencies cleared:** Auth & ABAC available for IntelGraph ACLs; MC run IDs referenced in IntelGraph.  
**Artifacts:** SBOMs for base services; SLSA provenance for CI images; risk memo for access model.  
**Demo:** Create Decision node from a CompanyOS “Execution Order” and see it in IntelGraph with a Maestro run ID.

### Sprint 2 (Oct 20 – Nov 2)

**CompanyOS:** Page/Record primitives + policy labels; export with redactions.  
**MC:** Attestation hooks (cosign, osv, trivy); SBOM ingest; Disclosure Pack CLI.  
**IntelGraph:** Provenance manifest ingestion; source hashing; SDK stubs.  
**Cross‑cutting:** First **Monthly Strategy & Metrics** synth (Oct); release notes + disclosure pack.  
**Exit criteria:** End‑to‑end disclosure‑first release of a trivial app via CompanyOS→MC→IntelGraph.

### Sprint 3 (Nov 3 – Nov 16)

**CompanyOS:** App containers (widgets/forms/lists), search; admin ops/quotas.  
**MC:** Canary controller (10%), SLO gates, auto‑rollback conditions wired.  
**IntelGraph:** ABAC enforcement; lineage views; audit export.  
**Cross‑cutting:** Incident playbooks; change freeze calendar scaffolding.  
**Demo:** Canary deployment of CompanyOS app with rollback on induced SLO breach; IntelGraph logs decisions/evidence.

### Sprint 4 (Nov 17 – Nov 30)

**CompanyOS:** Templates pack (Risk/Ethics, Customer Value, Execution Order) with deep links to IntelGraph.  
**MC:** Approvals, freeze windows, change calendar; CompanyOS release integration.  
**IntelGraph:** Decision helpers (templates, checks), claim diff/compare; JIT redaction.  
**Cross‑cutting:** **Monthly Strategy & Metrics** (Nov) + design‑partner enablement drop.  
**Exit:** Controlled release with approvals + freeze honored; disclosure pack auto‑generated.

### Sprint 5 (Dec 1 – Dec 14)

**CompanyOS:** Billing hooks (plan/seat), usage metering, reliability hardening, SOC2‑lite pack gen.  
**MC:** Promotions (dev→staging→prod) with evidence carry‑forward; cost dashboards.  
**IntelGraph:** Performance & analytics primitives (degree, reach, recency).  
**Cross‑cutting:** Year‑end readiness; DR exercise schedule; **Monthly Strategy & Metrics** (Dec pre‑close).

### Sprint 6 (Dec 15 – Dec 28)

**CompanyOS:** Multi‑region reads; DR runbook; load tests; bug debt burn‑down.  
**MC:** SLO alerting; auto‑draft postmortems from runs; quarter wrap.  
**IntelGraph:** Backfills, migrations; archival & retention policies.  
**Cross‑cutting:** Quarter close: Board Brief + Roadmap Review + full Disclosure Pack set.  
**Exit:** Green on reliability gates; freeze honored; next‑quarter plan approved.

---

## 4) "No‑Gaps" Prereq Map (Who needs what, when)

- **IntelGraph** requires **ABAC** & **AuthN** from CompanyOS by **S1** → satisfied in S1.
- **MC** requires **artifact signing + scanners** by **S2** → wired in S2 with attestation hooks.
- **CompanyOS templates** require **IntelGraph deep links & Decision helpers** by **S4** → shipped by S4.
- **Canary/rollback** in MC needed before CompanyOS wider releases (**S3**) → delivered in S3.
- **Billing & metering** need **MC cost fields** to roll up (**S5**) → available since S1; dashboards in S5.
- **Quarter close** requires all disclosure artifacts and SOC2‑lite pack (**S6**) → covered by S5–S6.

---

## 5) Owners, Success & Proof‑by‑Date

> Populate with names; defaults assign cross‑functional leads and a DRI for each workstream.

| Area                  | Owner (DRI) |                                    Success Metric | Proof‑by‑Date      |
| --------------------- | ----------- | ------------------------------------------------: | ------------------ |
| CompanyOS             | _TBD_       | p95≤300ms; 99.9% uptime; 100% provenance coverage | Sprint exits S1–S6 |
| Maestro Conductor     | _TBD_       |   Canary success rate≥95%; rollback <2m MTTD/MTTR | S3, S6             |
| IntelGraph            | _TBD_       |          100% decisions logged; 0 P0 policy drift | S2, S4, S6         |
| Security & Compliance | _TBD_       |         100% releases with SBOM/SLSA; 0 criticals | Monthly close      |
| Platform/Infra        | _TBD_       |      Error budget burn<1%; cost/req within budget | S5, S6             |
| GTM Enablement        | _TBD_       |                ≥5 design partners; ≤12‑mo payback | S4–S6              |

---

## 6) Backlog Sourcing & Intake

- **Sources:** design‑partner asks, risk/compliance gaps, performance data, cost regressions, roadmap bets.
- **Intake:** every story linked to IntelGraph claims/decisions; policy labels applied; DoR check; budget annotated.
- **Prioritization lenses:** mission value, time‑to‑proof (≤2 weeks demo; ≤8 weeks ROI), compliance fit, strategic leverage.

---

## 7) Risk Heatmap & Controls (Q4)

- **Security:** supply‑chain & secrets → signed base images, SLSA, trivy/osv, step‑up auth for policy exception.
- **Delivery:** scope creep → enforce two‑week reversible slices; freeze windows; change calendar.
- **Data:** residency & DLP → default redactions, watermarks on exports, policy labels enforced.
- **Reliability:** canary + auto‑rollback; SLO gates in pipeline; DR runbooks tested.
- **Commercial:** design‑partner slip → dual‑track demos (sandbox + recorded), weekly pipeline delta review.

---

## 8) Release & Evidence Checklist (applies every Sprint exit)

- ✅ Unit/integration/e2e tests green; ✅ SLO budgets respected; ✅ SBOM generated; ✅ SLSA provenance attached;
- ✅ Vulnerability scan gate; ✅ DPA/DPIA evaluated; ✅ Rollback plan w/ criteria; ✅ Disclosure Pack published;
- ✅ IntelGraph entries for decisions/claims; ✅ Maestro run IDs linked in release notes.

---

## 9) What to Print/Send Each Cadence

- **Daily:** CEO Dispatch (KPIs snapshot + blockers)
- **Weekly:** Portfolio Review one‑pager + Risk & Compliance attestation
- **Monthly:** Strategy Update + Metrics Pack + Release Notes + Disclosure Pack
- **Quarterly:** Board Brief (one‑pager + appendix) + Roadmap Review

---

### Appendix — Mapping to Operating Frame

- **Flywheel alignment:** design‑partner proofs in ≤2 weeks (S1–S2), ROI ≤8 weeks (S4–S5), modules white‑labelable (S3–S6).
- **KPIs:** time_to_first_value≤14 days; provenance_manifest_coverage=100%; p95_latency≤300ms; uptime≥99.9%;  
  design_partners_signed≥5; payback≤12 months; gross_margin≥70%; sbom+attestation_per_release=100%; policy_violation_rate=0 critical.
- **Action policies honored:** strategy brief at start of each month; release gate on every increment; smallest reversible step default.

---

## 10) Sprint 1 — **Execution Order** (Oct 6–Oct 19)

**Purpose:** Ship first end‑to‑end _disclosure‑first_ demo path across CompanyOS → MC → IntelGraph with evidence.

### Scope & Stories (Definition of Ready attached to each)

1. **AuthN + ABAC Scaffold (CompanyOS-SEC-101)**
   - _AC:_ WebAuthn/FIDO2 flows pass; ABAC policies evaluated in staging; step‑up on policy exception.
   - _Tests:_ e2e login + role switch; policy exception requires step‑up; audit log entry present.
   - _Artifacts:_ SBOM, SLSA provenance for auth service; Risk memo: Access Model v1.
2. **Run Spec v1 + Artifact Attachment (MC-CORE-110)**
   - _AC:_ Create run with budgets; attach at least 2 artifacts; generate run ID; export Disclosure Pack stub.
   - _Tests:_ CLI + API both create runs; artifact hash stable; budgets surfaced in run summary.
   - _Artifacts:_ SBOM for CLI; attestation recorded.
3. **Core Schema + API v0 (IGRAPH-SCHEMA-001)**
   - _AC:_ Create Entity, Claim, Decision; link evidence blobs; policy labels persisted; query returns by ID.
   - _Tests:_ Unit for each node/edge; round‑trip write/read; label enforcement.
   - _Artifacts:_ Schema doc + example payloads; provenance manifest template.
4. **Audit Log MVP (COS-AUDIT-120)**
   - _AC:_ Every Decision and policy exception emits audit entries; export to CSV with watermark.
   - _Tests:_ 3 flows generate entries; export includes policy labels; redactions applied.
5. **Demo Thread (DEMO-E2E-001)**
   - _AC:_ “Execution Order → Maestro run → IntelGraph Decision” trace visible with IDs/links.
   - _Tests:_ Live demo script runs in < 7 minutes; rollback plan documented.

### Milestones & Dates

- **M1 (Oct 8):** AuthN up in staging; MC run spec mocked; IntelGraph schema drafted.
- **M2 (Oct 12):** First run with artifacts; Decision node created from CompanyOS template.
- **M3 (Oct 16):** Full e2e demo green; Disclosure Pack generated automatically.
- **Sprint Review (Oct 18):** Show trace + artifacts; retro + next‑sprint gating.

### Owners (DRIs)

- **CompanyOS:** _TBD_ (DRI), _TBD_ (FE), _TBD_ (BE)
- **Maestro Conductor:** _TBD_ (DRI), _TBD_ (CLI/API)
- **IntelGraph:** _TBD_ (DRI), _TBD_ (Schema/API)
- **Security/Compliance:** _TBD_
- **Program/Release:** _TBD_

### Environments & Freeze Windows

- **Envs:** dev → staging → demo; prod locked for S1.
- **Freeze:** Fri 4pm local; emergency change via step‑up approval only.

### SLO Budgets (S1)

- p95 latency ≤ 300ms (CompanyOS/IntelGraph read paths)
- Error budget burn < 1%
- Cost/req within target (baseline +10%)

### Release Gate Checklist (S1)

- [ ] Unit/integration/e2e green
- [ ] SBOM + SLSA provenance
- [ ] Vulnerability scan < thresholds
- [ ] DPA/DPIA considered
- [ ] Canary plan (S3 placeholder) + rollback criteria documented
- [ ] Disclosure Pack published
- [ ] IntelGraph log entries (Decision/Claim) + Maestro run IDs in notes

---

## 11) Two‑Week Value Slice (Demo Plan)

**Narrative:** “From an Execution Order in CompanyOS, trigger a Maestro run that builds a Disclosure Pack, then log a Decision with linked evidence in IntelGraph.”

**User Steps:**

1. Create “Execution Order” from CompanyOS template → fields validate → policy labels auto‑apply.
2. Click **Run in Maestro** → run ID + budgets visible → artifacts (SBOM, attestation) attach.
3. Return link to **IntelGraph Decision** with evidence graph and queryable claim.

**Proof Artifacts:**

- Live demo recording (≤7 min), sample Disclosure Pack, IntelGraph JSON export, runbook + rollback.

**Success Metric:** _time_to_first_value_days ≤ 14_ and _provenance_manifest_coverage = 100%_ for this slice.

---

## 12) RACI & Intake

**RACI per workstream (S1):**

- **Responsible:** DRIs listed above
- **Accountable:** Co‑CEOs
- **Consulted:** Security/Compliance, GTM
- **Informed:** Design partners

**Intake Rules (DoR enforcement):** Story must include: IntelGraph claim refs, policy labels, acceptance criteria, test plan, budget annotations.

---

## 13) Risks & Unblocks (S1)

- **Risk:** Auth device enrollment delays → _Unblock:_ backup OTP for dev/staging only; step‑up enforced in prod.
- **Risk:** Attestation tooling versions drift → _Unblock:_ pin toolchain in CI image; weekly refresh job.
- **Risk:** Demo flakiness → _Unblock:_ record golden path; feature flags for unstable extras.

---

## 14) Templates to Use This Sprint

- **Decision Brief:** Context, Options, Decision, Reversible?, Risks, Owners, Checks.
- **Risk & Ethics Memo:** policy labels, residual risk, compensating controls.
- **Execution Order:** who/what/when/DoD; linked Maestro run; rollback steps; IntelGraph IDs.

---

## 15) Sprint 2 — **Disclosure-First Release & Attestations** (Oct 20–Nov 2)

**Purpose:** Turn the S1 demo path into a releasable, attested workflow with SBOM ingest, Disclosure Pack CLI, and IntelGraph provenance manifests. First **Monthly Strategy & Metrics** close.

### Scope & Stories

1. **Attestation Hooks (MC-SEC-201)**
   - _AC:_ cosign signing of images; trivy + osv-scan run in pipeline; fails on thresholds; artifacts attached to run.
   - _Tests:_ seed intentionally vulnerable image to verify gate; confirm cosign verification during deploy.
2. **SBOM Ingest + Storage (MC-SBOM-205)**
   - _AC:_ SBOM (CycloneDX/SPDX) created and parsed; linked to run; searchable by package.
   - _Tests:_ round‑trip of two formats; query returns package→run mapping.
3. **Disclosure Pack CLI v1 (MC-CLI-210)**
   - _AC:_ `summit disclose create` produces pack with run metadata, SBOM, attestations, rollback plan; checksum stable.
   - _Tests:_ idempotent output; pack verifies; size < 25MB for sample.
4. **Provenance Manifest Ingestion (IGRAPH-PROV-120)**
   - _AC:_ Accept and hash source URLs/files; link to Claim/Decision; policy labels persisted; query by hash.
   - _Tests:_ duplicate evidence deduped; tamper check rejects altered file.
5. **Page/Record + Export with Redactions (COS-DATA-202)**
   - _AC:_ Create/update records with policy labels; export applies DLP rules and watermark; audit trail maintained.
   - _Tests:_ 3 label combinations; export removes restricted fields; watermark survives print.
6. **Monthly Close Pack (OPS-CLOSE-101)**
   - _AC:_ Strategy Update + Metrics Pack auto‑compiled; Release Notes + Disclosure Pack published.
   - _Tests:_ All s1–s2 Decisions present in IntelGraph; links resolve.

### Milestones & Dates

- **M1 (Oct 23):** Attestation gates live in staging; SBOM parsing works.
- **M2 (Oct 28):** CLI generates Disclosure Pack; provenance manifests appear in IntelGraph.
- **M3 (Nov 1):** Monthly close materials published (Oct); release notes link to Maestro run IDs.

### Environments & Freeze

- Staging canary allowed; prod remains locked except for infra fixes.
- Freeze Fri 4pm; exceptions via Security + Program approval.

### Release Gate (S2)

- [ ] Attestation gates enforced
- [ ] SBOM stored & queryable
- [ ] Disclosure Pack CLI output attached to release
- [ ] Provenance manifests present in IntelGraph
- [ ] Monthly Strategy & Metrics published

### Risks & Unblocks (S2)

- **Risk:** SBOM bloat → _Unblock:_ component filters; compress packs.
- **Risk:** Cosign key mgmt → _Unblock:_ KMS‑backed keys; rotation playbook.

---

## 16) Sprint 3 — **Canary + Auto‑Rollback; ABAC Enforcement** (Nov 3–Nov 16)

**Purpose:** Enable safe shipping: MC canary controller with SLO gates and auto‑rollback; IntelGraph ABAC; CompanyOS app containers/search.

### Scope & Stories

1. **Canary Controller (MC-REL-301)**
   - _AC:_ 10% traffic slice; observe SLOs (latency, error rate); auto‑rollback on breach; record decision & evidence.
   - _Tests:_ chaos test triggers rollback < 2 minutes; post‑event run artifacts complete.
2. **SLO Gates in Pipeline (MC-REL-305)**
   - _AC:_ Block promotion if SLOs regressed beyond budget; override requires Decision node with step‑up auth.
   - _Tests:_ failing synthetic prevents deploy; override path logs to IntelGraph.
3. **ABAC Enforcement (IGRAPH-ACL-210)**
   - _AC:_ Read/write filters by attributes (tenant, role, legal_basis); audit export includes policy decisions.
   - _Tests:_ cross‑tenant access blocked; admin bypass logged with reason.
4. **Lineage Views + Audit Export (IGRAPH-VIZ-230)**
   - _AC:_ Visual lineage for Decision→Claims→Evidence; export to CSV/JSON with watermark.
   - _Tests:_ three sample decisions render; exports match counts.
5. **App Containerization + Search (COS-APP-305)**
   - _AC:_ Widget/form/list primitives; search index built; quotas & admin ops functional.
   - _Tests:_ 500 record search < 300ms p95; quota breach emits alert.
6. **Incident Playbooks + Change Calendar (OPS-RES-205)**
   - _AC:_ Playbooks for rollback, disclosure, security incident; change calendar visible in CompanyOS; freeze policy encoded.
   - _Tests:_ tabletop exercise passes; calendar blocks deploy during freeze.

### Milestones & Dates

- **M1 (Nov 6):** Canary in staging; ABAC read filters active.
- **M2 (Nov 11):** Auto‑rollback verified via chaos test; lineage views live.
- **M3 (Nov 15):** Change calendar + freeze honored; demo full rollback with evidence logged.

### Release Gate (S3)

- [ ] Canary + rollback demonstrated and logged
- [ ] SLO gates enforced
- [ ] ABAC enforced with audit
- [ ] Incident playbooks reviewed
- [ ] Disclosure Pack includes rollback evidence

### Risks & Unblocks (S3)

- **Risk:** False‑positive rollbacks → _Unblock:_ widen windows; baseline synthetic traffic.
- **Risk:** Search performance → _Unblock:_ index tuning; background compaction.

---

## 17) Coming Up Next (S4–S6 Preview)

- **S4 (Nov 17–Nov 30):** Approvals, freeze windows, claim diff/compare, CompanyOS templates with IntelGraph deeplinks, design‑partner enablement drop, Monthly close (Nov).
- **S5 (Dec 1–Dec 14):** Billing & metering, multi‑env promotions with evidence carry‑forward, analytics primitives, cost dashboards.
- **S6 (Dec 15–Dec 28):** Multi‑region reads, DR runbook + load tests, incident postmortem auto‑drafts, archival/retention, quarter close pack.

---

## 18) Sprint 4 — **Approvals, Freeze Windows, Decision Helpers** (Nov 17–Nov 30)

**Purpose:** Governance‑aware shipping: approvals + freeze windows in MC; CompanyOS templates with IntelGraph deep links; IntelGraph decision helpers incl. claim diff/compare and JIT redaction. Monthly close (Nov).

### Scope & Stories

1. **Approvals Workflow (MC-GOV-401)**
   - _AC:_ Gate promotions on approvals by role; step‑up auth for exceptions; all approvals logged to IntelGraph.
   - _Tests:_ 2‑person approval path; exception flow requires Decision node + WebAuthn challenge.
2. **Freeze Windows & Change Calendar (MC-GOV-405)**
   - _AC:_ Declarative freeze windows; pipeline respects blocks; change calendar visible via API/UI.
   - _Tests:_ Scheduled freeze prevents deploy; override requires approval + Decision node.
3. **CompanyOS Template Pack (COS-TPL-410)**
   - _AC:_ Risk & Ethics Memo, Customer Value Memo, Execution Order templated with IntelGraph deep links.
   - _Tests:_ Creating docs auto‑creates/links claims/decisions; exports watermarked.
4. **Decision Helpers + Claim Diff (IGRAPH-HELP-420)**
   - _AC:_ Helper API to create decisions with checks; claim compare shows field‑level deltas with evidence lineage.
   - _Tests:_ Three decisions created via helper; diff detects changes; audit trail complete.
5. **JIT Redaction (IGRAPH-RED-425)**
   - _AC:_ On export, sensitive fields masked per policy labels; watermark + rationale retained.
   - _Tests:_ 3 policy scenarios verified; redaction logs stored as evidence.
6. **Design‑Partner Enablement Drop (GTM-EN-430)**
   - _AC:_ Sandbox tenant, demo scripts, pricing guardrails, SLAs/DPAs templates.
   - _Tests:_ Partner onboarding end‑to‑end in < 60 minutes.
7. **Monthly Close (OPS-CLOSE-201)**
   - _AC:_ Publish Nov Strategy Update, Metrics Pack, Release Notes, Disclosure Pack.

### Milestones & Dates

- **M1 (Nov 20):** Approvals + freeze live in staging; template pack in CompanyOS.
- **M2 (Nov 25):** Decision helpers + diff/compare usable; JIT redaction verified.
- **M3 (Nov 29):** Design‑partner sandbox ready; Monthly close pack published.

### Release Gate (S4)

- [ ] Approvals + freeze enforced in pipelines
- [ ] Templates create IntelGraph links automatically
- [ ] Claim diff/compare + JIT redaction validated
- [ ] Design‑partner enablement kit shipped
- [ ] Monthly close artifacts published

### Risks & Unblocks (S4)

- **Risk:** Approval bottlenecks → _Unblock:_ quorum rules; backup approvers.
- **Risk:** Redaction mistakes → _Unblock:_ dual review on policy changes; snapshot tests.

---

## 19) Sprint 5 — **Billing, Promotions, Analytics, Cost Dashboards** (Dec 1–Dec 14)

**Purpose:** Move to production‑ready ops: CompanyOS billing/metering; MC multi‑env promotions with evidence carry‑forward; IntelGraph analytics primitives; cost dashboards for run economics.

### Scope & Stories

1. **Billing Hooks & Metering (COS-BILL-501)**
   - _AC:_ Plan/seat management; usage metering per tenant; export for invoicing; SOC2‑lite report generator.
   - _Tests:_ Simulated tenant billing closes; report bundles generated.
2. **Multi‑Env Promotions (MC-REL-510)**
   - _AC:_ Dev→staging→prod promotions carry forward evidence (SBOM, attestations, approvals); provenance verified at each gate.
   - _Tests:_ Tampered evidence blocks promotion; manual override logged.
3. **Run Cost Dashboards (MC-COST-515)**
   - _AC:_ Show cost/time budgets vs actuals per run; alerts on breach; export to Metrics Pack.
   - _Tests:_ Two over‑budget runs trigger alerts; dashboard aggregations correct.
4. **Analytics Primitives (IGRAPH-ANL-520)**
   - _AC:_ Degree, reach, recency filters; API + SDKs expose simple graph queries.
   - _Tests:_ Queries return within SLO; examples included in docs.
5. **Performance Pass & Reliability (CROSS-REL-525)**
   - _AC:_ p95 ≤ 300ms across key read paths; error budget burn < 1%; reliability playbooks updated.
   - _Tests:_ Load tests pass; synthetic monitors healthy.

### Milestones & Dates

- **M1 (Dec 5):** Billing/metering in staging; promotions carry evidence.
- **M2 (Dec 10):** Cost dashboards live; analytics API stable.
- **M3 (Dec 13):** Performance SLOs verified; SOC2‑lite generator produces December draft.

### Release Gate (S5)

- [ ] Billing hooks operational with audit trail
- [ ] Evidence carry‑forward verified
- [ ] Cost dashboards populated in Metrics Pack
- [ ] Analytics primitives meet latency SLO
- [ ] Reliability budgets within thresholds

### Risks & Unblocks (S5)

- **Risk:** Billing accuracy → _Unblock:_ shadow invoicing; manual reconciliation.
- **Risk:** Evidence mismatch between envs → _Unblock:_ hash verification; fail‑closed gates.

---

## 20) Sprint 6 — **Scale, DR, Archival & Quarter Close** (Dec 15–Dec 28)

**Purpose:** Hardening for holiday freeze and quarter close: multi‑region reads, DR runbooks, load tests, incident postmortem auto‑drafts, archival/retention policies; Q4 Board Brief + Roadmap Review.

### Scope & Stories

1. **Multi‑Region Reads + Failover (PLAT-SCALE-601)**
   - _AC:_ Read replicas in secondary region; RPO/RTO targets documented; failover playbook tested.
   - _Tests:_ Controlled failover meets RTO; read latency within +20% of baseline.
2. **DR Runbook & Load Tests (PLAT-DR-605)**
   - _AC:_ DR runbook with owners; load test at 2× expected Q1 traffic; results logged to IntelGraph as evidence.
   - _Tests:_ Bottlenecks identified with fixes or waivers.
3. **Incident Postmortem Auto‑Drafts (MC-IR-610)**
   - _AC:_ After rollback/incident, auto‑draft postmortem from run artifacts and logs; review workflow in CompanyOS.
   - _Tests:_ Two simulated incidents produce usable drafts.
4. **Archival & Retention Policies (IGRAPH-RET-620)**
   - _AC:_ Data lifecycle (hot/warm/archive) with retention by policy labels; export with watermarks.
   - _Tests:_ 3 retention scenarios pass; legal hold supported.
5. **Quarter Close Pack (OPS-QC-625)**
   - _AC:_ Board Brief (one‑pager + appendix), Roadmap Review, Disclosure Pack, audit exports; all decisions logged.
   - _Tests:_ Links to Maestro run IDs and IntelGraph entities verified.

### Milestones & Dates

- **M1 (Dec 18):** Multi‑region reads active; DR runbook published.
- **M2 (Dec 22):** Load tests complete; incident auto‑drafts functional.
- **M3 (Dec 27):** Archive/retention live; Quarter close pack approved.

### Release Gate (S6)

- [ ] DR failover meets RTO/RPO
- [ ] Load tests at 2× traffic logged with remediation/waivers
- [ ] Postmortem auto‑drafts enabled
- [ ] Archival/retention enforced
- [ ] Board Brief + Disclosure Pack completed

### Freeze & Hand‑Off

- **Holiday Freeze:** Dec 20–Jan 2 (prod changes blocked; emergency policy applies).
- **Hand‑Off:** On‑call + escalation matrix; Q1 entry criteria and seeded backlog.

---

## 21) Evidence Sync — Align with Existing Sprint Docs (from `/october2025`)

**Goal:** Ensure our Q4 cadence plan is consistent with your authored sprint briefs and that artifacts/fields line up. Parsed highlights incorporated:

- **IntelGraph — Sprint 22** (`intelgraph-sprint-2025-12-01_v1.0`, **Dec 1–Dec 12, 2025**): federation write‑sandbox, transactional rollback, policy feasibility checks, ZK batching/recursion prototype, Disclosure v1.2 viewer kit. → **Mapped to S5 IntelGraph** milestones (Analytics + perf) with addendum: **Federation write‑sandbox** and **Disclosure v1.2 viewer** as optional flags.
- **MC — Sprint Plan** (`mc-sprint-2025-12-08-v1`, **Dec 8–Dec 19, 2025**): Ops Console controlled actions (retry/replay/release) with step‑up auth, Evidence API v2 (on‑demand evidence materialization; presigned URLs), policy packs. → **Mapped to S5 MC** milestones (Promotions + Cost) with addendum: **Ops Console Controlled Actions v1** and **Evidence API v2**.
- **IntelGraph — 2025‑10‑06 Subtasks & Projects**: import‑ready _Subtasks Catalog_ for early sprint setup. → **Mapped to S1/S2 IntelGraph** stories (schema, provenance ingestion).

> **Result:** No date conflicts. Where your docs extend beyond Q4 (e.g., 2026 sprints), we captured as **seed backlog** for Q1’26.

### Field & Artifact Mapping

| Your Doc Field            | CompanyOS Template Field | IntelGraph Node/Edge            | Maestro Artifact             |
| ------------------------- | ------------------------ | ------------------------------- | ---------------------------- |
| **Slug**                  | Execution Order → `slug` | Claim: `claim.slug`             | Run label: `run.labels.slug` |
| **Dates**                 | `window.start/end`       | Decision: `decision.window`     | `run.window`                 |
| **Owner/DRI**             | `owner.dri`              | Entity(Person) → Decision.owner | `run.owners`                 |
| **Objectives/KRs**        | `okrs[]`                 | Claims (typed)                  | Evidence bundle: `okrs.json` |
| **Prereqs/Carry‑forward** | `dependencies[]`         | Edges: depends_on               | Pre‑checks stage             |
| **AC/Tests**              | `acceptance_criteria[]`  | Evidence: `tests/*.json`        | CI test reports              |
| **Release Train**         | `release.train`          | Claim: release_claim            | Run tag: `release:`          |

---

## 22) Import Plan — Lift Sprint Docs into CompanyOS/IntelGraph/MC

**Inputs:** Markdown briefs under `/october2025/*.md` (e.g., `intelgraph-sprint-2025-12-01_v1.0.md`, `mc-sprint-2025-12-08-v1.md`).

**Process (repeatable):**

1. **Parse** front‑matter style blocks (Slug/Dates/Owner/Teams) → create **CompanyOS Execution Order**.
2. **Generate Claims & Decision** in IntelGraph with policy labels (`origin`, `sensitivity`, `legal_basis`).
3. **Create Maestro Draft Run** with `run.window`, `budgets`, `labels.slug`, and attach source markdown as **evidence** (hash).
4. **Emit Disclosure Pack** stub linking original file hash + parser manifest.
5. **Backlink**: add deep links to CompanyOS doc (Decision/Run IDs) and store export with watermark.

**Validation:**

- Duplicate slugs rejected; hashes compared; parser emits manifest with counts and field coverage.
- All Decisions tagged with sprint window and workstream for Portfolio Review roll‑ups.

**Deliverables:**

- Imported **S1–S6 Execution Orders**, each with Decision + Run draft and Disclosure stub.
- **Evidence ledger**: sha256 of source docs stored in IntelGraph.

---

## 23) DRI & Roster Slots (Populate Names)

| Workstream            | DRI   | Deputies                   | Notes                               |
| --------------------- | ----- | -------------------------- | ----------------------------------- |
| CompanyOS             | _TBD_ | _TBD_ FE / _TBD_ BE        | Auth/ABAC, templates, billing       |
| Maestro Conductor     | _TBD_ | _TBD_ Platform / _TBD_ SRE | Canary, approvals, promotions, cost |
| IntelGraph            | _TBD_ | _TBD_ Schema / _TBD_ API   | Claims, provenance, ABAC, analytics |
| Security & Compliance | _TBD_ | _TBD_                      | SBOM/SLSA, DPIA, audits             |
| Platform/Infra        | _TBD_ | _TBD_                      | Multi‑region, DR                    |
| GTM/Partners          | _TBD_ | _TBD_                      | Sandbox, enablement                 |

> When names are provided, we’ll stamp them into all sprints (Owners tables) and into Execution Orders.

---

## 24) Conventions & CLI Stubs (for repeatability)

**Maestro CLI (stubs):**

```bash
summit run create \
  --slug "$SLUG" \
  --window "$START/$END" \
  --budgets cost=$COST,time=$TIME \
  --attach sbom=sbom.json --attach attestation=att.json \
  --label release:$TRAIN --label workstream:$WS

summit disclose create --run $RUN_ID --out dist/$SLUG.disclosure.tgz
```

**IntelGraph API (pseudo):**

```json
POST /v1/decision
{ "slug": "$SLUG", "window": {"start": "$START", "end": "$END"},
  "claims": [/* objectives as typed claims */],
  "evidence": [{"type": "file", "sha256": "$HASH", "origin": "$PATH"}],
  "policy_labels": {"origin": "internal", "sensitivity": "confidential", "legal_basis": "contract"}
}
```

**CompanyOS Template keys:** `owner.dri`, `teams[]`, `okrs[]`, `dependencies[]`, `acceptance_criteria[]`, `risk[]`, `checks[]`, `rollback[]`.

---

## 25) Seed Backlog (from Future‑dated Docs)

- **MC 2025‑12‑08 (Ops Console / Evidence API v2):** add as **S5** enh stories; spillover flagged to **S6** if late.
- **IntelGraph 2025‑12‑01 (Federation write‑sandbox, ZK batching):** optional S5 flags; **Q1’26** seed if risk to SLOs.
- **2026 sprints** in archive: parked to **Q1 grooming** board with links and hashes.

---

## 26) What’s Left to Make This Live

- Populate DRIs & team roster; plug into RACI tables.
- Approve **Import Plan** to pull the sprint docs into CompanyOS/IntelGraph/MC.
- Confirm canary policy (10%) and holiday freeze dates (Dec 20–Jan 2) — already reflected above.
- Kick off **Sprint 1** with Execution Order + demo rehearsal.
