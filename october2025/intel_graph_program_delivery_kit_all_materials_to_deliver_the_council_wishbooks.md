# IntelGraph — Program Delivery Kit
**Scope:** Deliver every capability, runbook, integration, governance control, and non‑functional requirement described across the Council Wishbooks (Final Product, Expanded & Exhaustive, Vol II Summit, Vol III Ascent Beyond, Vol IV Inferno) and the PRD template — from ideation to GA and scale.

---
## 0) How to Use This Kit
- **This is the master grimoire** for planning, building, and shipping. Each section is executable: copy tasks into your tracker, run ceremonies, and attach the included checklists.
- **Traceability:** Every epic and requirement has a unique ID (e.g., `IG-CORE-B4-ProvLedger`, `IG-XAI-C1-Paths`). Map these to your repo/issue IDs.
- **Read me first:** Section 1 (Program Charter) → Section 2 (Scope Map & WBS) → Section 3 (Roadmap) → Section 4 (OKRs) → Section 5 (Delivery Rails) → then feature PRDs.

---
## 1) Program Charter
**Vision:** A secure, multi‑tenant intelligence graph platform with first‑class provenance, compartmentation, automated tradecraft, auditable AI, and oversight by design.

**Objectives (OY‑1):**
1. Ship Core GA: ingest/graph/analytics/copilot, ABAC/OPA, audit, tri‑pane UI, 10+ connectors.
2. Stand up Prov‑Ledger (beta) and Predictive Suite (alpha) with counterfactual sims.
3. Establish trust fabric: selective disclosure, authority binding, policy reasoner.
4. Achieve SLOs, cost guards, chaos drills, offline kit v1.

**Guardrails:** Mission‑first ethics; provenance over prediction; compartmentation; operate degraded; explainable automation; no unlawful harm.

**Deliverables:**
- Feature PRDs, Architecture Specs, API contracts, Data model, Test plans, Runbooks, XAI overlays, Security/Compliance packs, Ops playbooks, Docs & training.

---
## 2) Scope Map → Epics → Work Breakdown Structure (WBS)
> Each epic lists core stories and acceptance. Full story tables appear in Section 10.

### A) Data Intake & Preparation
- **Epic IG-ING-A1 Connectors Catalog** — 200+ phased; manifests, mappings, rate‑limits, IO tests.
  - WBS: connector SDK, conformance tests, example datasets, throttling policies, docs.
- **Epic IG-ING-A2 Ingest Wizard & ETL Assistant**
  - WBS: schema mapper UI, PII classifier, DPIA checklist, redaction presets, lineage recorder.
- **Epic IG-ING-A3 Streaming ETL & Enrichers**
  - WBS: GeoIP/lang/hash/EXIF/OCR/STT enrichers; poison/health monitors.
- **Epic IG-ING-A4 Data License Registry**
  - WBS: license store, query‑time enforcement, export blocker UI, appeals workflow.

### B) Canonical Model & Graph Core
- **Epic IG-CORE-B1 Entity/Relationship Ontology & Policy Labels**
- **Epic IG-CORE-B2 Temporal & Bi‑Temporal Truth**
- **Epic IG-CORE-B3 Geo‑Temporal Graph (Trajectories/Convoy/Rendezvous)**
- **Epic IG-CORE-B4 Provenance & Claim Ledger (Service)**

### C) Analytics & Tradecraft
- **Epic IG-ANL-C1 Link/Path/Community/Centrality Suite**
- **Epic IG-ANL-C2 Pattern Miner (temporal motifs, co‑travel, structuring)**
- **Epic IG-ANL-C3 Anomaly & Risk Scoring + XAI pane**
- **Epic IG-ANL-C4 Hypothesis Workbench (CH/COI)**
- **Epic IG-ANL-C5 COA Planner & What‑If Simulation**
- **Epic IG-ANL-C6 Strategic Intelligence & Predictive Suite (forecast/causal/counterfactual)**
- **Epic IG-ANL-C7 War‑Gamed Decision Dashboard**

### D) AI Copilot (Auditable by Design)
- **Epic IG-AI-D1 NL Graph Querying (NL→Cypher Preview + Sandbox)**
- **Epic IG-AI-D2 GraphRAG & Evidence‑First RAG (inline citations)**
- **Epic IG-AI-D3 Schema‑Aware ETL Assistant**
- **Epic IG-AI-D4 Hypothesis Generator & Narrative Builder**
- **Epic IG-AI-D5 Guardrails (policy reasoner, model cards, red‑team logs)**

### E) Collaboration & Workflow
- **Epic IG-COL-E1 Case Spaces & SLA/4‑Eyes**
- **Epic IG-COL-E2 Brief/Report Studio (timeline/map/graph)**
- **Epic IG-COL-E3 Comments/@mentions w/ immutable audit & legal hold**
- **Epic IG-COL-E4 Disclosure Packager (hashes & manifests)**

