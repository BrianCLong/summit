# IntelGraph — Sprint 26 Plan (v1.0)

**Slug:** `intelgraph-sprint-2026-01-26_v1.0`  
**Dates:** Jan 26–Feb 6, 2026 (10 working days)  
**Cadence:** 2 weeks  
**Release Train:** `2026.02.r1` (flags default OFF; progressive rollout)  
**Teams:** Graph Core, Trust Fabric, Copilot/UX, Gov/Ops, QA/Release  
**Environments:** dev → stage → prod; ephemeral preview envs per PR

---

## 1) Sprint Goal
Move from pilot cohorts to **global readiness**: ship **Federation Global GA Readiness (Residency Catalog + Guarded Cutover)**, make the **Predictive Suite GA decision** with guardrails, land **Case Spaces M8** (publishable narratives + change management), finalize **ZK Acceleration Plan** (SIMD/GPU) and deliver **Disclosure v1.6** (partner attestation federation + notarization rotation).

**Definition of Victory (DoV):**
- Residency **policy catalog** (jurisdictions/tenants) is queryable; global cutover playbook validated on stage.
- Predictive **GA gate** (eval, drift, governance scorecards) passed or blocked with clear remediation actions; feature flags wired.
- Case M8: **publish** narrative packages to audiences with staged approvals and **change‑management logs**.
- ZK acceleration **go/no‑go** decision with benchmark data and cost model; perf CI gate updated.
- Disclosure v1.6: **partner attestation federation** (multiple issuers) and **anchor rotation** procedures in viewer.

---

## 2) Scope (Must/Should/Won’t)
**Must**
- Federation Global GA Readiness: residency policy **catalog & resolver**, guarded **global cutover** rehearsal, data residency reports.
- Predictive GA Decision: **Eval harness v2** integration in CI, **risk scorecards**, GA rubric & checklist, rollout plan with kill‑switch.
- Case Spaces M8: narrative **publishing**, **change review** (draft→pending→published), audience channels, redaction continuity.
- ZK Acceleration Plan: GPU/SIMD **benchmark matrix**, perf/$$ **TCO report**, CI perf gate update.
- Disclosure v1.6: multi‑issuer **attestation federation**, **anchor/key rotation**, partner registry updates.

**Should**
- Cost Model v2.0 (region + residency + writes + ZK accel knobs); governance dashboards refresh.

**Won’t (this sprint)**
- Multi‑region GA for all tenants (launch staged), predictive wide‑open GA (until decision), production GPU rollout.

---

## 3) Sprint Backlog (Epics → Stories)

### Epic A — Federation **Global GA Readiness**
**A1. Residency Policy Catalog & Resolver**  
- Policy catalog by jurisdiction (US‑Fed, US‑State, EU, UK, CA, AU, etc.); resolver API; docs. (8 pts)  
- *Acceptance:* Resolver returns authoritative policy set per tenant/query; audit references catalog IDs.

**A2. Guarded Global Cutover Rehearsal**  
- Simulated global cutover (stage): region routing, health gates, backout. (8 pts)  
- *Acceptance:* Rehearsal meets RPO=0/RTO≤10m; backout playbook validated.

**A3. Residency Reports & Alerts**  
- Periodic residency compliance report; out‑of‑policy alerts; export bundle. (5 pts)  
- *Acceptance:* Report covers last 7/30 days; alert fires on violation.

### Epic B — Predictive **GA Decision Gate**
**B1. CI Eval Harness Integration**  
- Wire offline eval v2 into CI for each candidate model; temporal splits + fairness slices. (5 pts)  
- *Acceptance:* CI fails on threshold miss; artifacts stored with run IDs.

**B2. Governance Scorecards (GA Rubric)**  
- Rubric thresholds (accuracy/variance/drift/guardrail incidents); sign‑off workflow. (5 pts)  
- *Acceptance:* Scorecard is required on enable; denial explains which threshold failed.

