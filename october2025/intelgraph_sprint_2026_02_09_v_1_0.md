# IntelGraph — Sprint 27 Plan (v1.0)

**Slug:** `intelgraph-sprint-2026-02-09_v1.0`  
**Dates:** Feb 9–Feb 20, 2026 (10 working days)  
**Cadence:** 2 weeks  
**Release Train:** `2026.02.r2` (flags default OFF → progressive enablement per cohort)  
**Teams:** Graph Core, Trust Fabric, Copilot/UX, Gov/Ops, QA/Release  
**Environments:** dev → stage → prod; ephemeral preview envs per PR

---

## 1) Sprint Goal
Complete **Tenant GA rollout** for multi‑region federation, make the **Predictive Suite GA call** and start measured rollout, ship **Case Spaces M9** (audience distribution analytics), launch **ZK Acceleration Pilot (if go)**, and stand up **Disclosure v1.7** (partner self‑serve attestation portal).

**Definition of Victory (DoV):**
- All targeted tenants enabled on **multi‑region writes** with residency compliance green; failover drill executed and signed off.
- Predictive **GA decision** recorded; canary cohort enabled with kill‑switch + health dashboards.
- Case M9 surfaces **distribution analytics** by audience/channel with export funnels and SLA alerts.
- ZK Acceleration **pilot** runs in stage/prod‑shadow with clear perf/$$ telemetry.
- Disclosure v1.7 portal lets partners **register viewers/attestations**, rotate keys, and download verify kits.

---

## 2) Scope (Must/Should/Won’t)
**Must**
- Federation Tenant GA rollout plan execution + final conformance suite; region residency proof bundles.
- Predictive GA: CI eval gate + scorecards enforced; canary rollout w/ rollback macros; governance reviews.
- Case Spaces M9: audience distribution analytics (press/court/partner/internal), funnel metrics, redaction continuity checks in analytics.
- ZK Accel Pilot: provision pilot nodes, wire perf counters, safety guardrails; update CI perf gate if go‑ahead confirmed.
- Disclosure v1.7: partner portal (auth, orgs, viewer registration, attestation uploads), audit & export.

**Should**
- Cost Model v2.1 (tenant GA steady‑state); predictive guardrail explainability polish.

**Won’t (this sprint)**
- Global predictive enablement beyond canary cohorts; GPU rollouts beyond pilot; disclosure mobile kits.

---

## 3) Sprint Backlog (Epics → Stories)

### Epic A — Federation **Tenant GA Rollout (Final Wave)**
**A1. Conformance Test Suite**  
- Residency + audit parity + conflict resolution checks per tenant/region. (5 pts)  
- *Acceptance:* Suite green for all targeted tenants; report archived.

**A2. Cutover & Failover Drills**  
- Execute playbook per cohort; measure RPO/RTO. (5 pts)  
- *Acceptance:* RPO=0, RTO≤10m; sign‑off captured.

**A3. Residency Proof Bundles**  
- Export tenant residency proofs (catalog IDs, plans, audits). (3 pts)  
- *Acceptance:* External replay PASS from either region.

### Epic B — Predictive **GA + Canary Rollout**
**B1. GA Decision & Rubric Check**  
- Apply rubric; record decision; remediation if blocked. (3 pts)

**B2. Canary Enablement**  
- Enable cohort; traffic split; kill‑switch macros; dashboards. (5 pts)

**B3. Guardrail Telemetry & Explainability**  
- Expand denial explainer corpus; add guardrail event stream to governance board. (3 pts)

### Epic C — Case Spaces **M9 (Distribution Analytics)**
**C1. Audience Analytics**  
- Metrics by channel (reach, open, verify, revocation events); time‑series. (5 pts)

**C2. Export Funnel & SLA**  
- Steps from draft→approval→publish→verify; SLA alerts. (5 pts)

**C3. Redaction Continuity Checks in Analytics**  
- Detect rule continuity breaks across versions; highlight risky narratives. (3 pts)

### Epic D — ZK **Acceleration Pilot**
**D1. Pilot Nodes Provisioning** (5 pts) — provision GPU/SIMD nodes; isolate via flags.

**D2. Perf/$$ Telemetry** (5 pts) — per‑proof latency, throughput, p95, cost per proof; dashboards.

**D3. Safety Guardrails** (3 pts) — fallback to CPU on anomaly; alerting + rollback.

### Epic E — Disclosure **v1.7 (Self‑Serve Partner Attestation)**
**E1. Partner Portal** (5 pts) — org onboarding, viewer registration, key rotation UI, role‑based access.

**E2. Attestation Upload & Validation** (3 pts) — signed SBOM + build attestations; verify + store.

**E3. Verify Kit Distribution** (2 pts) — download links, hashes, versioning; audit events.

> **Sprint Point Budget:** 74 pts (Graph Core 23, Trust Fabric 25, Copilot/UX 10, Gov/Ops 11, QA/Release 5).  
> **Capacity Check:** Rolling velocity ~75±8 pts; green.

---

