# 🚀 Workstream Packet — Product Ops • Trust Fabric (PCQ • LAC • ZK‑TX)
**Cadence:** 2‑week sprint (Jan 19–Jan 30, 2026)
**Ordinal:** Sprint 08 (v1.2 scope)
**Role:** Product Operations / Program & Scrum Mastery (Elara Voss)
**Aligned Streams:** Graph Core, Copilot/XAI, Security & Governance, DevEx/Tooling, Infra/SRE, Partner Success, Compliance/Legal

---

## 0) TL;DR
Execute the **PSI spike** and scale partner throughput while deepening author safety and provenance insight:
1) **ZK‑TX v1.3**: implement **PSI/PSI‑CA prototype** for overlap with selective disclosure; extend batch planner to **500 RPS** target; privacy & policy review baked in.
2) **LAC v1.2**: **auto‑remediation PRs** on drift, **impact insights** (who/what/why) for authors, and **play‑nice** policies for shared tenants.
3) **PCQ v1.8**: **streaming provenance** (long jobs), **alert correlation** with sampler, and **tenant health report**.

Ops: multi‑tenant fairness guarantees, quota shaping, **game‑day** with partner sandbox, and upgrade notes for v1.2.

---

## 1) Inputs & Carry‑Ins
- Sprint 07 shipped v1.1: cross‑runtime checks, auto‑triage, policy bundles + blast radius, batch planner + SDK parity, PSI ADR.
- Carry‑ins: finalize backfill tail (<15%); refine triage classifier thresholds; expand red‑team to 500 cases.

---

## 2) Sprint Goal & Non‑Negotiables
**Goal:**
> “Prove PSI safely, raise throughput ceiling, and make policy evolution self‑healing—without compromising SLOs, fairness, or auditability.”

**DoD (Sprint 08):**
- ZK‑TX PSI/PSI‑CA prototype implemented behind feature flag; **privacy/legal sign‑off** for sandbox; **500 RPS** sustained in perf rig with p95 < 900ms & error < 0.2%.
- LAC auto‑remediation PRs created on drift; author impact insights live in Studio; shared‑tenant ‘play‑nice’ rules enforced.
- PCQ streaming provenance available for long‑running jobs; alert correlation reduces **false‑positive pages** to ≤0.8%; tenant health report published.
- Ops: fairness monitors + quota shaping validated; partner game‑day executed; v1.2 upgrade notes drafted.

---

## 3) OKRs (This Sprint)
- **O1: PSI Safety & Throughput**  
  **KR1.1** PSI prototype passes privacy/policy checklist; no raw selector logging; **sandbox acceptance** signed.  
  **KR1.2** Batch planner + PSI path sustain **500 RPS** (30‑min soak), p95 < 900ms, error < 0.2%.
- **O2: Self‑Healing Policy Lifecycle**  
  **KR2.1** 90% of drift events generate **auto‑PRs** that restore parity; human time‑to‑fix **< 30 min** median.  
  **KR2.2** Author insights reduce promotion reverts by **25%** vs last sprint.
- **O3: Provenance at Runtime**  
  **KR3.1** 95% of long jobs emit **streamed manifests**; sampler alerts correlated to job lineage cut **false pages to ≤0.8%**.  
  **KR3.2** Tenant health report delivered weekly to 100% stakeholders.
- **O4: Fairness & Reliability**  
  **KR4.1** Gini for per‑tenant throughput **≤ 0.18** under load; no SLO breaches in game‑day.  
  **KR4.2** v1.2 upgrade notes & runbooks complete; step‑load test passes.

---

## 4) Scope — Epics & Stories
### Epic AB — ZK‑TX v1.3 (PSI + 500 RPS)
- **AB1. PSI/PSI‑CA Prototype**  
  *Stories:* implement PSI/PSI‑CA flow with blinded set commitments; selective‑disclosure of meta only; feature flag & quotas.  
  *AC:* sandbox run completes; logs show no raw selectors; privacy/legal checklist signed.
- **AB2. Batch Planner to 500 RPS**  
  *Stories:* adaptive grouping, cache warming, quota‑aware bursts, back‑pressure.  
  *AC:* 500 RPS x 30 min, p95 <900ms, error <0.2%; fairness unchanged.
- **AB3. Partner Game‑Day**  
  *Stories:* simulate skews, appeals, and quota contention with sandbox partners; capture playbacks.  
  *AC:* drill report with timings & mitigations; appeal SLA met.

### Epic AC — LAC v1.2 (Auto‑Remediate + Insights + Shared Tenants)
- **AC1. Auto‑Remediation PRs**  
  *Stories:* when drift detected across envs, synthesize PR with policy diffs & tests; require approval.  
  *AC:* ≥90% drift incidents create PR within 5 min; merge restores parity.
- **AC2. Author Impact Insights**  
  *Stories:* preview shows affected users/datasets/costs; historical revert risk; copy review.  
  *AC:* revert rate −25%; SUS ≥ 82.
- **AC3. Play‑Nice Policies**  
  *Stories:* rate fairness, residency respect, shared resource quotas encoded as policy; telemetry.  
  *AC:* fairness Gini ≤ 0.18; violations alert with actionable reason.

### Epic AD — PCQ v1.8 (Streaming + Correlation + Health)
- **AD1. Streaming Provenance**  
  *Stories:* chunked manifest emission for long jobs; inclusion proof at end; resume on retry.  
  *AC:* 95% of long jobs stream; replay reconstructs final manifest.