**B3. Rollout Plan + Kill‑Switch**  
- Progressive rollout plan; kill‑switch and auto‑rollback macros. (3 pts)  
- *Acceptance:* Dry‑run shows traffic split & rollback; dashboards ready.

### Epic C — Case Spaces **M8** (Publish & Change Management)
**C1. Narrative Publishing & Channels**  
- Publish narrative to **Press/Court/Partner/Internal** channels; watermarking; version stamp. (8 pts)  
- *Acceptance:* Published artifact validates, channel‑specific redactions applied.

**C2. Change Review Workflow**  
- Draft→Pending→Published; reviewers & sign‑offs; diff‑based approvals. (5 pts)  
- *Acceptance:* Export blocked until approvals complete; change log retained.

**C3. Redaction Continuity**  
- Ensure redaction rules survive revisions; rule hash continuity. (3 pts)  
- *Acceptance:* Viewer rejects if rule continuity broken.

### Epic D — ZK **Acceleration Plan (SIMD/GPU)**
**D1. Benchmark Matrix**  
- Benchmarks across CPU/SIMD/GPU for governed proof circuits; stage dataset. (5 pts)  
- *Acceptance:* Matrix published; reproducible runs with seeds.

**D2. TCO & Perf Recommendation**  
- Perf per $; provisioning model; ops footprint; go/no‑go with phases. (5 pts)  
- *Acceptance:* Recommendation doc approved by TF + Ops.

**D3. CI Perf Gate Update**  
- Update verify p95 thresholds if acceleration chosen; fallback if not. (3 pts)  
- *Acceptance:* CI gates reflect decision; pass on stage.

### Epic E — Disclosure **v1.6 (Federated Attestation)**
**E1. Multi‑Issuer Attestation** (5 pts) — support multiple trusted issuers; trust store mgmt.  
**E2. Anchor/Key Rotation** (3 pts) — rotation flow; viewer prompts & recovery.  
**E3. Partner Registry** (2 pts) — registry of partner viewers/issuers; audit export.

> **Sprint Point Budget:** 76 pts (Graph Core 24, Trust Fabric 26, Copilot/UX 10, Gov/Ops 11, QA/Release 5).  
> **Capacity Check:** Rolling velocity ~75±8 pts; green.

---

## 4) Swimlanes & Working Agreements
**Swimlanes**
- *Gov/Ops:* residency catalog, cutover rehearsal, reports/alerts
- *Trust Fabric:* ZK accel benchmarks, CI perf gates, disclosure federation
- *Graph Core:* narrative publishing, change review, redaction continuity
- *Copilot/UX:* predictive GA scorecards UI, publisher UX, viewer rotation prompts
- *QA/Release:* cutover rehearsal, eval‑in‑CI checks, publish/change workflows

**Working Agreements**
- No global enablement without **cutover rehearsal PASS** + residency reports green.
- Predictive enablement requires **scorecard PASS** + kill‑switch validated.
- Published narratives must include **provenance & redaction hashes**.

---

## 5) Ceremonies & Calendar
- **Planning:** Mon Jan 26, 90m.  
- **Stand‑ups:** 9:30–9:40 MT daily.  
- **Grooming:** Wed Jan 28 (45m), Fri Jan 30 (30m).  
- **Mid‑Sprint Demo & Risk:** Tue Feb 3 (30m).  
- **Cutover Rehearsal (stage):** Thu Feb 5 (30m).  
- **Review + Demo:** Fri Feb 6 (60m).  
- **Retro:** Fri Feb 6 (30m).

---

## 6) Definition of Ready (DoR)
- Story ≤8 pts; flags defined; datasets & thresholds; residency policies enumerated; publisher templates; dashboards updated.

## 7) Definition of Done (DoD)
- Tests ≥ 90%; residency catalog live; cutover rehearsal PASS; predictive GA decision logged; narrative publish/change flows shipped; ZK accel plan approved; v1.6 federation verified; docs/runbooks updated; release notes drafted.

