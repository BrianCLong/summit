# IntelGraph — Sprint 24 Plan (v1.0)

**Slug:** `intelgraph-sprint-2025-12-29_v1.0`  
**Dates:** Dec 29, 2025 – Jan 9, 2026 (**US holiday Jan 1**)  
**Cadence:** 2 weeks (holiday‑impacted)  
**Release Train:** `2026.01.r2` (flags default OFF; phased rollout)  
**Teams:** Graph Core, Trust Fabric, Copilot/UX, Gov/Ops, QA/Release  
**Environments:** dev → stage → prod; ephemeral preview envs per PR

---

## 1) Sprint Goal
Scale to **multi‑region reliability** and finalize **governed compute**: deliver **Federation Multi‑Region Write (Pilot)**, **ZK Recursion GA** with stability/perf SLOs, **Case Spaces M6** (narrative drafting assist + review flows), **Predictive Drift Detectors**, and **Disclosure v1.4** with cross‑chain anchoring.

**Definition of Victory (DoV):**
- Multi‑region write path meets **RPO=0, RTO≤10m** for sandboxed mutations with **consistent audit** across regions.
- ZK Recursion GA verifies within **p95 ≤ 400ms** aggregate; determinism suite green across x86/ARM.
- Case M6 drafts **narratives from evidence graph** with tracked revisions and reviewer sign‑off.
- Predictive detectors flag **feature drift** and freeze unsafe rankers; governance panel logs decisions.
- Disclosure v1.4 bundle verifies against **dual anchors (PKI + public chain)** offline.

---

## 2) Scope (Must/Should/Won’t)
**Must**
- Federation multi‑region write pilot (active‑active), conflict resolution policy, latency budgets, audit merge.
- ZK recursion GA: fixed CRS mgmt, cross‑arch reproducibility, perf tuning, side‑channel audit close‑out.
- Case Spaces M6: narrative drafting assistant, reviewer workflow, revision history with diffs.
- Predictive drift detectors: feature distribution monitoring, guardrail triggers, rollback.
- Disclosure v1.4: cross‑chain anchoring (e.g., PKI + Ethereum testnet), viewer verification path.

**Should**
- Cost Model v1.4 (multi‑region egress + retries); pack marketplace publishing checklist.

**Won’t (this sprint)**
- Write GA beyond pilot tenants; recursion hardware acceleration; predictive GA; mobile disclosure kits.

---

## 3) Sprint Backlog (Epics → Stories)

### Epic A — Federation **Multi‑Region Write (Pilot)**
**A1. Replication Topology & Latency Budgets**  
- Configure active‑active for demo schemas; define p95 latency budgets; health gates. (8 pts)  
- *Acceptance:* p95 write ≤ 250ms intra‑region; ≤ 700ms x‑region; dashboards wired.

**A2. Conflict Resolution Policy**  
- Deterministic merges (LWW + domain rules); compensating actions catalog per conflict type. (8 pts)  
- *Acceptance:* Simulated conflicts resolve per policy; audit shows before/after.

**A3. Audit Merge & Consistency**  
- Merge audit streams from regions; dedupe/idempotency; tenant‑scoped bundles. (5 pts)  
- *Acceptance:* External replay against either region produces identical PASS.

**A4. Failure Drills (RPO/RTO)**  
- Region failover exercise; measure RPO/RTO; playbook updates. (5 pts)  
- *Acceptance:* RPO=0, RTO≤10m achieved on stage.

### Epic B — ZK Recursion **GA**
**B1. CRS & Key Management**  
- Secure CRS handling; rotation; attestation in PCQ manifest. (5 pts)  
- *Acceptance:* CRS change logged; proofs remain verifiable; manifest links.

**B2. Perf & Determinism Tuning**  
- Cache strategies; constant‑time hotspots; cross‑arch tolerance doc. (5 pts)  
- *Acceptance:* p95 verify ≤ 400ms; 100× repeatability PASS.

**B3. Side‑Channel Closure**  
- Final checklist sign‑off; tests for timing/memory leakage; alerts. (3 pts)  
- *Acceptance:* No regressions; alerts green for 24h soak.

### Epic C — Case Spaces **M6**
**C1. Narrative Drafting Assistant**  
- Generate draft sections from evidence graph; citations & provenance; templated styles. (8 pts)  
- *Acceptance:* Draft meets style guide; reviewer edits tracked.

**C2. Reviewer Workflow**  
- Assign reviewers; change requests; sign‑off gates; export only after approval. (5 pts)  
- *Acceptance:* Export blocked until approvals complete; audit trail.

**C3. Revision History & Diffs**  
- Versioned narratives; side‑by‑side diffs; comment threads. (3 pts)  
- *Acceptance:* Diff export PDF; broken link detector on citations.

### Epic D — Predictive **Drift Detectors**
**D1. Feature Distribution Monitoring** (5 pts) — PSI/KS tests per feature; thresholds.  
**D2. Guardrail Triggers & Rollback** (3 pts) — freeze unsafe rankers; auto flag flip; notification.  
**D3. Governance Panel Hooks** (2 pts) — override notes; audit export.

### Epic E — Disclosure **v1.4 (Cross‑Chain Anchors)**
**E1. Anchor Writer** (5 pts) — write anchor to PKI + public chain; capture tx refs.  
**E2. Viewer Verify Path** (3 pts) — offline verify against both anchors; UX prompts.  
**E3. Rotation & Revocation** (2 pts) — rotate keys/anchors; registry update + docs.

> **Sprint Point Budget:** **70 pts** (holiday‑adjusted: Graph Core 22, Trust Fabric 23, Copilot/UX 10, Gov/Ops 10, QA/Release 5).  
> **Capacity Check:** Reduced due to New Year’s Day; amber‑green.