- **AD2. Alert Correlation**  
  *Stories:* bind sampler alerts to job lineage (code/image/policy versions); dedupe heuristics.  
  *AC:* false‑positive pages ≤0.8%; MTTA < 10m in drill.
- **AD3. Tenant Health Report**  
  *Stories:* weekly digest: verifier pass rate, policy blocks, ZK proofs, SLO burn; per‑tenant view.  
  *AC:* emailed/slacked to owners; snapshot archived.

### Epic AE — Ops/DevEx (Fairness, Quotas, Upgrade)
- **AE1. Quota Shaping & Fairness Guards**  
  *Stories:* token buckets per tenant, burst credits, fairness dashboards; emergency caps.  
  *AC:* Gini ≤ 0.18 under 500 RPS load.
- **AE2. Game‑Day & Runbooks**  
  *Stories:* chaos + network jitter + spike; playbooks for appeals/quota bumps.  
  *AC:* no SLO breach; postmortem published.
- **AE3. v1.2 Enablement**  
  *Stories:* upgrade notes, config diffs, SDK deltas; demo script refresh.  
  *AC:* guide reviewed; step‑load passes.

---

## 5) Day‑by‑Day Plan
**W1 Mon–Tue**  
- PSI prototype scaffolding; batch planner tuning beyond 360 RPS; drift auto‑PR generator.  
**W1 Wed–Thu**  
- Streaming provenance pipeline; author impact insights; quota shaping skeleton; privacy checklist draft.  
**W1 Fri**  
- Perf rig @ 420–480 RPS; alert correlation MVP; partner game‑day plan.

**W2 Mon–Tue**  
- PSI sandbox run + legal review; hit 500 RPS; fairness dashboards; Studio UX polish.  
**W2 Wed–Thu**  
- Game‑day execution; tenant health report automation; v1.2 upgrade notes; incident drill.  
**W2 Fri**  
- Freeze v1.2 scope; publish artifacts; retro; backlog seed for Sprint 09.

---

## 6) RACI
| Area | Driver (R) | Approver (A) | Consulted (C) | Informed (I) |
|---|---|---|---|---|
| PSI prototype & review | Security Lead | CTO | Legal, Policy | Partners |
| Batch planner 500 RPS | Security Lead | CTO | SRE | All |
| Auto‑PR & insights | Platform Eng Lead | Security Lead | PM, Data Gov | All |
| Streaming provenance | DevEx Lead | Chief Architect | SRE, Analytics | All |
| Fairness & quotas | SRE Lead | CTO | Security, Finance Eng | All |
| Game‑day & enablement | PM (Elara) | CTO | SRE, Legal, Partners | All |

---

## 7) Ceremonies & Cadence
- **Daily Stand‑up:** 10:05–10:20 MT  
- **Change Windows:** Tue/Thu 13:00–14:00 MT  
- **Game‑Day:** Thu Jan 29, 14:00 MT  
- **Review/Demo:** Fri Jan 30, 11:30 MT  
- **Retro:** Fri Jan 30, 15:30 MT

---

## 8) Backlog — Sprint 08 (Committed)
**ZK‑TX**  
- [ ] PSI/PSI‑CA prototype + checklist sign‑off.  
- [ ] Batch planner 500 RPS; fairness steady.  
- [ ] Partner game‑day executed.

**LAC**  
- [ ] Auto‑remediation PRs; author insights; play‑nice policies.  

**PCQ**  
- [ ] Streaming provenance; alert correlation; tenant health report.  

**Ops/DevEx**  
- [ ] Quota shaping; fairness dashboards; v1.2 upgrade notes; runbooks + drill.

---

## 9) Acceptance Packs
- **PSI Evidence:** privacy/policy checklist, sandbox logs (scrubbed), perf report @ 500 RPS.  
- **Policy Evidence:** drift auto‑PRs; insights screenshots; revert‑rate delta.  
- **Provenance Evidence:** streaming manifests; correlation impact stats; tenant reports.  
- **Ops Evidence:** game‑day postmortem; fairness Gini; upgrade notes PDF.

---

## 10) Test Strategy
- **Unit/Contract:** PSI message formats, selective disclosure checks, quota tokens, PR generator.  
- **E2E:** plan→policy→execute→streamed manifests→verify→alert correlation; PSI overlap→batch verify→audit.  
- **Perf:** step load to 500 RPS; fairness stability; Studio insights latency.  
- **Security:** PSI leakage attempts, quota abuse, auto‑PR spoof guards.

---

## 11) Risks & Mitigations
- **S8.1: PSI perf shortfall.** → Fallback to standard proofs; pre‑warm caches; limit PSI to narrow scopes.  
- **S8.2: Auto‑PR creates churn.** → Require approval; rate‑limit; batch small diffs.  
- **S8.3: Streaming provenance overloads storage.** → Chunk retention policy; compression; roll‑ups.

---

## 12) Release Notes (Planned v1.2)
- ZK‑TX: PSI/PSI‑CA prototype (sandbox‑approved), batch planner to 500 RPS, fairness guarantees.  
- LAC: auto‑remediation PRs, author impact insights, shared‑tenant policies.  
- PCQ: streaming provenance, alert correlation, tenant health.

---

## 13) Templates & Scaffolding
- `zk-tx/psi/spec.md`  
- `zk-tx/perf/rig-500rps.md`  
- `lac/promotions/auto-remediation-pr.md`  
- `lac/studio/insights/README.md`  
- `pcq/streaming/manifest-format.md`  
- `ops/fairness/dashboards.json`  
- `ops/gameday/runbook.md`  
- `release/v1.2/upgrade-notes.md`

— **End of Workstream Packet (Sprint 08 • v1.2)** —

