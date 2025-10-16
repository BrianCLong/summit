# IntelGraph — Sprint 25 Plan (v1.0)

**Slug:** `intelgraph-sprint-2026-01-12_v1.0`  
**Dates:** Jan 12–Jan 23, 2026 (10 working days)  
**Cadence:** 2 weeks  
**Release Train:** `2026.01.r3` (flags default OFF; progressive rollout)  
**Teams:** Graph Core, Trust Fabric, Copilot/UX, Gov/Ops, QA/Release  
**Environments:** dev → stage → prod; ephemeral preview envs per PR

---

## 1) Sprint Goal

Graduate **multi‑region federation** to **Tenant GA**, harden **predictive safety** to **Beta**, and advance **evidence narrative** capabilities. Close the loop on **ZK recursion perf options** and **Disclosure v1.5** partner viewer attestation.

**Definition of Victory (DoV):**

- **Multi‑region writes** meet tenant SLOs (p95 intra‑region ≤ 250ms; cross‑region ≤ 700ms) with **residency policies** enforced and **tenant GA runbook** approved.
- **Predictive Beta**: offline eval harness v2 in place; drift/guardrail integration; governance scorecards shipped.
- **Case Spaces M7**: cross‑case narrative merge + timeline stitching; approval flow supports multi‑reviewer templates.
- **ZK recursion** hardware experiment report with go/no‑go rec; CI perf gate set.
- **Disclosure v1.5**: partner viewer attestation with signed build manifest; verify path documented.

---

## 2) Scope (Must/Should/Won’t)

**Must**

- Federation Multi‑Region **Tenant GA**: residency policy engine, tenant routing, durability SLOs, audit parity bundles, failover drill.
- Predictive **Offline Eval Harness v2**: dataset curation, temporal splits, governance checks, regression suite.
- Governance **Scorecards**: per‑feature risk/usage, overrides, explainers quality.
- Case Spaces **M7**: cross‑case narrative merge, stitched timelines, reviewer templates, export diffs.
- ZK Recursion **HW Options**: SIMD/GPU/accelerator exploration; perf/$$ analysis; CI perf gate.
- Disclosure **v1.5**: attested viewer for partners (signed SBOM, build attestation), dual‑anchor verify retained.

**Should**

- Cost Model v1.5: multi‑region + residency + write retries; budget dashboards.
- Policy Pack marketplace **publishing checklist** and moderation SOP.

**Won’t (this sprint)**

- Global GA for all tenants (pilot cohorts only); predictive GA; mobile disclosure kits.

---

## 3) Sprint Backlog (Epics → Stories)

### Epic A — Federation **Multi‑Region Tenant GA**

**A1. Residency Policy Engine**

- Policy to keep data and writes within region/jurisdiction; routing + denial messages. (8 pts)
- _Acceptance:_ Residency rule evaluated on plan; cross‑region write blocked unless exception; audit cites policy.

**A2. Tenant Routing & Cutover**

- Route tenants to primary region; blue/green cutover; health checks. (5 pts)
- _Acceptance:_ Cutover playbook validated; zero data loss; dashboard green.

**A3. Durability SLOs & Audit Parity**

- RPO=0/RTO≤10m retained; merged audit bundles per tenant/region. (5 pts)
- _Acceptance:_ External replay PASS from either region; failover drill sign‑off.

**A4. Residency‑Aware Cost Guards**

- Egress cost projections; cap enforcement; override with 4‑eyes. (3 pts)
- _Acceptance:_ Over‑cap blocked; override audited.

### Epic B — Predictive **Safety Beta**

**B1. Offline Eval Harness v2**

- Temporal splits; k‑fold; fairness slices; policy whitelist; golden datasets. (8 pts)
- _Acceptance:_ Eval report generated per model; governance checks pass/fail surfaced.

**B2. Guardrail Integration**

- Drift detectors + denial explainers + freeze on fail; rollback macro. (5 pts)
- _Acceptance:_ Synthetic drift triggers freeze; rollback succeeds; audit trail present.

**B3. Governance Scorecards**

- Per‑feature contribution, policy risk, overrides; PDF export. (3 pts)
- _Acceptance:_ Scorecard attached to release review; thresholds configurable.

### Epic C — Case Spaces **M7**

**C1. Cross‑Case Narrative Merge**

- Merge narratives across cases; conflict resolution; provenance preserved. (8 pts)
- _Acceptance:_ Merge diff visible; broken link detector clean.

**C2. Timeline Stitching**

- Multi‑source timelines into single view; gap indicators; export. (5 pts)
- _Acceptance:_ Stitch accuracy validated on fixtures; export passes.

**C3. Reviewer Templates**

- Multi‑reviewer patterns (legal/comms/ops); SLA per stage; sign‑off gates. (3 pts)
- _Acceptance:_ Export blocked until template satisfied; audit logged.

### Epic D — ZK Recursion **HW Options**

**D1. SIMD/GPU Exploration** (5 pts) — prototype with available libs; benchmark.  
**D2. $$ / Perf Analysis** (3 pts) — perf per $; infra profile; recommendation.  
**D3. CI Perf Gate** (2 pts) — enforce p95 verify ≤ 380ms on stage.

### Epic E — Disclosure **v1.5 (Partner Viewer Attestation)**

**E1. Build Attestation + SBOM** (5 pts) — signed SBOM; supply‑chain attest; bundle link.  
**E2. Viewer Verify UX** (3 pts) — show attestation status; offline guidance.  
**E3. Partner Onboarding Kit** (2 pts) — docs, keys, rotation guide.

