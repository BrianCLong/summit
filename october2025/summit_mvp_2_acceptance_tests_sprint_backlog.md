# Summit — MVP‑2 Acceptance Tests & Sprint Backlog

*A companion to the PRD. Traceable, sprint‑ready, and biased toward demonstrable value. IDs map to PRD §3.1 A–I & §3.2.*

---

## 1) Acceptance Test Checklist (Functional)

**Legend:** AT‑<DomainLetter><#> • Priority (P1|P2|P3) • Owner • Data Pack • Notes

### A) Ingest & Prep
- **AT‑A1 (P1)** *Connector conformance — CSV, JSONL, Parquet, Kafka*: **Given** a connector manifest, **when** I ingest a sample file/stream, **then** the wizard validates schema mapping, rate limits, retries, and writes lineage + license tags; bad rows quarantined; dashboard shows counts. *Owner:* Data • *Data:* DP‑01
- **AT‑A2 (P1)** *PII/PHI classifier & redaction presets*: **Given** mixed PII, **when** redaction preset “Min‑Std” is applied, **then** tokens are masked in evidence views & exports while graph holds hashed features with provenance. *Owner:* Sec/Privacy • *Data:* DP‑02
- **AT‑A3 (P1)** *License/TOS registry enforcement*: **Given** a dataset with `licenseClass=C‑restricted`, **when** a user without authority queries or exports, **then** OPA blocks with human‑readable reason and appeal path. *Owner:* Policy • *Data:* DP‑03
- **AT‑A4 (P2)** *Enrichers (GeoIP, lang, EXIF scrub, OCR)*: **Given** images/docs, **when** pipeline runs, **then** enrichers emit features, EXIF PII is removed, and each step is recorded in transform chain. *Owner:* Data • *Data:* DP‑04

### B) Graph Core
- **AT‑B1 (P1)** *Bitemporal truth*: **Given** conflicting updates, **when** querying by `observedAt` vs `validAt`, **then** results differ appropriately; time‑slice reproducible by timestamp. *Owner:* Graph • *Data:* DP‑05
- **AT‑B2 (P1)** *Provenance on every node/edge*: **Given** subgraph export, **when** inspecting any edge, **then** source→transform chain + checksum present. *Owner:* Prov • *Data:* DP‑01/05
- **AT‑B3 (P2)** *Geo‑temporal constructs*: **Given** trajectories, **when** stay‑point analysis runs, **then** stay segments & co‑presence edges added with confidence. *Owner:* Graph • *Data:* DP‑06

### C) Analytics & Tradecraft
- **AT‑C1 (P1)** *Link/Path/Community*: **Given** R1 CTI case, **when** running 3‑hop path & Louvain, **then** communities & top paths render under 1.5s p95 with stable IDs. *Owner:* Analytics • *Data:* DP‑07
- **AT‑C2 (P1)** *Anomaly triage*: **Given** streaming edges, **when** risk model flags > threshold, **then** incidents appear in triage with feature explanations and snooze/escalate. *Owner:* Analytics • *Data:* DP‑08
- **AT‑C3 (P2)** *Hypothesis Workbench*: **Given** two competing hypotheses, **when** applying evidence weights, **then** posterior updates & missing‑evidence prompts log to case. *Owner:* UX/Analytics • *Data:* DP‑09
- **AT‑C4 (P2)** *COA Planner*: **Given** DAG of actions, **when** Monte‑Carlo runs, **then** likelihood/impact bands with sensitivity sliders are produced and assumptions are persisted. *Owner:* Analytics • *Data:* DP‑10

### D) AI Copilot (Auditable)
- **AT‑D1 (P1)** *NL→Cypher preview sandbox*: **Given** a natural‑language prompt, **when** copilot proposes Cypher, **then** cost/row estimate shown and execution allowed only in sandbox; diff vs manual query available. *Owner:* AI • *Data:* DP‑05/07
- **AT‑D2 (P1)** *GraphRAG with inline citations*: **Given** a question in a case, **when** RAG answers, **then** every claim has at least one verifiable citation; publish blocked if any citation missing. *Owner:* AI/Prov • *Data:* DP‑11
- **AT‑D3 (P2)** *Guardrail denials*: **Given** prohibited query per license/policy, **when** prompted, **then** copilot explains denial & suggests compliant alternatives. *Owner:* Policy/AI • *Data:* DP‑03