### F) Security, Governance & Audit
- **Epic IG-GOV-F1 ABAC/RBAC, OPA policies, SCIM**
- **Epic IG-GOV-F2 Audit & Reason‑for‑Access + Anomaly Alerts**
- **Epic IG-GOV-F3 Warrant/Authority Binding & Policy Simulation**
- **Epic IG-GOV-F4 Privacy Preserving (k‑anon, minimization) & Key Mgmt**

### G) Integrations & Interop
- **Epic IG-INT-G1 STIX/TAXII, MISP, OpenCTI**
- **Epic IG-INT-G2 SIEM/XDR Bridges (Splunk/Elastic/Chronicle/Sentinel)**
- **Epic IG-INT-G3 Productivity & Case (Slack/Teams, Jira/ServiceNow)**
- **Epic IG-INT-G4 GIS (Mapbox/ESRI), E‑discovery (Relativity/Nuix), Data Science (DuckDB/Arrow)**

### H) Ops, Observability & Reliability
- **Epic IG-OPS-H1 SLOs & Telemetry (OTEL/Prom)**
- **Epic IG-OPS-H2 Cost Guard & Archived Tiering**
- **Epic IG-OPS-H3 Resilience (PITR, cross‑region, chaos)**
- **Epic IG-OPS-H4 Offline/Edge Kits & CRDT Sync**
- **Epic IG-OPS-H5 Admin Studio (schema, health, retries, feature flags)**

### I) Frontend Experience
- **Epic IG-UX-I1 Tri‑Pane UI (timeline/map/graph) & brushing**
- **Epic IG-UX-I2 Command Palette, A11y AAA, Diff/Undo/Redo**
- **Epic IG-UX-I3 Explain‑This‑View & XAI Overlays**

### J) Federated/Verifiable Trust (Vol II+)
- **Epic IG-TRUST-J1 Proof‑Carrying Analytics/Queries**
- **Epic IG-TRUST-J2 Zero‑Knowledge Trust Exchange/Deconfliction**
- **Epic IG-TRUST-J3 License/Authority Compiler (policy‑bound execution)**
- **Epic IG-TRUST-J4 Provenance Wallets & Selective Disclosure**

### K) Auditable Autonomy & Red‑Team (Vol II)
- **Epic IG-AGT-K1 Glass‑Box Agents & Replay**
- **Epic IG-AGT-K2 Runbook Provers & Gatekeepers**
- **Epic IG-AGT-K3 Adversarial ML Red‑Team**
- **Epic IG-AGT-K4 Reasoning‑Trace Signatures**

### L) Frontier Capabilities (Vol III)
- **Epic IG-FR-L1 Counterfactual Proof Cartridges (CPC)**
- **Epic IG-FR-L2 Policy‑Sealed Computation (PSC)**
- **Epic IG-FR-L3 Proof‑of‑Non‑Collection (PNC)**
- **Epic IG-FR-L4 Dialectic Co‑Agents (DCQ + DDR)**
- **Epic IG-FR-L5 ZK Early‑Warning Exchange (ZKEWX)**
- **Epic IG-FR-L6 Semantic Delta Networks (SDN)**
- **Epic IG-FR-L7 Introspective Weight Surgery (IWS)**
- **Epic IG-FR-L8 Proof‑Carrying Edge (PCE)**
- **Epic IG-FR-L9 Narrative Field Theory (NFT‑x) & Honey‑Pattern Weave (HPW)**
- **Epic IG-FR-L10 Counterfactual Risk Budgeting (CRB)**
- **Epic IG-FR-L11 Ombuds Autonomy Controller (OAC), Cryptographic Dissent (CDC), Proof‑of‑Purpose/Use‑Decay (PoP)**

### M) Inferno Capabilities (Vol IV)
- **Epic IG-INFER-M1 Quantum‑Safe Proofs (QAP/QDP)**
- **Epic IG-INFER-M2 Singularity Reasoning Cores (SRC)**
- **Epic IG-INFER-M3 Proof‑of‑Non‑Existence (PNE)**
- **Epic IG-INFER-M4 Void‑Eating Exchange (VEX), Hyper‑Delta Synapses (HDS)**
- **Epic IG-INFER-M5 Resurrection Surgery (RS), Hellfire Watermarks (HW)**
- **Epic IG-INFER-M6 Inferno Field Dynamics (IFD), Abyss‑Weave Patterns (AWP)**
- **Epic IG-INFER-M7 Ombuds Dominion Core (ODC), Proof‑of‑Dominion & Decay Infernos (PoD)**

