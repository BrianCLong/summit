# OSINT Platform Subsumption

## Strategic Objective
Transform Summit into a graph-native intelligence platform that subsumes capabilities of modern OSINT platforms (Maltego Evidence, Maltego One, i2 Analyst's Notebook) while preserving Summit’s core differentiators: evidence-first architecture, deterministic investigation artifacts, governed IntelGraph spine, and agent-orchestrated intelligence workflows.

## Master Architecture Objective

The goal is not imitation, but subsumption and architectural improvement inside Summit. We extract the maximum architectural value from traditional platforms and map it to Summit's governed spine.

## Capability Comparison Matrix

| OSINT Platform Feature | Summit Architecture Superset |
| :--- | :--- |
| **Multi-Network Evidence Ingestion** (Maltego Evidence) | **Multi-Network Evidence Ingestion:** Switchboard → Source Adapter Layer → Evidence Harvester → IntelGraph. Normalizes cross-platform identities into governed evidence artifacts. |
| **Graph Visualization Workspace** (Maltego) | **Investigation Graph Workspace:** Investigation Workspace API → Graph UI. Entity pivoting, relationship expansion, graph filtering, evidence drill-down. |
| **Case Files** (Maltego) | **Intelligence Case System:** Case models containing Evidence, Entities, Relationships, Timeline, and AnalystNotes. |
| **Portable Cases** (Maltego) | **Portable Evidence Bundles:** Deterministic, reproducible, CI-verifiable bundles containing case.json, graph.json, entities.json, relationships.json, evidence/, and provenance.json. |
| **Link Analysis Engine** (i2 Analyst's Notebook) | **Link Analysis Engine:** Relationship clustering, link analysis, entity correlation, and pattern detection within IntelGraph. |
| **Large-Dataset Performance** (i2 Analyst's Notebook) | **Large Graph Performance Layer:** Graph pagination, server-side expansion, lazy loading, and graph query caching to handle 100k+ entities. |
| **Browser-Based Platform** (Maltego One) | **Browser-Based Investigation Platform:** Web Workspace via Investigation API for collaborative graph editing and shared cases. |
| **Investigation Collaboration** | **Investigation Collaboration System:** Multi-analyst investigations, audit trails, and reproducible workflows. |
| **Graph Pattern Library** | **OSINT Graph Pattern Library:** Reusable GraphRAG templates (e.g., bot-cluster, fraud-ring) mapped to IntelGraph. |
| **Evidence Schema** | **Canonical IntelGraph Evidence Schema:** Global schema for Entity, Relationship, Evidence, Source, Confidence, Provenance, TimeRange. |

## Additional Stability Layers (Critical)

The orchestration must also implement four foundational stability systems required for autonomous intelligence platforms:

1. **Canonical Identity Spine:** Signals → Normalization → Identity Resolution Service → Canonical Entity Registry → Graph insertion. All entity creation must pass through an identity service.
2. **Epistemic Reasoning Engine:** Track competing claims and contradictory evidence (belief states, claim records, contradiction detection).
3. **Source Credibility Engine:** Evaluate source reliability (reputation scoring, narrative manipulation detection, coordinated influence detection).
4. **Intelligence Workflow OS:** Manage investigation lifecycle (Signal → Investigation → Hypothesis → Evidence Validation → Report).

## PR Rollout Order (20-30 Incremental PRs)

PRs should be generated iteratively, under 650 lines each, feature-flag isolated, and merge-safe.

**Phase 1: Schemas and Bundles**
1. Define Canonical IntelGraph Evidence Schema artifacts.
2. Define Intelligence Case System models.
3. Define Portable Evidence Bundle structures.
4. Implement Identity Resolution Service models.

**Phase 2: Ingestion and Pattern Detection**
5. Implement Multi-Network Evidence Ingestion scaffolding.
6. Implement OSINT Graph Pattern Library schemas.
7. Implement Link Analysis Engine scaffolding.

**Phase 3: Workflows and Engines**
8. Implement Intelligence Workflow OS service endpoints.
9. Implement Epistemic Reasoning Engine models.
10. Implement Source Credibility Engine models.

**Phase 4: Interfaces and Operations**
11. Implement Investigation Graph Workspace API endpoints.
12. Implement Large Graph Performance Layer configurations.
13. Implement Browser-Based Investigation Platform scaffold.
14. Implement Investigation Collaboration System services.

## Feature-Flag Rollout Plan

All changes must be protected by feature flags and follow Golden Main governance.

1. `ff_osint_subsumption_schemas`: Exposes core Evidence and Case schemas to internal systems.
2. `ff_osint_subsumption_ingestion`: Activates multi-network ingestion in testing mode.
3. `ff_osint_subsumption_patterns`: Activates graph pattern detection logic.
4. `ff_osint_subsumption_engines`: Enables Link Analysis, Epistemic Reasoning, and Source Credibility engines.
5. `ff_osint_subsumption_workspace`: Exposes Browser-Based Investigation features to internal analysts.
