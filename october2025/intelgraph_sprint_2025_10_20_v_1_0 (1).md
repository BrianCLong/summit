# IntelGraph — Sprint 19 Plan (v1.0)

**Slug:** `intelgraph-sprint-2025-10-20_v1.0`  
**Dates:** Oct 20–Oct 31, 2025 (10 working days)  
**Cadence:** 2 weeks  
**Release Train:** `2025.11.r1` (feature flags default OFF; staged progressive rollout)  
**Teams:** Graph Core, Trust Fabric, Copilot/UX, Gov/Ops, QA/Release  
**Environments:** dev → stage → prod; ephemeral preview envs per PR

---

## 1) Sprint Goal
Elevate **trust + governance** from alpha/beta to **field‑ready** by shipping **PCA Beta** (determinism hardening + perf), **LAC RC** (policy packs + authoring UX), and **Case Spaces M1** (collab & legal hold UX). Demonstrate an external partner replay and a full disclosure/export workflow with approvals.

**Definition of Victory (DoV):**
- PCA manifests validate across **heterogeneous environments** (Linux x86/ARM) within tolerance; p95 replay ≤1.6× compute time.
- LAC RC enforces **named policy packs** (e.g., GDPR‑Core, OFAC‑Core) with override requests logged + routed.
- Case Spaces support **comments, @mentions, watchlists**, and **legal hold UX** with export audit chain.

---

## 2) Scope (Must/Should/Won’t)
**Must**
- PCA Beta: nondeterminism detectors, seed/locale guards, cross‑arch fixtures, perf budgets.
- LAC RC: policy packs + versioning, authoring linting, override/appeal workflow, WASM runtime profiling.
- Case Spaces M1: comments, mentions, watchlists, legal hold UX, export queue with 4‑eyes.
- Observability: trace ↔ manifest/policy correlation, cost telemetry v1, SLO alerts tightened.

**Should**
- Copilot: inline “Explain this denial” with policy snippet; provenance panel deep‑link.
- Disclosure Packager v0.5: multi‑audience layout presets (press/court/partner) templated.

**Won’t (this sprint)**
- ZK‑TX integration; full federation planner; predictive suite.

---

## 3) Sprint Backlog (Epics → Stories)

### Epic A — Proof‑Carrying Analytics (PCA) **Beta**
**A1. Nondeterminism Detectors**
- Add runtime checks for non‑stable iterators, time‑now, randomness without seed, locale/UTF collation. (5 pts)
- Acceptance: detector fires in chaos tests; CI gate blocks nondeterministic operators.

**A2. Cross‑Arch Repro Suite**
- Golden fixtures executed on x86_64 and ARM64; tolerance thresholds; byte‑order probes. (8 pts)
- Acceptance: 10/10 flows replay within tolerance; deviations logged with root cause.

**A3. Performance Budgeting**
- DAG runner perf: p95 hops ≤1.5s @ 50k nodes; manifest write ≤200ms per hop. (5 pts)
- Acceptance: k6 run meets SLO; budget regression guard.

**A4. UI Provenance Deep‑Link**
- Deep‑link from graph nodes to manifest sections (inputs, attestations). (3 pts)
- Acceptance: link opens focused view; copy reviewed.

### Epic B — License/Authority Compiler (LAC) **RC**
**B1. Policy Packs & Versioning**
- Package baseline packs (`gdpr-core`, `ofac-core`, `tenant-retention-core`); semantic versioning; pack manifest. (5 pts)
- Acceptance: pack pinned in evaluation; upgrade path simulated with diff.

**B2. Authoring Linting + IDE Hints**
- Linter rules (dead clauses, shadowed rules, missing purpose tags); VS Code extension hints. (8 pts)
- Acceptance: sample policies auto‑fixed; CI fails on severity ≥warn unless `--allow-warn`.

**B3. Override/Appeal Workflow**
- Request object + SLA; two‑step approver; audit trail; notifications. (5 pts)
- Acceptance: blocked query raises request; resolution recorded; export blocked until resolved.

**B4. WASM Runtime Profiling**
- Add Prom metrics for eval counts/latency; flamegraphs on stage; micro‑benchmarks. (3 pts)
- Acceptance: p95 policy eval < 6ms; dashboard wired.

### Epic C — Case Spaces **M1**
**C1. Comments & Mentions**
- Realtime comments with markdown; `@mention` notifications; soft delete with audit. (8 pts)
- Acceptance: latency < 200ms @ P95 on stage; notifications delivered.

**C2. Watchlists & Subscriptions**
- Add/remove watchlists; per‑case digest email; SLA reminders. (5 pts)
- Acceptance: watchlist change reflected instantly; digest sent on schedule.

**C3. Legal Hold UX**
- Visible banners; disable risky actions; hold owner & reason; export exception path. (5 pts)
- Acceptance: holds block delete/export; override requires 4‑eyes + justification captured.

**C4. Export Queue + 4‑Eyes Enhancements**
- Export request queue with prioritization; dual approval steps; retry/resume semantics. (5 pts)
- Acceptance: queue survives restart; all actions audited.

### Epic D — Observability & Ops
**D1. Trace Correlation** (3 pts) — add `pcq_id`/`policy_id` to traces; dashboard join cards.  
**D2. Cost Telemetry v1** (3 pts) — per‑DAG hop CPU/mem samples + cost model.  
**D3. SLO Alerts Tightening** (3 pts) — alert policies; burn rate 2%/hour page.

### Epic E — Copilot/UX Glue
**E1. Denial Explainer v1** (3 pts) — policy snippet + human‑readable rationale + appeal link.  
**E2. Provenance Panel Deep‑Link** (2 pts) — match A4.