---
## 3) Phased Roadmap (6‑Quarter)
**Q4‑2025:** Core GA (ING/CORE/ANL/A I/COL/GOV/UX), Prov‑Ledger beta, Predictive alpha, SLO dashboards, cost guards, chaos drills, Offline Kit v1.
**Q1‑2026:** Graph‑XAI across anomalies/ER/forecasts; DFIR adapters; DP exports; JanusGraph option; Runbooks ≥25; SIEM/XDR depth; Federated search prototype.
**Q2‑2026:** ZK‑TX/PCQ pilots; Provenance Wallets; License/Authority Compiler beta; COA+War‑Game v1; Policy Simulation.
**Q3‑2026:** Frontier set (CPC, PSC, PNC, DCQ) pilots; SDN/ZKEWX trials; PCE edge sync; IWS hot‑patching.
**Q4‑2026:** Narrative Physics (NFT‑x/HPW); CRB action gates; OAC/CDC; multi‑graph federation GA.
**H1‑2027:** Inferno set (QAP/SRC/PNE/VEX/HDS/RS/HW/IFD/AWP/ODC/PoD) staged experiments → gated releases.

Milestones per epic appear in Section 11 (Schedule & Gantt).

---
## 4) Program OKRs (per Half)
**Objective O1:** Ship Core GA with verifiable governance and analyst delight.
- KR1: ≥10 connectors GA with golden IO tests; ingest E2E ≤5m for 10k docs.
- KR2: p95 graph query <1.5s on 3‑hop/50k nodes workload.
- KR3: 100% published outputs carry citations and provenance manifests.
- KR4: A11y AAA and “Explain this view” adoption ≥70% of analysts.

**Objective O2:** Establish trust fabric & federation.
- KR1: PCQ attestation verifier reproduces results within tolerance on 10 reference cases.
- KR2: ZK deconfliction yields overlap/no‑overlap proofs with zero leakage.
- KR3: Policy‑by‑default blocks unsafe ops with actionable reasons ≥95% of test corpus.

**Objective O3:** Resilience and cost discipline.
- KR1: Monthly chaos drills; zero Sev‑1 from chaos; autoscaling policy documented.
- KR2: Cost guard reduces $/insight by ≥25% on benchmark.

**Objective O4:** Frontier validation.
- KR1: CPC/PSC pilots produce machine‑checkable warrants on 3 live scenarios.
- KR2: IWS hot‑patches reduce fix time from weeks→hours with bounded impact receipts.

---
## 5) Delivery Rails (Scrum/Kanban + Governance)
- **Cadence:** 2‑week sprints; PI (quarterly) planning; monthly release trains.
- **Ceremonies:** Stand‑up, Sprint Planning, Review, Retro; Architecture Council; Ombuds Review; Red‑Team Review; Cost Council; Chaos Drill.
- **Definition of Ready (DoR):** PRD approved; acceptance tests stubbed; security/privacy pre‑check; license/authority mapping; XAI notes defined.
- **Definition of Done (DoD):** Code + unit/integration tests; docs; telemetry; SLOs; security scans; PCQ/manifest; release notes; runbook updates.
- **Boards:** Value Stream swimlanes (Ingest, Core Graph, Analytics/AI, UX, Trust/Fed, Ops/SRE, Security/GRC, Integrations).

---
## 6) RACI (Program‑Level)
- **Responsible:** Feature squads (per epic); SRE for SLOs; Security for threat modeling.
- **Accountable:** Area PMs/EMs; Chief Architect for schema & protocols; Head of GRC for policy.
- **Consulted:** Legal, Ombuds, Red‑Team, FinOps.
- **Informed:** Field, Partnerships, Support.

---
## 7) Risk Register (Top‑25) & RAID Log
- **Themes:** Data license violations; model misuse; federation leakage; cost spikes; scale regressions; offline merge conflicts; governance drift.
- For each: Probability/Impact, Early‑Warning Signals, Owner, Mitigations, Contingency, Residual risk.
- **RAID:** Decisions (e.g., JanusGraph option), Assumptions (e.g., tenant per case), Issues, Dependencies (e.g., OIDC/SCIM provider readiness).

---
## 8) Security, Compliance & Ethics Plan
- Threat model (STRIDE) across services; SBOM & dependency scanning; secret hygiene.
- Policy‑by‑default compiler gates; purpose limitation tags; k‑anon/redaction tooling at ingest.
- Warrant/authority registry; reason‑for‑access prompts; abuse‑of‑power tripwires.
- Privacy reviews (DPIA), red‑team prompts archive, export manifests & selective disclosure wallets.