### E) Collaboration & Workflow
- **AT‑E1 (P1)** *Case spaces & roles*: **Given** a case created, **when** assigning roles & watchlists, **then** only authorized members can see sensitive artifacts; 4‑eyes required for risky actions. *Owner:* App • *Data:* DP‑12
- **AT‑E2 (P1)** *Report Studio with disclosure packager*: **Given** a report draft, **when** exporting, **then** bundle includes timeline/map/graph figures, citations, hash manifest, license terms. *Owner:* App/Prov • *Data:* DP‑11/12

### F) Security/Governance
- **AT‑F1 (P1)** *Multi‑tenant isolation*: **Given** two tenants, **when** user from A searches, **then** no data/metadata of B leaks; attempted cross‑access audited. *Owner:* Sec • *Data:* DP‑13
- **AT‑F2 (P1)** *OPA policy simulation*: **Given** a draft policy, **when** simulating against golden queries, **then** allow/deny decisions match expected; drift alerts on change. *Owner:* Policy • *Data:* DP‑14
- **AT‑F3 (P1)** *Reason‑for‑access prompts*: **Given** sensitive view, **when** user proceeds, **then** reason captured, immutable audit updated, ombuds queue populated. *Owner:* Sec/Ombuds • *Data:* DP‑12

### G) Ops/Observability/Reliability
- **AT‑G1 (P1)** *OTEL/Prom dashboards*: **Given** load test, **when** running for 30m, **then** p95 graphs, burn‑rate, saturation maps visible & alerts route. *Owner:* SRE
- **AT‑G2 (P1)** *Cost Guard*: **Given** runaway query/inference, **when** thresholds breached, **then** killer throttles/terminates and user sees guidance; budget report updated. *Owner:* SRE/FinOps
- **AT‑G3 (P1)** *DR/BCP*: **Given** region failover simulation, **when** invoked, **then** RTO ≤ 1h, RPO ≤ 5m, audit preserved. *Owner:* SRE
- **AT‑G4 (P2)** *Offline kit v1 sync*: **Given** edge edits, **when** resync, **then** CRDT merges, conflicts resolved in UI, signed sync log stored. *Owner:* Edge

### H) Frontend Experience
- **AT‑H1 (P1)** *Tri‑pane sync + brushing*: **Given** selection in graph, **when** brushing, **then** timeline & map synchronize; keyboard shortcuts work; undo/redo functions. *Owner:* UX/App
- **AT‑H2 (P1)** *Explain this view*: **Given** any analytic panel, **when** opened, **then** provenance tooltips + XAI card appear. *Owner:* UX/AI
- **AT‑H3 (P2)** *A11y AAA audit*: **Given** axe run, **then** 0 criticals; focus order, contrasts, ARIA verified. *Owner:* UX

### I) Runbooks (R1–R10)
- **AT‑I1..I10 (P1)** Each runbook executes end‑to‑end on golden data, producing reproducible reports with citations and manifests; includes failure modes & rollback. *Owner:* Domain Leads

---

## 2) Acceptance Test Checklist (Non‑Functional)

- **NFT‑P** Performance: p95 query <1.5s (3 hops, 50k neighborhood); ingest 10k docs ≤5m.
- **NFT‑R** Reliability: 99.5% uptime over 14‑day window; chaos drill passes (pod/broker/primary loss).
- **NFT‑S** Security: SBOM present; secrets rotated; STRIDE controls mapped; pen test high/critical=0.
- **NFT‑C** Compliance: DPIA templates filled; audit immutability verified; license enforcement sampled 20x/zero misses.
- **NFT‑F** FinOps: budget caps enforced; slow‑query killer triggers in test; unit cost dashboards populated.

Each NFT has load profiles, thresholds, and pass/fail gates in CI + a manual drill.

---

## 3) Data Packs & Fixtures

