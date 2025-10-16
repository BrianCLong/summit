# IntelGraph — Sprint 20 Plan (v1.0)

**Slug:** `intelgraph-sprint-2025-11-03_v1.0`  
**Dates:** Nov 3–Nov 14, 2025 (10 working days)  
**Cadence:** 2 weeks  
**Release Train:** `2025.11.r2` (progressive rollout; flags default OFF)  
**Teams:** Graph Core, Trust Fabric, Copilot/UX, Gov/Ops, QA/Release  
**Environments:** dev → stage → prod; ephemeral preview envs per PR

---

## 1) Sprint Goal

Reach **GA readiness** for the trust stack and collaboration core: ship **PCA GA** (remote attestation + provenance model cards), **LAC GA** (policy packs stable + marketplace preview), and **Case Spaces M2** (tasks/checklists/attachments permissions). Land **Disclosure Packager v1** (tamper‑evident bundles) and a **Federation Planner (read‑only) POC**.

**Definition of Victory (DoV):**

- PCA manifests carry **remote attestation** evidence and **model card references**; partner replays PASS across two external environments.
- LAC enforces **version‑pinned policy packs** with a **tenant override diff** view; marketplace preview lists at least 3 packs.
- Case Spaces provide **tasks, checklists, attachments with permissions**, and export includes **Disclosure Pack v1** with revocation keys.
- Federation Planner POC can produce a **read‑only push‑down plan** with cost estimate and policy feasibility notes.

---

## 2) Scope (Must/Should/Won’t)

**Must**

- PCA GA: remote attestation (Node/Pod identity + signed OCI digests), model card provenance, manifest schema v1.0, verifier GA.
- LAC GA: pack registry (CRUD + semver), marketplace preview UI, tenant diff visualizer, runtime hardening.
- Case Spaces M2: tasks, checklists, attachment ACLs, export integration, legal hold enhancements.
- Disclosure Packager v1: signed, audience‑aware bundle; revocation + freshness beacons.
- Federation Planner (RO) POC: query analysis → push‑down plan + cost + policy feasibility.

**Should**

- Copilot: inline “Explain this view” connecting model cards to outputs; denial explainer polish.
- Ops: rollout cookbook (blue/green, flags/gradual), cost model v1.1 (I/O + egress).

**Won’t (this sprint)**

- Write‑enabled federation; ZK‑TX productionization; predictive suite.

---

## 3) Sprint Backlog (Epics → Stories)

### Epic A — Proof‑Carrying Analytics (PCA) **GA**

**A1. Remote Attestation Evidence**

- Attach pod identity (SPIFFE/SPIRE or KMS signed) + OCI image digest to `pcq` manifest. (8 pts)
- Acceptance: manifest validates signer + image provenance; verifier rejects mismatches.

**A2. Model Card Provenance**

- Link each operator to a versioned model card (dataset, license, evals). (5 pts)
- Acceptance: UI provenance opens card; card hash included in manifest.

**A3. Manifest v1.0 Schema + Migration**

- Freeze schema; write migrator (alpha→v1.0); deprecate old fields. (3 pts)
- Acceptance: all golden flows on v1.0; migrator produces byte‑stable outputs.

**A4. Verifier GA Hardening**

- Timeout/retry/backoff; streaming diffs; exit codes; supply chain SBOM. (5 pts)
- Acceptance: soak @ 1000 replays/day with zero fatal leaks.

### Epic B — License/Authority Compiler (LAC) **GA**

**B1. Policy Pack Registry + Marketplace Preview**

- Registry service (create/list/get/version); metadata; tenancy; preview UI (read‑only). (8 pts)
- Acceptance: packs discoverable; pinning enforced; preview shows diffs.

**B2. Tenant Override Diff Visualizer**

- Visualize tenant deltas vs pack baseline; risk heatmap; export PDF. (5 pts)
- Acceptance: diff explains block/allow changes; audit attachment.

**B3. Runtime Hardening + Caching**

- WASM cold/warm cache; cap memory; denial of service guards. (3 pts)
- Acceptance: p95 eval < 5ms @ 95th percentile; zero OOM in soak.

### Epic C — Case Spaces **M2**

**C1. Tasks & Checklists**

- Per‑case tasks with assignment, due, status; checklists on tasks; SLA hooks. (8 pts)
- Acceptance: dashboard shows task burndown; SLA breach alerts.

**C2. Attachments with ACLs**

- Encrypted attachments; per‑role permissions; virus/malware scan hooks. (5 pts)
- Acceptance: unauthorized access blocked; audit records reason.

**C3. Legal Hold Enhancements**

- Fine‑grained scope; hold owner workflow; report export. (3 pts)
- Acceptance: holds override deletes/exports; report downloadable.

**C4. Export Integration (Disclosure v1)**

- Wire Disclosure Packager v1 into export; revocation/freshness beacons. (5 pts)
- Acceptance: tamper detected externally; revoked keys invalidate bundle on open.

### Epic D — Federation Planner **POC (RO)**

**D1. Analyzer + Cost Model** (5 pts) — parse query graph; estimate scan/join cost.  
**D2. Policy Feasibility Check** (3 pts) — annotate plan with LAC feasibility notes.  
**D3. Push‑Down Plan JSON** (3 pts) — emit read‑only plan for partner systems.

### Epic E — Copilot/UX Glue