---
## 9) Observability, Reliability & FinOps
- OTEL traces; Prom metrics; structured logs; SLO dashboards; saturation heatmaps.
- Cost guard planner; archived tiers (S3/Glacier); query budgeter; slow‑query killer.
- DR/BCP: PITR, cross‑region; controlled chaos injections; RTO/RPO targets.
- Offline/Edge kits; CRDT merges; conflict resolution UI; signed sync logs.

---
## 10) PRDs — Index & Stubs (attach per epic)
> Use the mini‑template below per epic. Duplicate for all epics in Section 2.

**PRD Mini‑Template**
- Executive Summary: one‑sentence vision & KPI
- Problem/Opportunity & User research summary
- Requirements: Must/Should/Could with acceptance criteria
- Technical: Architecture sketch, APIs, data contracts, performance, security
- UX: Wireframe refs, A11y, interaction notes
- NFRs: Perf/Security/Reliability/Scalability
- Success Metrics & Analytics events
- Rollout & Risks

**Example IDs:** `PRD-IG-AI-D2-GraphRAG`, `PRD-IG-CORE-B4-ProvLedger`, etc.

---
## 11) Schedule, Milestones & Gantt (Text Form)
- **Now → Q4‑2025:** IG-ING/CORE/ANL/AI/COL/GOV/UX to GA‑ready; Prov‑Ledger beta; Predictive alpha; Ops hardening.
- **Q1‑2026:** Graph‑XAI, DFIR adapters, DP exports, federated prototype.
- **Q2‑Q3‑2026:** Trust Fabric (PCQ/ZK/LAC/Wallets) pilots → harden; COA/Wargame v1.
- **Q4‑2026:** Frontier pilots to GA candidates.
- **H1‑2027:** Inferno staged releases with strict gates.

---
## 12) Acceptance Criteria Patterns (Reusable)
- **ER Explainability:** merge decisions show features/scores/overrides; human‑in‑the‑loop.
- **Evidence‑First:** all narratives cite evidence; missing citations block publish.
- **Policy‑by‑Default:** blocked ops show reason + appeal path; simulation for policy changes.
- **Provenance Integrity:** exports include hash manifests & transform chains; external verifier passes.
- **UI Usability:** TTFI/task times tracked; regressions gate CI.

---
## 13) Test Strategy & Validation
- Unit/contract tests (connectors, GraphQL); Cypher tests (ephemeral Neo4j).
- E2E: ingest → resolve → runbook → report; UI screenshot diffs.
- Load (k6), soak; chaos drills (pod/broker kill); authz/query‑depth security tests.
- Acceptance packs per feature with fixtures & golden outputs.

---
## 14) Runbook Library (Build & Operate)
- **Investigative/CTI/DFIR/AML/Disinfo/HRD/Supply‑Chain/Crisis**: author DAGs with pre/post‑conditions, KPIs, and PCQ.
- Include new Frontier/Inferno runs: CPC chain, ZKEWX beacon, IWS surgery, PSC partner compute, SDN sync, CRB gates, CDC/OAC dissent flows, QAP reality forge, VEX alliance, RS hot‑resurrect, HW output audit, IFD narrative blaze.

---
## 15) Data Model, APIs & Contracts
- Canonical entities, policy labels, temporal attributes; claim & provenance schemas.
- API surface: GraphQL for query; service boundaries for Prov‑Ledger, XAI, Predictive Suite; rate limiting; error taxonomy.

---
## 16) UX System & A11y
- Tri‑pane layout system with synchronized brushing; pinboards; saved views.
- Command palette; dark/light; diff/undo/redo; explain overlays; provenance tooltips with confidence opacity.

---
## 17) Integrations Plan
- STIX/TAXII/MISP/OpenCTI; SIEM/XDR bridges; Slack/Teams/Jira/ServiceNow; GIS; E‑discovery; Data science bridges.
- Conformance tests, hello‑world flows, sample datasets.

---
## 18) Staffing Plan & Skills Matrix
- Squads per epic; roles: PM, EM, BE/FE, Graph Eng, Data Eng, ML/XAI, SRE, SecEng, UX, Tech Writer, GRC, Legal/Ombuds, FinOps.
- Hiring backfill triggers; vendor/partner criteria.

---
## 19) Communications & Change Mgmt
- Stakeholder map; steering committees; decision logs; dissent capture; release comms; partner briefs; training tracks.

---
## 20) Backlog Index (Traceability)
- Cross‑reference table mapping each Council item → Epic ID → PRD → Tests → Runbook → Docs.
- Maintain in your tracker; export to evidence manifest at release.

---
## 21) Ethics “Won’t Build” & Safety Gates
- Categorical declines; defensive alternatives; review workflow; incident response for misuse; external ombuds/appeals path.

---
## 22) Appendices
- Glossary; style guides; example fixtures; PCQ verifier spec; policy compiler spec; XAI cards; chaos catalog; FinOps unit‑cost sheets.