- **DP‑01** Connector conformance corpora (CSV/JSONL/Parquet/Kafka) with errors & edge cases.
- **DP‑02** PII/PHI synthetic set (names, gov‑IDs, faces blurred, audio transcripts) + redaction truth.
- **DP‑03** License registry samples (Open, C‑restricted, NDA, Jurisdictional) + policy matrix.
- **DP‑04** Media set with EXIF, multilingual OCR pages; expected enrich outputs.
- **DP‑05** Bitemporal mini‑graph (conflicting truths across time).
- **DP‑06** Trajectory/geo events for co‑presence/stay‑points.
- **DP‑07** CTI graph (hashes, infra, actors) sized for p95 checks.
- **DP‑08** Anomaly stream with labeled positives/negatives.
- **DP‑09** Hypotheses/evidence worksheet.
- **DP‑10** COA DAG + Monte‑Carlo seeds.
- **DP‑11** RAG corpus with paragraph‑level citations.
- **DP‑12** Case/role matrices; 4‑eyes actions; legal hold.
- **DP‑13** Multi‑tenant sandbox scaffolding.
- **DP‑14** Policy simulator golden queries.

---

## 4) Environments, Tooling, & Gating

- **Env‑Dev**, **Env‑Stage** (mirrors prod SLOs), **Env‑Perf** (isolated), **Env‑Chaos**.
- CI gates: schema & contract tests, SBOM & vuln scan, policy unit tests, golden dataset diff, perf smoke, a11y lint, e2e smoke.
- CD gates: feature flags verified, migration dry‑run, rollback plan.

---

## 5) MVP‑2 Sprintable Backlog (User Stories)

**Format:** US‑<EpicLetter><#> — *As a <role>, I want <capability>, so that <value>.*

### A) Ingest & Prep
- **US‑A1 (5)** Ingest wizard validates mapping & previews sample rows. *AC:* mapping saved; lineage created; invalid rows→quarantine; retry btn.
- **US‑A2 (8)** PII classifier + redaction presets (Min‑Std, Strict). *AC:* rules applied to views/exports; audit entries.
- **US‑A3 (5)** License/TOS registry + query/export checks. *AC:* OPA policy bundles; deny with reason & appeal.
- **US‑A4 (8)** Enrichers (GeoIP, lang, EXIF scrub, OCR) with toggleable steps. *AC:* transform chain entries.
- **US‑A5 (3)** Connector contract tests + fixtures starter.

### B) Graph Core
- **US‑B1 (8)** Bitemporal storage + time‑slice query. *AC:* `validAt`/`observedAt` selectors; snapshot export.
- **US‑B2 (5)** Provenance attributes on nodes/edges. *AC:* source→transform chain + checksum.
- **US‑B3 (5)** Geo primitives & stay‑point model. *AC:* segments & confidences.

### C) Analytics & Tradecraft
- **US‑C1 (8)** Path & community analytics with p95 budget. *AC:* 3‑hop/50k neighborhood under 1.5s.
- **US‑C2 (8)** Anomaly scorer + triage queue. *AC:* explainable features; snooze/escalate actions.
- **US‑C3 (5)** Hypothesis Workbench (weights/posteriors/missing‑evidence).
- **US‑C4 (5)** COA planner (DAG + Monte‑Carlo seed).

### D) AI Copilot
- **US‑D1 (8)** NL→Cypher with cost/row preview & sandbox exec. *AC:* diff vs manual.
- **US‑D2 (8)** GraphRAG with inline citations + publish blocker on missing citations.
- **US‑D3 (3)** Guardrail denial explanations.

### E) Collaboration & Workflow
- **US‑E1 (5)** Case spaces (roles, watchlists, legal hold).
- **US‑E2 (8)** Report Studio + disclosure packager (hash manifest + license terms).

### F) Security/Governance
- **US‑F1 (8)** Multi‑tenant isolation enforcement + tests.
- **US‑F2 (5)** OPA policy simulator with golden queries.
- **US‑F3 (5)** Reason‑for‑access prompts + ombuds queue.

### G) Ops/Observability/Reliability
- **US‑G1 (5)** OTEL tracing + Prom metrics + SLO dashboards.
- **US‑G2 (5)** Cost Guard (slow‑query killer + budgeter) with alerts.
- **US‑G3 (5)** DR/BCP scripts (PITR, cross‑region replicas) + drill.
- **US‑G4 (5)** Offline kit v1 CRDT merge + signed sync logs.

### H) Frontend Experience
- **US‑H1 (5)** Tri‑pane sync & brushing; keyboard shortcuts; undo/redo.
- **US‑H2 (5)** “Explain this view” panel with XAI cards.
- **US‑H3 (3)** A11y AAA linting & fixes.