> **Sprint Point Budget:** 76 pts (Graph Core 24, Trust Fabric 26, Copilot/UX 10, Gov/Ops 11, QA/Release 5).  
> **Capacity Check:** Rolling velocity ~75±8 pts; green.

---

## 4) Swimlanes & Working Agreements

**Swimlanes**

- _Trust Fabric:_ ZK perf options, CI gates, disclosure attestation
- _Gov/Ops:_ residency engine, tenant routing, durability SLOs, cost guards
- _Graph Core:_ cross‑case narrative merge, stitching, reviewer templates
- _Copilot/UX:_ scorecards view, verify UX, denial explainers
- _QA/Release:_ failover drills, eval harness checks, governance scorecards

**Working Agreements**

- Residency rules must be **visible** in denial messages and exports.
- Predictive changes require **offline eval report** + scorecard before enabling.
- Narrative merges cannot proceed with **broken evidence links**.

---

## 5) Ceremonies & Calendar

- **Planning:** Mon Jan 12, 90m.
- **Stand‑ups:** 9:30–9:40 MT daily.
- **Grooming:** Wed Jan 14 (45m), Fri Jan 16 (30m).
- **Mid‑Sprint Demo & Risk:** Tue Jan 20 (30m).
- **Failover Drill (stage):** Thu Jan 22 (20m).
- **Review + Demo:** Fri Jan 23 (60m).
- **Retro:** Fri Jan 23 (30m).

---

## 6) Definition of Ready (DoR)

- Story ≤8 pts; fixtures named; flags defined; residency policies specified; datasets curated; dashboards updated.

## 7) Definition of Done (DoD)

- Tests ≥ 90%; tenant GA drill PASS; offline eval v2 reports attached; scorecards reviewed; CI perf gate met; viewer attestation verifies; docs/runbooks updated; release notes drafted.

---

## 8) Test Plan & Fixtures

- **Federation:** residency deny/allow; cutover rehearsal; failover RPO/RTO; egress cap block.
- **Predictive:** eval reports on temporal splits; drift freeze + rollback; scorecard export.
- **Case M7:** merge diff correctness; stitched timeline export; reviewer template gates.
- **ZK:** GPU/SIMD benchmarks; CI gate enforcement.
- **Disclosure:** attested viewer verify offline; SBOM linkage; partner kit walkthrough.

---

## 9) Metrics & Telemetry (Sprint)

- **Federation:** residency blocks, cutover success, failover RPO/RTO, egress over‑cap blocks.
- **Predictive:** eval coverage %, drift alerts, freeze/rollback count.
- **Case Ops:** merge conflicts resolved, stitched export success, review SLA adherence.
- **Trust:** verify p95 (CI), attestation checks green.
- **Reliability/Cost:** error budget burn, multi‑region cost delta vs budget.

---

## 10) Risks & Mitigations

- **Residency policy gaps** → start with curated policy packs; add lint rules; manual reviewer step.
- **Eval harness brittleness** → snapshot datasets; deterministic seeds; CI smoke.
- **GPU/SIMD portability** → feature flags; CPU fallback.
- **Partner viewer distrust** → signed SBOM + attestation; clear UX.

---

## 11) Deliverables (Artifacts)

- `docs/` → Residency Engine spec; Cutover & Failover runbook; Eval Harness v2; Governance Scorecards guide; Narrative Merge/Stitch UX; ZK HW Perf report; Disclosure v1.5 partner kit.
- Dashboards: Federation (residency/failover), Predictive (eval/drift), Case Ops (merge/review), Trust (CI verify), Cost.
- Runbooks: “Residency Rules Ops”, “Tenant Cutover”, “Offline Eval v2”, “Scorecards Review”, “Attested Viewer Verify”.

---

## 12) Jira Scaffolds & Labels

**Epics:** `EPIC-FED-MR-TENANT-GA`, `EPIC-PREDICTIVE-SAFETY-BETA`, `EPIC-CASE-M7`, `EPIC-ZK-HW-OPTIONS`, `EPIC-DISCLOSURE-1.5`  
**Labels:** `federation-mr`, `residency`, `predictive-eval`, `governance-scorecard`, `case-space`, `zk-perf`, `disclosure-v1.5`  
**Components:** `graph-core`, `trust-fabric`, `gov-ops`, `ux-copilot`, `qa-release`

**Issue Template (user story)**

```md
As a <role>, I want <capability>, so that <verifiable outcome>.
Acceptance:

- [ ] Behavior criteria…
- [ ] Residency/Policy hooks verified…
- [ ] Eval/Scorecard attached (if predictive)…
- [ ] Telemetry events emitted…
```

---

## 13) API Sketches

```http
POST /residency/evaluate { plan, tenantId }
POST /tenants/{id}/cutover { region, mode }
POST /predict/eval/run { modelId, datasetId, splits }
GET  /predict/scorecard/{modelId}
POST /case/narrative/merge { caseIds[] }
POST /zk/verify/benchmark { mode }
GET  /viewer/attestation/status
```

---

## 14) Out‑of‑Scope + Next Sprint Seeds (S26)

- Federation **global GA** with data‑residency policy catalogs by jurisdiction.
- Predictive **GA** decision after Beta readout; panelization.
- Case M8: narrative publishing + change management.
- ZK accel integration plan (if go).
- Disclosure v1.6: partner attestation federation.

---

## 15) Versioning & Change Log

- **v1.0 (2025‑09‑29)** — Initial S25 sprint plan drafted for planning review.

> Owner: PM — Sprint 25  
> Approvers: Eng Lead (Trust Fabric), Eng Lead (Graph Core), UX Lead, Gov/Ops Lead
