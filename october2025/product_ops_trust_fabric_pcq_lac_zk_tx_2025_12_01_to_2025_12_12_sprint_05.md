# 🚀 Workstream Packet — Product Ops • Trust Fabric (PCQ • LAC • ZK‑TX)

**Cadence:** 2‑week sprint (Dec 1–Dec 12, 2025)  
**Ordinal:** Sprint 05 (workstream‑scoped) — **GA Cut**  
**Role:** Product Operations / Program & Scrum Mastery (Elara Voss)  
**Streams aligned:** Graph Core, Copilot/XAI, Security & Governance, DevEx/Tooling, Infra/SRE, Partner Success, Compliance

---

## 0) TL;DR

Promote **v0.4 RC → v1.0 GA** with operational hardening, compliance evidence, and partner‑ready packaging:

1. **PCQ v1.5**: fleet‑wide continuous verification, **tenant‑scoped transparency views**, incident playbooks, SLA.
2. **LAC v1.0 GA**: policy studio finalized, **graph‑aware guardrails default‑on**, drift‑free promotions, **change‑risk scoring**.
3. **ZK‑TX v1.0**: GA endpoints, partner **evidence bundles v1.0**, billing/quotas, appeal SLA; **GA contracts** ready.

Ops: **GA release checklist** executed; SLOs & error budgets frozen; **one‑click demo** polished; docs & runbooks signed.

---

## 1) Closeouts & Carry‑Ins

**From Sprint 04:** continuous verification (sampled), transparency log, Policy Studio + drift guards, dual pilots with bundles, demo env, SOC/ISO packet v0.9.  
**Carry‑ins:** finalize Tier‑2 minimization coverage; tune canary comparator thresholds from on‑call drill.

---

## 2) Sprint Goal & Non‑Negotiables

**Goal:**

> “Ship **Trust Fabric v1.0 GA**: verifiable analytics, enforced policies, and partner‑safe ZK proofs—operational, observable, and auditable.”

**DoD (GA):**

- PCQ: sampled replays **≥8%** prod jobs/day; **tenant transparency portal**; incident playbooks; SLA docs published.
- LAC: Studio **1.0** (lint, types, previews, diffs), **default‑on** graph constraints (component size/path/degree), drift‑free promotions across envs, change‑risk scores in release notes.
- ZK‑TX: **v1 GA** API & quotas; billing hooks; partner evidence bundles v1.0; **appeal SLA ≤ 24h**.
- Ops/Compliance: GA release checklist signed; SOC/ISO packet **v1.0**; docs/runbooks complete; one‑click demo < 10m.

---

## 3) OKRs (This Sprint)

- **O1: Continuous Integrity at Scale**  
  **KR1.1** PCQ sampling **≥8%** without breaching SLOs; false‑positive pages **<1%**.  
  **KR1.2** Transparency portal loads **<800ms p95**; inclusion proofs verified in CI.
- **O2: Policy Safety & Velocity**  
  **KR2.1** 100% policies linted/typed; **Zero FN** on 350‑case red‑team; FP **≤2%**.  
  **KR2.2** Change‑risk scoring enabled with **low/med/high** bands; rollout notes include risk & rollback.
- **O3: Partner‑Grade ZK GA**  
  **KR3.1** GA endpoints stable at **300 RPS**, p95 **<900ms**, error **<0.2%**.  
  **KR3.2** Evidence bundles v1.0 signed; **two partner sign‑offs** for GA.
- **O4: Readiness & Enablement**  
  **KR4.1** GA checklist 100% complete; SOC/ISO v1.0 submitted; all runbooks approved by Security/SRE.  
  **KR4.2** One‑click demo **< 10m** from zero; docs portal live with task‑based guides.

---

## 4) Scope — Epics & Stories

### Epic P — PCQ v1.5 (Fleet + Portal + Playbooks)

- **P1. Sampler to 8% + SLO Guard**  
  _Stories:_ adaptive sampling; SLO‑aware throttling; change window scheduler.  
  _AC:_ ≥8% coverage; no SLO breach in one‑week soak.