### I) Runbooks
- **US‑I1..I10 (3 ea)** R1–R10 runbook authoring + artifacts + failure modes.

> **Estimates** are story points (t‑shirt → Fibonacci). Owners set during sprint planning; dependencies noted below.

---

## 6) Dependencies & Sequence

- **A before B/D:** Data contracts & license tags feed graph & copilot.
- **B before C:** Bitemporal + provenance required for analytics & RAG citations.
- **F gate on E/D:** Policy simulation and reason prompts must precede wide copilot/exports.
- **G spans all:** Observability & cost guard instrumented early; DR after data paths stable.

---

## 7) Sprint Plan (3 sprints, 2 weeks each)

### Sprint 1 — "Lay the Rails"
**Goals:** Ingest wizard + contracts, graph bitemporal core, observability baseline, policy skeleton.
- US‑A1, A5, A3 (partial deny path), A4 (EXIF scrub + GeoIP)
- US‑B1, B2
- US‑G1, G2 (budget meters only)
- US‑F2 (simulator shell)
- US‑H1 (basic tri‑pane sync)
**Demos:** ingest→graph→time‑slice; deny message; SLO dashboard prototype.
**Exit:** AT‑A1, AT‑B1/2, AT‑G1 pass.

### Sprint 2 — "See & Explain"
**Goals:** Analytics loop, copilot sandbox, provenance exports, case/report basics.
- US‑C1, C2
- US‑D1, D2
- US‑E1, E2
- US‑A2 (redaction presets)
- US‑G2 (killer), G3 (DR drill)
- US‑H2 (“Explain this view”), H3 (a11y fixes)
**Demos:** NL→Cypher preview; RAG with citations; report bundle with manifest.
**Exit:** AT‑C1/2, AT‑D1/2, AT‑E2, AT‑G2/3, AT‑H2 pass.

### Sprint 3 — "Govern & Harden"
**Goals:** Multi‑tenant isolation, guardrails, hypothesis/COA, offline kit v1, runbooks.
- US‑F1, F3
- US‑D3
- US‑C3, C4
- US‑G4
- US‑I1..I5 (top five runbooks)
**Demos:** 4‑eyes action; ombuds queue; offline edit→signed resync; hypothesis/COA outputs.
**Exit:** AT‑F1/3, AT‑D3, AT‑C3/4, AT‑G4, AT‑I1..I5 pass; NFT‑P/R/S/C smoke met.

> **Stretch/Buffer:** US‑B3, I6..I10 as capacity allows.

---

## 8) Definition of Ready (DoR) & Definition of Done (DoD)

**DoR:** User, value, constraints clear; AC testable; data pack identified; dependencies mapped; feature flag noted.

**DoD:** Code merged with tests; docs + runbook updated; OTEL/Prom metrics added; policy checks added; a11y checks passed; demo recorded; acceptance test green; feature flag default state documented.

---

## 9) Traceability Matrix (PRD → AT → US)

- PRD §3.1‑A → AT‑A1..A4 → US‑A1..A5
- PRD §3.1‑B → AT‑B1..B3 → US‑B1..B3
- PRD §3.1‑C → AT‑C1..C4 → US‑C1..C4
- PRD §3.1‑D → AT‑D1..D3 → US‑D1..D3
- PRD §3.1‑E → AT‑E1..E2 → US‑E1..E2
- PRD §3.1‑F → AT‑F1..F3 → US‑F1..F3
- PRD §3.1‑G → AT‑G1..G4 → US‑G1..G4
- PRD §3.1‑H → AT‑H1..H3 → US‑H1..H3
- PRD §3.1‑I → AT‑I1..I10 → US‑I1..I10
- PRD §3.2 (NFTs) → NFT‑P/R/S/C/F → Perf/Sec/Compliance test suites

---

## 10) Owner Map & RACI (placeholder)

- **Product/Confidential Design:** backlog, scope, acceptance.
- **Eng Leads:** Graph, AI, Ingest, App, SRE, Sec, Edge.
- **Ombuds/Policy:** approvals, appeals, audits.
- **UX:** flows, a11y, explainability.

(*Fill team names during sprint planning.*)

---

## 11) Artifacts to Produce Each Sprint

- Demo video + checklist, updated runbooks, SLO report, cost report, security delta, decisions log.

— End —