---

## 8) Test Plan & Fixtures
- **Federation:** resolver accuracy; cutover rehearsal metrics; residency report generation.  
- **Predictive:** CI eval gate fail/pass tests; kill‑switch dry‑run; scorecard thresholds.  
- **Case M8:** publish per channel; diff approvals; redaction continuity negative.  
- **ZK:** benchmark reproducibility; CI gate update; fallback path.  
- **Disclosure:** multi‑issuer trust; key rotation prompts; partner registry export.

---

## 9) Metrics & Telemetry (Sprint)
- **Federation:** cutover rehearsal RPO/RTO, residency violations (target 0), report latency.  
- **Predictive:** CI eval coverage %, gate fail rate, kill‑switch drill time.  
- **Case Ops:** publish throughput, approval SLA adherence, redaction continuity incidents.  
- **Trust:** verify p95 vs gate, accel decision status.  
- **Reliability/Cost:** error budget burn, residency + accel cost deltas.

---

## 10) Risks & Mitigations
- **Jurisdiction policy gaps** → start with catalog seeds; manual overrides; linting.  
- **Predictive false GA** → conservative thresholds; canary; rapid rollback.  
- **Benchmark bias** → standard seeds; fixed datasets; peer review.  
- **Multi‑issuer trust drift** → trust store rotation SOP; alerts.

---

## 11) Deliverables (Artifacts)
- `docs/` → Residency Catalog/Resolver spec; Global Cutover Playbook; Predictive GA Rubric; Publisher UX; ZK Accel Bench & TCO; Disclosure v1.6 federation notes.  
- Dashboards: Federation (residency/cutover), Predictive (CI eval/gates), Case Ops (publish/change), Trust (verify p95), Reliability/Cost.  
- Runbooks: “Global Cutover”, “Predictive Kill‑Switch”, “Publisher Workflow”, “Trust Store Rotation”.

---

## 12) Jira Scaffolds & Labels
**Epics:** `EPIC-FED-GLOBAL-GA`, `EPIC-PREDICTIVE-GA-GATE`, `EPIC-CASE-M8`, `EPIC-ZK-ACCEL-PLAN`, `EPIC-DISCLOSURE-1.6`  
**Labels:** `residency-catalog`, `global-cutover`, `predictive-ga`, `publisher`, `zk-accel`, `disclosure-v1.6`  
**Components:** `graph-core`, `trust-fabric`, `gov-ops`, `ux-copilot`, `qa-release`

**Issue Template (user story)**
```md
As a <role>, I want <capability>, so that <verifiable outcome>.
Acceptance:
- [ ] Behavior criteria…
- [ ] Residency/Policy hooks verified…
- [ ] GA/Scorecard gates satisfied (if predictive)…
- [ ] Telemetry events emitted…
```

---

## 13) API Sketches
```http
GET  /residency/catalog { jurisdiction }
POST /cutover/rehearse { tenants[], primaryRegion }
POST /predict/ga/enable { modelId, rollout }
POST /case/narrative/publish { channel, version }
GET  /zk/accel/benchmarks
POST /viewer/trust/rotate { issuerId }
```

---

## 14) Out‑of‑Scope + Next Sprint Seeds (S27)
- Federation **tenant GA** final wave; region data‑residency conformance test suite.  
- Predictive GA rollout canary + monitoring; model registry v2.  
- Case M9: multi‑audience distribution analytics.  
- ZK accel proof‑of‑value pilot (if go).  
- Disclosure v1.7: partner self‑serve attestation portal.

---

## 15) Versioning & Change Log
- **v1.0 (2025‑09‑29)** — Initial S26 sprint plan drafted for planning review.

> Owner: PM — Sprint 26  
> Approvers: Eng Lead (Trust Fabric), Eng Lead (Graph Core), UX Lead, Gov/Ops Lead

