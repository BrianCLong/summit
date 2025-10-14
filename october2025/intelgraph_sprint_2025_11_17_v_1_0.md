# IntelGraph — Sprint 21 Plan (v1.0)

**Slug:** `intelgraph-sprint-2025-11-17_v1.0`  
**Dates:** Nov 17–Nov 28, 2025 (10 working days; **US holiday impact Nov 27**)  
**Cadence:** 2 weeks  
**Release Train:** `2025.12.r1` (flags default OFF; staged progressive rollout)  
**Teams:** Graph Core, Trust Fabric, Copilot/UX, Gov/Ops, QA/Release  
**Environments:** dev → stage → prod; ephemeral preview envs per PR

---

## 1) Sprint Goal
Operationalize **federated analysis** and **evidence lifecycle** while piloting **governed compute**:
- **Federation Planner Pilot (Exec Sandbox RO)** with two connectors (Snowflake, Postgres) executing read‑only push‑downs with cost guardrails.
- **ZK‑TX Pilot (governed fields)** for proof‑of‑access without data exposure on a narrow column set.
- **Case Spaces M3** adds **timelines**, **evidence linking**, and **advanced approvals**.
- Harden **Disclosure Packager v1.1** with freshness beacons and partial revocation.

**Definition of Victory (DoV):**
- At least **3 sample federated queries** execute via sandbox with **policy feasibility annotations** and **push‑down cost ≤ planned threshold**.
- **ZK‑TX pilot** produces verifiable proof for an access event; replayable by external verifier.
- Case timelines render with **evidence-to-finding links**; advanced approvals enforce **2‑step + role condition** for exports.
- Disclosure v1.1 bundles **invalidate** on partial revocation; beacon freshness < 5 min on stage.

---

## 2) Scope (Must/Should/Won’t)
**Must**
- Federation Sandbox: connector adapters (Snowflake, Postgres), RO plan executor, policy feasibility hooks, cost caps.
- ZK‑TX Pilot: limited proof circuit over governed field access; verifier stub; policy gate integration.
- Case Spaces M3: timelines, evidence linking (artifact graph), advanced approvals (conditions), audit of decisions.
- Disclosure Packager v1.1: partial revocation list, freshness beacon signer, viewer enforcement.

**Should**
- Copilot: “Why this plan?” explainer (plan + cost + policy) and “Link evidence” assistant flow.
- Ops: rollout cookbook for connectors; staging data sanitization playbook.

**Won’t (this sprint)**
- Write‑enabled federation; broad ZK circuits; predictive suite GA.

---

## 3) Sprint Backlog (Epics → Stories)

### Epic A — Federation Planner **Pilot (Exec Sandbox, RO)**
**A1. Connector Adapters (Snowflake, Postgres)**
- Implement metadata discovery, auth, push‑down subset (projection, filter, join). (8 pts)
- Acceptance: metadata cache warm; auth via vault; push‑down confirmed in logs.

**A2. RO Executor + Cost Guardrails**
- Execute read‑only plan; capture scan estimates; enforce cost ceiling per query. (8 pts)
- Acceptance: 3 plans executed with cost < ceiling; over‑ceiling → blocked + rationale.

**A3. Policy Feasibility Annotations**
- Call LAC for feasibility; mark plan nodes with allow/deny and reasons. (5 pts)
- Acceptance: blocked nodes highlighted; appeal path offered.

**A4. Stage Demo Scenarios**
- Author 3 scenarios (investigations, compliance, public data join). (3 pts)
- Acceptance: demo scripts reproducible; screenshots archived.

### Epic B — ZK‑TX **Pilot (Governed Fields)**
**B1. Minimal Circuit & Prover**
- Circuit validates access under policy without revealing value; Groth16/PLONK pick; sample dataset. (8 pts)
- Acceptance: proof verifies in ≤300ms on stage; invalid access fails.

**B2. Verifier Service + PCQ Hook**
- Wrap verifier; emit PCQ entry tying proof to manifest. (5 pts)
- Acceptance: manifest includes `zk_proof_id`; replay passes.

**B3. Integration with LAC Gate**
- LAC policy requires ZK proof for governed columns; denial without proof. (3 pts)
- Acceptance: unsafe path blocked; reason cites ZK requirement.

### Epic C — Case Spaces **M3**
**C1. Timelines View**
- Chronological case activity; filters; collapse; export to PDF. (5 pts)
- Acceptance: p95 render < 180ms @ stage; export legible.

**C2. Evidence Linking (Artifact Graph)**
- Link evidence → findings → disclosures; integrity checks; back‑references. (8 pts)
- Acceptance: broken link detection; graph export JSON.

**C3. Advanced Approvals**
- Conditional approvals (role, sensitivity, jurisdiction); templated rules. (5 pts)
- Acceptance: rules evaluated by LAC; audit trail persisted.

### Epic D — Disclosure Packager **v1.1**
**D1. Partial Revocation Lists** (3 pts) — revoke subset of artifacts; viewer honors list.  
**D2. Freshness Beacons** (3 pts) — signed beacon endpoint; cache TTL; viewer enforcement.  
**D3. Viewer Hardening** (3 pts) — offline warnings; integrity prompts.

