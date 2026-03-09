# OSINT Platform Capability Harvest → Summit Subsumption

## Program Overview
Launch 12 parallel Jules sessions to harvest capabilities from the latest OSINT ecosystem analysis (Maltego Evidence, i2 Analyst’s Notebook, Maltego One) and convert them into Summit IntelGraph architecture improvements. All work must be merge-safe for Golden Path main, with no speculative code, no breaking changes, and all features behind feature flags. Deliver patch-ready outputs only.

## Master Objective
Transform insights from modern OSINT platforms into Summit-native capabilities that are:
- graph-native
- evidence-first
- agent-orchestrated
- deterministic
- CI-verifiable

Target outcome: Summit surpasses Maltego + i2 + web OSINT tools as a unified intelligence platform.

## Global Constraints
All sessions must obey:
- **Golden Main Rules:** No breaking changes.
- **Feature Flags:** Feature flags for all new capabilities.
- **Deterministic:** Deterministic artifacts only.
- **Stable IDs:** Evidence IDs stable.
- **CI Passes:** CI passes existing gates.

## Required Deliverables
Each session must produce:
1. Architecture brief
2. Implementation design
3. Deterministic artifact spec
4. Minimal PR patch plan
5. CI compatibility validation

---

## Session Set

### Session 1 — Multi-Network Evidence Ingestion
- **Goal:** Replicate and surpass Maltego Evidence cross-network scraping.
- **Design:** `Switchboard → Evidence Harvester → IntelGraph`
- **Capabilities:** ingest multiple social networks simultaneously, normalize identities, create graph entities
- **Artifacts:** `Person`, `Account`, `Platform`, `Post`, `Relationship`
- **PR Deliverables:** `/docs/intelgraph/multi-network-ingestion.md`, `/ingestion/connectors/social/`

### Session 2 — Evidence Graph Workspace
- **Goal:** Build graph investigation workspace equivalent to Maltego graph view.
- **Design:** `IntelGraph → Investigation Workspace → Graph UI`
- **Capabilities:** entity pivoting, relationship expansion, evidence drill-down
- **Artifacts:** `InvestigationSession`, `EvidenceReference`, `GraphState`
- **PR Deliverables:** `/docs/investigation/workspace.md`, `/ui/investigation/graph`

### Session 3 — Evidence Case System
- **Goal:** Replace Maltego "case files".
- **Design:** Case (Evidence, Entities, Timeline)
- **Artifacts:** `case.json`, `evidence.json`, `timeline.json`
- **PR Deliverables:** `/docs/investigation/case-system.md`, `/models/case/`

### Session 4 — Portable Evidence Bundles
- **Goal:** Inspired by Maltego portable cases.
- **Design:** deterministic bundles (`investigation_bundle/`, `case.json`, `graph.json`, `evidence/`, `provenance.json`)
- **Properties:** deterministic, timestamp-free, reproducible
- **PR Deliverables:** `/docs/evidence/portable-bundles.md`, `/tools/export-bundle`

### Session 5 — Analyst Notebook-Style Analysis Engine
- **Goal:** Inspired by i2 Analyst's Notebook.
- **Capabilities:** timeline analysis, link analysis, pattern detection
- **Engine:** `IntelGraph → Analysis Engine`
- **Outputs:** `pattern-report.json`, `timeline-report.json`, `link-analysis.json`
- **PR Deliverables:** `/analysis/pattern-engine/`

### Session 6 — Large Graph Performance Layer
- **Goal:** Handle 100k+ entity investigations (i2 Analyst Notebook scale).
- **Tech:** graph pagination, lazy loading, server-side expansion
- **PR Deliverables:** `/docs/performance/graph-scaling.md`

### Session 7 — Browser-Based Investigation Platform
- **Goal:** Inspired by Maltego One.
- **Design:** `IntelGraph → Investigation API → Web Workspace`
- **Capabilities:** collaborative investigations, shared cases, audit logs
- **PR Deliverables:** `/docs/platform/investigation-web.md`

### Session 8 — Investigation Collaboration Layer
- **Capabilities:** `InvestigationSession`, `Analyst`, `ActionLog`
- **Properties:** reproducible analysis, evidence audit trails
- **PR Deliverables:** `/docs/governance/investigation-audit.md`

### Session 9 — Graph Pattern Templates
- **Goal:** Build GraphRAG pattern templates for OSINT.
- **Examples:** influence-network, bot-cluster, fraud-ring, disinformation-cascade
- **PR Deliverables:** `/patterns/osint/`

### Session 10 — IntelGraph Evidence Schema
- **Goal:** Create canonical schema (`Entity`, `Relationship`, `Evidence`, `Source`, `Confidence`, `Provenance`).
- **PR Deliverables:** `/docs/intelgraph/schema.md`

### Session 11 — Competitive Capability Subsumption
- **Goal:** Produce report mapping Maltego capability → Summit equivalent and i2 capability → Summit equivalent.
- **PR Deliverables:** `/docs/competitive/osint-subsumption.md`

### Session 12 — GA Roadmap Integration
- **Goal:** Produce roadmap for integrating these capabilities into IntelGraph, Maestro, Switchboard, and RepoOS.
- **PR Deliverables:** `/docs/roadmap/osint-platform.md`

## CI Compatibility Check
Each session must confirm:
- [x] deterministic artifacts
- [x] no timestamp outputs
- [x] no CI gate violations
- [x] feature flag isolation

## Expected PR Count
Target: 12–18 small PRs.
Each PR: < 600 lines, documentation + scaffold, safe to merge independently.