- **P2. Tenant Transparency Portal**  
  _Stories:_ per‑tenant view of witnessed runs, inclusion proofs, deltas; export CSV/JSON.  
  _AC:_ p95 <800ms; access controlled; inclusion proofs verifiable.
- **P3. Incident Playbooks & SLA**  
  _Stories:_ delta triage, rollback, data quarantine; on‑call runbooks; SLA document.  
  _AC:_ drill passes; MTTA < 10m; artifacts published.

### Epic Q — LAC v1.0 (Default‑On + Risk Scoring)

- **Q1. Default‑On Graph Constraints**  
  _Stories:_ enforce size/path/degree on Tier‑1/2; suppression exceptions with approvals.  
  _AC:_ red‑team 350 cases: 0 FN, ≤2% FP.
- **Q2. Policy Studio 1.0 GA**  
  _Stories:_ UX polish; type docs; previews/diffs; author templates; telemetry.  
  _AC:_ SUS ≥ 82; 10/10 authors complete tasks < 8 min.
- **Q3. Change‑Risk Scoring**  
  _Stories:_ historical impact model; risk badge in promotions; rollback hooks.  
  _AC:_ risk appears in release notes; audit links preserved.

### Epic R — ZK‑TX v1.0 (GA Packaging)

- **R1. GA API & Quotas**  
  _Stories:_ rate fairness; per‑tenant quotas; back‑pressure; error taxonomy.  
  _AC:_ 300 RPS p95 <900ms; error <0.2%; fairness dashboards.
- **R2. Evidence Bundle v1.0**  
  _Stories:_ proofs, witness envelopes, config, checksums; legal review; partner export.  
  _AC:_ bundles signed; partners accept.
- **R3. Billing & Metrics Hooks**  
  _Stories:_ per‑proof metering; usage exports; cost dashboards.  
  _AC:_ billable events validated; monthly report generated.

### Epic S — Ops/Compliance (GA Readiness)

- **S1. GA Release Checklist**  
  _Stories:_ pen test sign‑off, DR replay, cost guardrails, owner acknowledgments.  
  _AC:_ checklist 100%; signatures collected.
- **S2. SOC/ISO v1.0 Submission**  
  _Stories:_ map controls to artifacts; screenshots, logs, attestations; gap log closed.  
  _AC:_ packet delivered; acceptance from Security.
- **S3. Enablement & Docs**  
  _Stories:_ task‑based guides; demo scripts; FAQ; runbooks finalized.  
  _AC:_ docs portal live; links from UI.

---

## 5) Day‑by‑Day Plan

**W1 Mon–Tue**

- Raise sampler to 6%; portal skeleton; Policy Studio polish; GA API quotas scaffold.  
  **W1 Wed–Thu**
- Portal inclusion proofs + exports; default‑on constraints; red‑team expand to 350; evidence bundle v1.0 draft.  
  **W1 Fri**
- On‑call drill; change‑risk scoring; billing hooks; GA checklist pass #1.

**W2 Mon–Tue**

- Sampler to 8%; SLO guard tuning; Studio SUS study; partner bundle review.  
  **W2 Wed–Thu**
- Perf soak @ 300 RPS; fairness dashboards; SOC/ISO packet v1.0; runbooks final.  
  **W2 Fri**
- Tag v1.0 GA; release notes; recorded demo; retro + backlog seed for v1.1.

---

## 6) RACI

| Area               | Driver (R)        | Approver (A)    | Consulted (C)        | Informed (I) |
| ------------------ | ----------------- | --------------- | -------------------- | ------------ |
| PCQ fleet & portal | DevEx Lead        | Chief Architect | SRE, Analytics       | All          |
| Incident playbooks | SRE Lead          | CTO             | Security, PM         | All          |
| LAC default‑on     | Platform Eng Lead | Security Lead   | Data Gov, Graph Core | All          |
| Risk scoring       | Platform Eng      | PM              | Security, Legal      | All          |
| ZK GA + bundles    | Security Lead     | CTO             | Partners, Legal, SRE | All          |
| Billing hooks      | Finance Eng Lead  | CTO             | PM, Security         | All          |
| Compliance packet  | PM (Elara)        | CTO             | Security, SRE, Legal | All          |

---

## 7) Ceremonies & Cadence