### Epic E — Copilot/UX Glue
**E1. Plan Explainer** (3 pts) — Why this plan? (policy + cost + source breakdown).  
**E2. Evidence‑Link Helper** (2 pts) — suggest related artifacts to link into findings.

> **Sprint Point Budget:** 76 pts (Graph Core 24, Trust Fabric 26, Copilot/UX 10, Gov/Ops 11, QA/Release 5).  
> **Capacity Check:** **Holiday‑adjusted** capacity ~72±6 pts; amber.

---

## 4) Swimlanes & Working Agreements
**Swimlanes**
- *Trust Fabric:* ZK‑TX pilot, PCQ hook, policy feasibility annotations
- *Gov/Ops:* federation adapters, RO executor, cost guards, disclosure beacons
- *Graph Core:* timelines, evidence graph, advanced approvals
- *Copilot/UX:* plan explainer, evidence‑link helper
- *QA/Release:* scenario scripts, replay proofs, cost gates

**Working Agreements**
- Federation connections use **read‑only service accounts**, scoped to demo schemas.
- Any governed column access MUST include ZK proof in `pcq` manifest.
- Connector secrets managed via **vault**; no secrets in env files.

---

## 5) Ceremonies & Calendar
- **Planning:** Mon Nov 17, 90m.  
- **Stand‑ups:** 9:30–9:40 MT daily.  
- **Grooming:** Wed Nov 19 (45m), Mon Nov 24 (30m).  
- **Mid‑Sprint Demo & Risk:** Tue Nov 25 (30m).  
- **Holiday:** Thu Nov 27 (US).  
- **Review + Demo:** Fri Nov 28 (60m).  
- **Retro:** Fri Nov 28 (30m).

---

## 6) Definition of Ready (DoR)
- Story ≤8 pts; flags named; fixtures; privacy notes; connector access; demo data sanitized; dashboards updated.

## 7) Definition of Done (DoD)
- Tests ≥ 90%; federation plans execute under cost ceiling; ZK proofs verified and recorded; timelines/evidence links shipped; disclosure v1.1 enforced; docs/runbooks updated; release notes drafted.

---

## 8) Test Plan & Fixtures
- **Federation:** metadata discovery, push‑down proof (EXPLAIN), cost cap negative test.
- **ZK‑TX:** valid/invalid access proofs; perf SLA; manifest linkage.
- **Case M3:** timeline filters; link integrity; conditional approvals.
- **Disclosure v1.1:** partial revocation honored; beacon TTL; offline behavior.
- **Chaos:** connector outage; cost overrun; proof verifier timeout.

---

## 9) Metrics & Telemetry (Sprint)
- **Federation:** % push‑down, cost overrun blocks, plan success rate.  
- **Trust:** proofs verified, proof latency, verifier error rate.  
- **Case Ops:** evidence links per case, approval cycle time.  
- **Reliability/Cost:** error budget burn, query cost delta vs estimate.

---

## 10) Risks & Mitigations
- **Connector throttling / egress cost** → set ceilings; backoff; sampled previews.  
- **ZK perf spikes** → pre‑compile proving keys; cache CRS; limit domain.  
- **Approval rule complexity** → start with templates; add linting.  
- **Beacon service outage** → soft‑fail with warning; disallow high‑sensitivity opens.

---

## 11) Deliverables (Artifacts)
- `docs/` → Federation Pilot guide; ZK‑TX Pilot spec; Case M3 UX; Disclosure 1.1 notes.  
- Dashboards: Federation (push‑down, cost), Trust (ZK verify), Case Ops (approvals), Reliability.  
- Runbooks: “Connector Onboarding”, “ZK Proof Ops”, “Disclosure Beacon Ops”.

---

## 12) Jira Scaffolds & Labels
**Epics:** `EPIC-FED-PILOT`, `EPIC-ZKTX-PILOT`, `EPIC-CASE-M3`, `EPIC-DISCLOSURE-1.1`, `EPIC-COPILOT-GLUE`  
**Labels:** `federation-ro`, `connector`, `zk-tx`, `pcq`, `case-space`, `disclosure-v1.1`, `cost-guard`  
**Components:** `graph-core`, `trust-fabric`, `gov-ops`, `ux-copilot`, `qa-release`

**Issue Template (user story)**
```md
As a <role>, I want <capability>, so that <verifiable outcome>.
Acceptance:
- [ ] Behavior criteria…
- [ ] PCQ/LAC/ZK hooks verified…
- [ ] Cost caps honored…
- [ ] Telemetry events emitted…
```

---

## 13) API Sketches
```http
POST /federation/execute { planId, ceiling, dryRun }
POST /zk/prove { columnId, policyId, nonce }
POST /zk/verify { proofId }
POST /case/{id}/link { artifactId, relation }
POST /export/{id}/beacon/check { bundleId }
```

---

## 14) Out‑of‑Scope + Next Sprint Seeds (S22)
- Federation write path (sandboxed mutations).  
- ZK proof batching + recursion experiments.  
- Case M4: timelines → storyboards, redaction workflows.  
- Disclosure v1.2: client‑side verification kits.

---

## 15) Versioning & Change Log
- **v1.0 (2025‑09‑29)** — Initial S21 sprint plan drafted for planning review.

> Owner: PM — Sprint 21  
> Approvers: Eng Lead (Trust Fabric), Eng Lead (Graph Core), UX Lead, Gov/Ops Lead