## 4) Swimlanes & Working Agreements
**Swimlanes**
- *Gov/Ops:* conformance suite, cutover/failover, residency proofs
- *Trust Fabric:* ZK pilot nodes, perf telemetry, guardrails, disclosure portal validation
- *Graph Core:* audience analytics, export funnel, redaction continuity analytics
- *Copilot/UX:* explainers expansion, portal UX, governance dashboards
- *QA/Release:* tenant conformance, canary health, pilot rollback drills

**Working Agreements**
- No tenant enablement without **conformance suite PASS**.  
- Predictive canary requires **kill‑switch demo** and dashboard live.  
- ZK pilot runs behind flags; CPU fallback must be proved in stage.

---

## 5) Ceremonies & Calendar
- **Planning:** Mon Feb 9, 90m.  
- **Stand‑ups:** 9:30–9:40 MT daily.  
- **Grooming:** Wed Feb 11 (45m), Fri Feb 13 (30m).  
- **Mid‑Sprint Demo & Risk:** Tue Feb 17 (30m).  
- **Failover Drill (stage):** Thu Feb 19 (20m).  
- **Review + Demo:** Fri Feb 20 (60m).  
- **Retro:** Fri Feb 20 (30m).

---

## 6) Definition of Ready (DoR)
- Story ≤8 pts; flags defined; tenants/cohorts enumerated; datasets curated; dashboards prepared; privacy notes attached.

## 7) Definition of Done (DoD)
- Tests ≥ 90%; tenant GA complete for target list; predictive canary live with dashboards; audience analytics shipped; ZK pilot telemetry captured + rollback verified; v1.7 portal operational; docs/runbooks updated; release notes drafted.

---

## 8) Test Plan & Fixtures
- **Federation:** region replay PASS; RPO/RTO drill; residency report integrity.  
- **Predictive:** CI eval gate PASS; canary metrics; kill‑switch dry‑run; guardrail explainers sample.  
- **Case M9:** analytics accuracy vs logs; funnel SLA alerts; redaction continuity flags.  
- **ZK Pilot:** GPU/SIMD vs CPU comparisons; anomaly rollback; p95 tracking.  
- **Disclosure:** portal authZ tests; attestation verification; kit hash validation.

---

## 9) Metrics & Telemetry (Sprint)
- **Federation:** tenants enabled, conformance PASS rate, failover RPO/RTO.  
- **Predictive:** canary adoption, guardrail incidents, rollback count.  
- **Case Ops:** distribution metrics by channel, funnel step times, redaction continuity incidents.  
- **Trust:** ZK pilot p95, throughput, cost/proof; portal attest verifies.  
- **Reliability/Cost:** error budget burn, residency & pilot cost deltas.

---

## 10) Risks & Mitigations
- **Tenant variability** → cohort staging, dark‑launch, targeted backouts.  
- **Predictive drift surprises** → conservative thresholds, rapid rollback, live guardrails.  
- **GPU instability** → isolation, watchdogs, automatic CPU fallback.  
- **Partner portal abuse** → RBAC, rate limits, audit trails, manual approval queue.

---

## 11) Deliverables (Artifacts)
- `docs/` → Tenant GA conformance pack; Predictive GA decision record; M9 analytics spec; ZK Pilot runbook; Portal admin guide.  
- Dashboards: Federation (conformance/failover), Predictive (canary/guardrails), Case Ops (distribution/funnel), Trust (pilot perf), Reliability/Cost.  
- Runbooks: “Tenant Enablement”, “Predictive Kill‑Switch”, “ZK Pilot Ops”, “Partner Portal Ops”.

---

## 12) Jira Scaffolds & Labels
**Epics:** `EPIC-FED-TENANT-GA-FINAL`, `EPIC-PREDICTIVE-GA-CANARY`, `EPIC-CASE-M9`, `EPIC-ZK-ACCEL-PILOT`, `EPIC-DISCLOSURE-1.7`  
**Labels:** `tenant-ga`, `predictive-ga`, `distribution-analytics`, `zk-accel`, `partner-portal`, `residency`  
**Components:** `graph-core`, `trust-fabric`, `gov-ops`, `ux-copilot`, `qa-release`

**Issue Template (user story)**
```md
As a <role>, I want <capability>, so that <verifiable outcome>.
Acceptance:
- [ ] Behavior criteria…
- [ ] Residency/Policy hooks verified…
- [ ] Canary/Guardrails validated (if predictive)…
- [ ] Telemetry events emitted…
```

---

## 13) API Sketches
```http
GET  /residency/proof/bundle?tenantId=...
POST /predict/canary/enable { cohort, split }
GET  /analytics/distribution?channel=press|court|partner|internal
GET  /zk/pilot/metrics { window }
POST /portal/partner/register { org, keys }
```

---

## 14) Out‑of‑Scope + Next Sprint Seeds (S28)
- Predictive full GA rollout (post‑canary).  
- ZK accel **production** rollout plan (if pilot passes).  
- Case M10: distribution insights → optimization suggestions.  
- Disclosure v1.8: mobile verify kits.  
- Residency conformance audits with third‑party.

---

## 15) Versioning & Change Log
- **v1.0 (2025‑09‑29)** — Initial S27 sprint plan drafted for planning review.

> Owner: PM — Sprint 27  
> Approvers: Eng Lead (Trust Fabric), Eng Lead (Graph Core), UX Lead, Gov/Ops Lead