- **Daily Stand‑up:** 10:05–10:20 MT
- **Change Windows:** Tue/Thu 13:00–14:00 MT
- **On‑call Drill:** Wed Dec 10, 14:00 MT
- **Review/Demo (GA):** Fri Dec 12, 11:30 MT
- **Retro:** Fri Dec 12, 15:30 MT

---

## 8) Backlog — Sprint 05 (Committed)

**PCQ**

- [ ] Sampler ≥8%; SLO guard; portal p95 <800ms.
- [ ] Incident playbooks; SLA docs.
- [ ] Inclusion proofs exported per tenant.

**LAC**

- [ ] Default‑on graph constraints Tier‑1/2.
- [ ] Policy Studio 1.0 GA; SUS ≥ 82.
- [ ] Change‑risk scoring in promotions.

**ZK‑TX**

- [ ] GA API + quotas; fairness dashboards.
- [ ] Evidence bundle v1.0 signed by partners.
- [ ] Billing hooks + usage exports.

**Ops/Compliance**

- [ ] GA checklist 100%; sign‑offs collected.
- [ ] SOC/ISO v1.0 submitted; acceptance logged.
- [ ] One‑click demo <10m; docs portal live.

---

## 9) Acceptance Packs

- **PCQ:** coverage graphs; portal screenshots; incident drill logs; SLA PDF.
- **LAC:** lint/type reports; red‑team results; risk scoring notes in release.
- **ZK:** perf/fairness dashboards; signed evidence bundles; billing export.
- **Ops/Compliance:** GA checklist with signatures; SOC/ISO packet receipt; demo recording.

---

## 10) Test Strategy

- **Unit/Contract:** sampler logic; inclusion proofs; risk score calc; quota enforcement; billing events.
- **E2E:** prod sample→replay→witness→portal→alert; policy author→preview→promote→enforce; partner proof→bundle→billing.
- **Perf:** portal p95; GA endpoints 300 RPS; sampler overhead.
- **Security:** portal access controls; policy bypass attempts; evidence tamper tests.

---

## 11) Architecture Deltas

- Add **tenant transparency portal** backed by transparency log + ledger.
- Policy registry emits **risk scoring** in promotions.
- ZK‑TX exposes **GA endpoints** with quotas + billing events.

---

## 12) Risks & Mitigations

- **V1: Portal access scoping errors.** → Strict RBAC, audits, tests; emergency kill switch.
- **V2: Default‑on constraints block critical jobs.** → Exception workflow with time‑boxed approvals + rollback.
- **V3: Billing event mismatches.** → Reconciliation job; canary billing; partner review.

---

## 13) Metrics & Dashboards (Targets)

- **PCQ:** ≥8% sampled; p95 portal <800ms; false alarms <1%.
- **LAC:** 0 FN; ≤2% FP; SUS ≥82; risk badges on 100% promotions.
- **ZK‑TX:** 300 RPS; p95 <900ms; error <0.2%; 2 partner sign‑offs.
- **Ops:** GA checklist done; SOC/ISO v1.0 accepted; demo <10m.

---

## 14) Release Notes (Planned v1.0 GA)

- PCQ: fleet sampling + tenant portal + incident playbooks/SLA.
- LAC: default‑on graph constraints; Studio 1.0; risk scoring.
- ZK‑TX: GA API, quotas, billing; evidence bundles v1.0.
- Ops: GA checklist, SOC/ISO v1.0, polished one‑click demo.

---

## 15) Communication Plan

- **GA announcement** with highlights and SLOs.
- **Policy Studio 1.0** launch note with author guide.
- **Partner GA memo** with evidence bundle + support channels.
- **Ops bulletin** summarizing on‑call playbooks and drill outcomes.

---

## 16) Templates & Scaffolding (Included)

- `pcq/portal/README.md`
- `pcq/ops/incident-playbooks.md` + SLA
- `lac/studio/authoring-guide.md`
- `lac/promotions/risk-scoring.md`
- `zk-tx/ga/api.yaml` + `billing/events.md`
- `compliance/GA-checklist.md` + `SOC-ISO-v1.0.md`

— **End of Workstream Packet (Sprint 05 • GA)** —