---

## 4) Swimlanes & Working Agreements
**Swimlanes**
- *Trust Fabric:* recursion GA, CRS/key mgmt, side‑channel close‑out
- *Gov/Ops:* multi‑region replication, conflicts, audit merge, RPO/RTO drills
- *Graph Core:* narrative assistant, reviewer workflow, revisions
- *Copilot/UX:* drift dashboards, reviewer UX, cross‑chain verify UX
- *QA/Release:* failover drills, soak tests, audit replay

**Working Agreements**
- Region failover drills scheduled and recorded; no risky merges within 2h before drills.
- Exports require reviewer sign‑off + provenance intact; broken links fail build.
- Any drift freeze must include rollback note and governance approval.

---

## 5) Ceremonies & Calendar
- **Planning:** Mon Dec 29, 90m.  
- **Stand‑ups:** 9:30–9:40 MT daily.  
- **Grooming:** Wed Dec 31 (30m), Tue Jan 6 (45m).  
- **Holiday:** Thu Jan 1 (US).  
- **Mid‑Sprint Demo & Risk:** Wed Jan 7 (30m).  
- **RPO/RTO Drill:** Thu Jan 8 (20m).  
- **Review + Demo:** Fri Jan 9 (60m).  
- **Retro:** Fri Jan 9 (30m).

---

## 6) Definition of Ready (DoR)
- Story ≤8 pts; fixtures named; flags defined; region topology documented; privacy notes; dashboards updated.

## 7) Definition of Done (DoD)
- Tests ≥ 90%; multi‑region write pilot SLOs met; recursion GA perf/determinism verified; narrative assistant + reviewer flow shipped; drift guards operational; v1.4 anchors verify; docs/runbooks updated; release notes drafted.

---

## 8) Test Plan & Fixtures
- **Federation:** latency budgets, conflict resolution golden cases, RPO/RTO drill.  
- **ZK:** 100× determinism; cross‑arch verify; perf p95; side‑channel audit.  
- **Case M6:** draft quality spot‑checks; reviewer sign‑off gates; diff exports.  
- **Predictive:** synthetic drift injections; auto freeze; rollback.  
- **Disclosure:** dual‑anchor verify offline; rotation + revocation tests.

---

## 9) Metrics & Telemetry (Sprint)
- **Federation:** p95 write intra/x‑region, conflicts resolved, failover RPO/RTO.  
- **Trust:** verify p95, determinism rate, side‑channel alerts.  
- **Case Ops:** draft → approval cycle time, diff churn, export success rate.  
- **Predictive:** drift alerts, time‑to‑freeze, rollback latency.  
- **Reliability/Cost:** error budget burn, multi‑region cost delta.

---

## 10) Risks & Mitigations
- **X‑region latency spikes** → queue with backpressure; degrade to single‑region writes temporarily.  
- **Conflict policy gaps** → domain rule table; manual review queue.  
- **Recursion perf regressions** → perf gate in CI; revert to batched proofs.  
- **Cross‑chain anchor instability** → cache confirmations; dual‑anchor acceptance policy.

---

## 11) Deliverables (Artifacts)
- `docs/` → Multi‑region write pilot, Conflict Policy, CRS/Key Mgmt, Case M6 UX, Drift Detector SOP, Disclosure v1.4 notes.  
- Dashboards: Federation (latency/conflicts/RPO-RTO), Trust (verify), Case Ops (approvals), Predictive (drift), Reliability/Cost.  
- Runbooks: “Failover Drill”, “Conflict Resolution Ops”, “CRS Rotation”, “Narrative Review”, “Drift Freeze/Unfreeze”, “Cross‑Chain Verify”.

---

## 12) Jira Scaffolds & Labels
**Epics:** `EPIC-FED-MULTIREGION-PILOT`, `EPIC-ZK-RECURSION-GA`, `EPIC-CASE-M6`, `EPIC-PREDICTIVE-DRIFT`, `EPIC-DISCLOSURE-1.4`  
**Labels:** `federation-mr`, `zk-recursion`, `case-space`, `narrative-assist`, `drift-detect`, `disclosure-v1.4`, `cost-model`  
**Components:** `graph-core`, `trust-fabric`, `gov-ops`, `ux-copilot`, `qa-release`

**Issue Template (user story)**
```md
As a <role>, I want <capability>, so that <verifiable outcome>.
Acceptance:
- [ ] Behavior criteria…
- [ ] PCQ/LAC/ZK hooks verified…
- [ ] Multi‑region SLOs honored…
- [ ] Telemetry events emitted…
```

---

## 13) API Sketches
```http
POST /federation/mr/config { regions[], budgets }
POST /federation/mr/resolve { conflictId, policy }
POST /zk/recursion/attest { crsId, manifestId }
POST /case/{id}/narrative/draft { templateId }
POST /predict/drift/simulate { feature, delta }
POST /disclosure/anchor/verify { bundleId }
```

---

## 14) Out‑of‑Scope + Next Sprint Seeds (S25)
- Federation multi‑region **tenant GA**; durability and data residency policies.  
- Recursion hardware acceleration experiments; proof streaming.  
- Case M7: cross‑case narratives, timeline merge.  
- Predictive: offline eval harness v2; governance scorecards.  
- Disclosure v1.5: attested viewers for partners.

---

## 15) Versioning & Change Log
- **v1.0 (2025‑09‑29)** — Initial S24 sprint plan drafted for planning review.

> Owner: PM — Sprint 24  
> Approvers: Eng Lead (Trust Fabric), Eng Lead (Graph Core), UX Lead, Gov/Ops Lead