**E1. Explain‑This‑View (Model Card)** (3 pts) — tooltips linking outputs ↔ card provenance.  
**E2. Denial Explainer Polish** (2 pts) — clearer rationale strings; microcopy review.

> **Sprint Point Budget:** 76 pts (Graph Core 24, Trust Fabric 27, Copilot/UX 9, Gov/Ops 11, QA/Release 5).  
> **Capacity Check:** Rolling velocity ~78±8 pts; amber‑green.

---

## 4) Swimlanes & Working Agreements

**Swimlanes**

- _Trust Fabric:_ remote attest, schema v1.0, verifier GA, federation analyzer
- _Gov/Ops:_ pack registry/marketplace, override diffs, runtime hardening
- _Graph Core:_ tasks/checklists, attachments ACLs, export integration
- _Copilot/UX:_ model card explainers, denial microcopy
- _QA/Release:_ migration tests, soak, external partner replay

**Working Agreements**

- Manifest v1.0 required for merges touching pipelines.
- All pack changes require preview diff + risk stamp.
- Exports with Disclosure v1 must include revocation test.

---

## 5) Ceremonies & Calendar

- **Planning:** Mon Nov 3, 90m.
- **Stand‑ups:** 9:30–9:40 MT daily.
- **Grooming:** Wed Nov 5 (45m), Fri Nov 7 (30m).
- **Mid‑Sprint Demo & Risk:** Tue Nov 11 (30m).
- **Chaos (dev):** Thu Nov 13 (20m).
- **Review + Demo:** Fri Nov 14 (60m).
- **Retro:** Fri Nov 14 (30m).

---

## 6) Definition of Ready (DoR)

- Story sliced ≤8 pts; flags named; fixtures/tests identified; privacy notes; UI copy stub; dashboard cards sketched.

## 7) Definition of Done (DoD)

- Tests ≥ 90%; external partner replay PASS; pack registry pinned; disclosure revocation validated; docs/runbooks updated; release notes drafted.

---

## 8) Test Plan & Fixtures

- **PCA GA:** remote attestation fixtures; image digest mismatch negative test; model card links.
- **LAC GA:** marketplace listing, pin/unpin, tenant diff export.
- **Case M2:** task burndown E2E; attachment ACL negative cases; legal hold report.
- **Federation POC:** plan JSON for 3 sample queries; feasibility annotations.
- **Chaos:** revoke disclosure key; verify failure on open.

---

## 9) Metrics & Telemetry (Sprint)

- **Trust:** external replay pass‑rate; manifest v1.0 adoption; attestation failures.
- **Governance:** pack adoption; override deltas; eval latency p95.
- **Case Ops:** task burndown slope; attachment ACL violations (0 target).
- **Reliability/Cost:** error budget burn; cost model accuracy v1.1.

---

## 10) Risks & Mitigations

- **Supply‑chain attestation complexity** → start with SPIRE/KMS minimal viable; document fallbacks.
- **Marketplace governance** → restrict to curated packs; moderation queue.
- **Attachment ACL regressions** → add contract tests; negative access fuzzing.
- **Federation plan mis‑estimates** → conservative cost bands; label POC outputs accordingly.

---

## 11) Deliverables (Artifacts)

- `docs/` → Manifest v1.0 spec; Pack Registry spec; Case M2 UX; Federation POC notes; rollout cookbook.
- Dashboards: Trust (attest/adoption), Governance (packs/diffs), Case Ops (burndown), Cost (v1.1).
- Runbooks: “Remote Attest Replay”, “Pack Registry Ops”, “Disclosure Revocation Handling”.

---

## 12) Jira Scaffolds & Labels

**Epics:** `EPIC-PCA-GA`, `EPIC-LAC-GA`, `EPIC-CASE-M2`, `EPIC-FED-POC`, `EPIC-COPILOT-GLUE`  
**Labels:** `proof-carrying`, `policy-pack`, `marketplace`, `case-space`, `disclosure-v1`, `federation-ro`, `attestation`  
**Components:** `graph-core`, `trust-fabric`, `gov-ops`, `ux-copilot`, `qa-release`

**Issue Template (user story)**

```md
As a <role>, I want <capability>, so that <verifiable outcome>.
Acceptance:

- [ ] Behavior criteria…
- [ ] PCQ/LAC hooks verified…
- [ ] Attestation + model card wired…
- [ ] Telemetry events emitted…
```

---

## 13) API Sketches

```http
POST /pcq/manifest/attest { manifestId, evidence:{spiffeId,imgDigest,signer} }
GET  /policy/packs { query, pinnedVersion }
GET  /policy/packs/{id}/diff?tenantId=...
POST /case/{id}/task { title, assignee, due, checklist[] }
POST /case/{id}/attachment { acl, blobId }
POST /export/{id}/disclosure/v1/revoke { keyId }
POST /federation/plan { query }
```

---

## 14) Out‑of‑Scope + Next Sprint Seeds (S21)

- **Federation Planner**: connectors and execution sandbox.
- **ZK‑TX**: pilot wiring for governed fields.
- **Case Spaces M3**: timelines, evidence linking, advanced approvals.
- **Predictive suite**: hypothesis ranking with policy‑safe features.

---

## 15) Versioning & Change Log

- **v1.0 (2025‑09‑29)** — Initial S20 sprint plan drafted for planning review.

> Owner: PM — Sprint 20  
> Approvers: Eng Lead (Trust Fabric), Eng Lead (Graph Core), UX Lead, Gov/Ops Lead
