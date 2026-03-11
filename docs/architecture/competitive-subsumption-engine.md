# Competitive Intelligence Subsumption Engine
**Maltego + Palantir + Recorded Future → Summit Superset**

## Program Overview
Launch 24 parallel Jules sessions. Each session converts capabilities from leading intelligence platforms into Summit-native architecture primitives. The resulting work should form 30–50 safe incremental PRs that merge cleanly to Golden Path main.

## Strategic Objective
Transform Summit into a unified intelligence operating system that subsumes the functional layers of:
- Maltego
- Palantir Gotham
- Recorded Future

While introducing novel Summit differentiators:
- graph-native evidence architecture
- deterministic investigative artifacts
- agent-orchestrated intelligence workflows
- multi-source ingestion automation
- reproducible analysis

## Global Constraints
All generated work must satisfy:
- **Golden Main Compliance:** No breaking changes.
- **Feature flags:** All features behind feature flags.
- **Deterministic outputs only**
- **Stable Evidence IDs**
- **CI pipeline compatibility**

## Deliverables Required Per Session
Each Jules session must output:
1. Capability analysis
2. Summit subsumption architecture
3. Deterministic artifact schema
4. Minimal PR stack plan
5. CI gate compatibility verification

---

## Capability Harvest Domains
The orchestration must extract and subsume capabilities in eight intelligence layers.

### Layer 1 — Intelligence Data Ingestion
- **Goal:** Surpass ingestion layers from Maltego + Recorded Future.
- **Design:** `Switchboard → Source Adapter Layer → Evidence Harvester → IntelGraph`
- **Capabilities:** social network ingestion, dark web monitoring feeds, threat intelligence feeds, document extraction.
- **PR Targets:** `/ingestion/connectors/`, `/docs/architecture/ingestion-layer.md`

### Layer 2 — Entity Resolution Engine
- **Goal:** Inspired by entity correlation systems in Gotham.
- **Design:** `IdentityResolver → Graph Entity Merge → Confidence Scoring`
- **Artifacts:** `entity-resolution-report.json`, `confidence-graph.json`
- **PR Targets:** `/analysis/entity-resolution/`, `/docs/analysis/entity-resolution.md`

### Layer 3 — Intelligence Graph Core
- **Goal:** Expand IntelGraph to subsume link-analysis engines.
- **Schema:** `Entity`, `Relationship`, `Evidence`, `Source`, `Confidence`, `Provenance`, `TimeRange`
- **Capabilities:** multi-source entity correlation, graph timeline reconstruction, provenance lineage.
- **PR Targets:** `/docs/intelgraph/core-schema.md`, `/models/intelgraph/`

### Layer 4 — Investigation Workspace
- **Goal:** Replicate and surpass Maltego investigation graphs.
- **Design:** `InvestigationWorkspace` (`GraphState`, `AnalystActions`, `EvidencePanels`)
- **Capabilities:** graph pivoting, investigation bookmarking, entity clustering.
- **PR Targets:** `/ui/investigation/`, `/docs/investigation/workspace.md`

### Layer 5 — Intelligence Pattern Detection
- **Goal:** Inspired by analytic workflows in Gotham.
- **Pattern engines:** `influence_network`, `bot_cluster`, `fraud_ring`, `supply_chain_network`, `terror_cell_pattern`
- **Outputs:** `pattern-analysis.json`, `risk-score-report.json`
- **PR Targets:** `/analysis/pattern-engine/`, `/patterns/intelligence/`

### Layer 6 — Threat Intelligence Scoring
- **Goal:** Inspired by Recorded Future risk scoring.
- **Design:** `ThreatScoringEngine → Signal Aggregator → Risk Index`
- **Artifacts:** `risk-index.json`, `threat-signal-report.json`
- **PR Targets:** `/analysis/threat-scoring/`, `/docs/threat-intelligence/`

### Layer 7 — Evidence Provenance Ledger
- **Goal:** A Summit-native differentiator.
- **Design:** `Evidence` (`Source`, `CollectionMethod`, `Timestamp`, `IntegrityHash`, `ProvenanceChain`)
- **Deterministic outputs:** `evidence-ledger.json`, `provenance-chain.json`
- **PR Targets:** `/docs/evidence/provenance-ledger.md`, `/tools/provenance/`

### Layer 8 — Collaborative Intelligence Platform
- **Goal:** Inspired by collaborative features in Gotham.
- **Design:** `InvestigationSession`, `Analyst`, `ActionLog`, `EvidenceReview`
- **Capabilities:** collaborative graph analysis, audit trails, investigation branching.
- **PR Targets:** `/docs/collaboration/intelligence-workflows.md`, `/services/investigation-session/`

---

## Summit-Unique Differentiators
Jules must also design three innovations not present in competitor platforms.

### Innovation 1 — Deterministic Investigations
Every investigation produces reproducible artifacts.
- **Bundle format:** `investigation_bundle/` (`graph.json`, `case.json`, `evidence/`, `provenance.json`)

### Innovation 2 — Agent-Orchestrated Intelligence
Integrate with Maestro.
- **Workflow:** Analyst Request → Agent Task Planner → Switchboard Ingestion → IntelGraph Analysis

### Innovation 3 — Graph Pattern Mining
GraphRAG-based intelligence discovery.
- **Patterns stored as templates:** `pattern-template/` (`structure.json`, `detection-logic.json`)

## Expected PR Stack
The orchestration should generate approximately 30–50 small PRs.
Characteristics: <600 lines per PR, modular, documentation + scaffold, merge independently.

## Final Strategic Output
Jules must produce a master document: `docs/architecture/competitive-subsumption-engine.md` containing a competitive capability matrix, Summit architecture supersets, implementation roadmap, PR stack order, and feature-flag rollout plan.