> **Sprint Point Budget:** 76 pts (Graph Core 26, Trust Fabric 25, Copilot/UX 10, Gov/Ops 10, QA/Release 5).  
> **Capacity Check:** Rolling velocity ~78±8 pts; amber‑green.

---

## 4) Swimlanes & Working Agreements
**Swimlanes**
- *Trust Fabric:* PCA detectors, cross‑arch suite, perf budgets, provenance deeplinks
- *Gov/Ops:* LAC packs/versioning, linter/IDE, override/appeal, runtime profiling
- *Graph Core:* Case Spaces M1 features, export queue, legal hold UX
- *Copilot/UX:* denial explainer, provenance panel
- *QA/Release:* cross‑arch CI, chaos recipes, regression guards

**Working Agreements**
- All policy changes require **pair review** + diff simulator report attached.
- Any Story touching exports must include **4‑eyes tests** + audit assertions.
- PCQ manifests are **release‑blocking artifacts** in stage.

---

## 5) Ceremonies & Calendar
- **Planning:** Mon Oct 20, 90m.  
- **Stand‑ups:** 9:30–9:40 MT daily.  
- **Story Grooming:** Wed Oct 22 (45m), Fri Oct 24 (30m).  
- **Mid‑Sprint Demo & Risk:** Tue Oct 28 (30m).  
- **Chaos Drill (dev):** Thu Oct 30 (20m).  
- **Review + Demo:** Fri Oct 31 (60m).  
- **Retro:** Fri Oct 31 (30m).

---

## 6) Definition of Ready (DoR)
- User story, acceptance, fixtures named, flags defined, UX copy stubbed, privacy notes linked, dashboards updated.

## 7) Definition of Done (DoD)
- Unit/contract tests ≥ 90%; cross‑arch replay passed; policy packs pinned; override workflow live; docs/runbooks updated; release notes drafted.

---

## 8) Test Plan & Fixtures
- **Cross‑Arch Repro:** 10 golden flows on x86_64 + ARM64; CI matrix.  
- **Policy Corpus:** pack pinning tests; simulated upgrades produce diffs.  
- **Case M1:** realtime comments soak (15 min @ 5 RPS), mentions notifications, legal hold override.
- **Load/Perf:** k6 for DAG; WASM micro‑bench; UI latency budgets on stage.
- **Chaos:** nondeterminism detector trip; pod kill; resume export queue.

---

## 9) Metrics & Telemetry (Sprint)
- **Trust:** replay determinism rate; external partner verify pass‑rate; manifest deeplink CTR.  
- **Governance:** # blocks, overrides requested/approved, appeal cycle time.  
- **Case Ops:** comment latency p95, watchlist adoption, export queue wait time.  
- **Reliability/Cost:** p95 hop time, error budget burn, per‑hop cost model accuracy.

---

## 10) Risks & Mitigations
- **Hidden nondeterminism on ARM** → instrumented detectors + seed/locale guards; skip‑list with owner.  
- **Policy pack drift** → pin versions; pre‑prod rehearsal with diff; rollback macro.  
- **Comment spam / notification fatigue** → rate limits; digest rollups; mute controls.  
- **Export queue dead‑lettering** → DLQ with retry/backoff; operator runbook.

---

## 11) Deliverables (Artifacts)
- `docs/` → PCA Beta spec addendum; LAC Policy Pack spec; Case M1 UX flows; override SOP; cost telemetry notes.  
- Dashboards: Trust (replay, PCQ); Governance (blocks/overrides); Reliability (hop p95); Cost (model v1).  
- Runbooks: “Override/Appeal”, “Export Queue Ops”, “Cross‑Arch Replay”.

---

## 12) Jira Scaffolds & Labels
**Epics:** `EPIC-PCA-BETA`, `EPIC-LAC-RC`, `EPIC-CASE-M1`, `EPIC-OBS-OPS`, `EPIC-COPILOT-GLUE`  
**Labels:** `proof-carrying`, `policy-compiler`, `policy-pack`, `case-space`, `tri-pane`, `pcq`, `lac`, `slo`, `cost-model`  
**Components:** `graph-core`, `trust-fabric`, `gov-ops`, `ux-copilot`, `qa-release`

**Issue Template (user story)**
```md
As a <role>, I want <capability>, so that <verifiable outcome>.
Acceptance:
- [ ] Behavior criteria…
- [ ] PCQ/LAC hooks verified…
- [ ] Cross‑arch replay satisfied…
- [ ] Telemetry events emitted…
```

---

## 13) API Sketches
```http
POST /pcq/verify/crossarch { manifestUrl, arches:["x86_64","arm64"] }
POST /policy/packs { name, version, rules[] }
POST /policy/override { queryCtx, policyId, reason }
POST /case/{id}/comment { text, mentions[] }
POST /case/{id}/watchlist { op:add|remove, principal }
POST /export/queue { caseId, audience }
```

---

## 14) Out‑of‑Scope + Next Sprint Seeds (S20)
- PCA GA: remote attestation + model card provenance.  
- LAC GA: pack marketplace + tenant diffs.  
- Case Spaces M2: tasks, checklists, attachments permissions.  
- Federation read‑only planner POC.

---

## 15) Versioning & Change Log
- **v1.0 (2025‑09‑29)** — Initial S19 sprint plan drafted for planning review.

> Owner: PM — Sprint 19  
> Approvers: Eng Lead (Trust Fabric), Eng Lead (Graph Core), UX Lead, Gov/Ops Lead

