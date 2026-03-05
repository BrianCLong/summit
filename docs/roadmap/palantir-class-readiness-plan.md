# Summit Palantir-Class Readiness Plan

## Purpose

This document turns the current platform intent into a sequenced, deployable roadmap that prioritizes compounding value, governed execution, and evidence-first delivery.

## Current Standing Against 12 Palantir-Class Components

Legend: 🟢 solid / 🟡 partial / 🟠 early / 🔴 missing

| # | Component | Status | Confidence | Evidence Gap to Close |
|---|-----------|--------|------------|------------------------|
| 1 | Ontology and semantic layer | 🟡 | Medium | Establish versioned ontology package, migration strategy, and CI schema compatibility checks. |
| 2 | Entity resolution engine | 🟠 | Low-Medium | Ship a dedicated ER service with deterministic blocking keys, merge audit trails, and unmerge workflows. |
| 3 | Temporal intelligence | 🟠 | Low | Promote temporal validity to first-class model fields and support as-of query surfaces. |
| 4 | Provenance and source attribution | 🟡 | Medium-High | Enforce claim write rejection when provenance chains are incomplete. |
| 5 | Data ingestion framework | 🟡 | Medium | Standardize connector lifecycle with discover/fetch/normalize/extract/load contracts. |
| 6 | Narrative and influence modeling | 🟠 | Low | Add narrative schema, propagation jobs, and analyst workflows backed by graph artifacts. |
| 7 | Autonomous investigation agents | 🟡 | Medium | Require agents to emit structured graph artifacts with verification gates pre-merge. |
| 8 | Graph analytics engine | 🟠 | Low-Medium | Formalize repeatable analytics jobs and write derived outputs with provenance. |
| 9 | Investigation workspace | 🟠 | Low | Deliver timeline, graph, hypothesis, and evidence binder in one governed workspace. |
| 10 | Governance and access control | 🟡 | Medium-High | Expand ABAC/OPA checks to all read/write/export and agent tool paths. |
| 11 | Sovereign deployment capability | 🟠 | Low-Medium | Package offline bootstrap, signed update channels, and reproducible profiles. |
| 12 | Developer and plugin ecosystem | 🔴 | Medium | Define plugin contracts, compatibility matrix, and internal registry lifecycle. |

## Sequenced Roadmap

### Phase 0 (Week 0-1): Platform Contract Lock

**Objective:** Prevent architectural drift before scaling.

**Deliverables:**
- Canonical Data Contract v1 covering Entity, Event, Relationship, Evidence, Claim, Narrative.
- Required field policy (`id`, `type`, `time`, `confidence`, `source_refs`, `provenance`).
- Graph-as-System-of-Record assertion for all final outputs.
- Versioned ontology folders and migration policy.

### Phase 1 (Weeks 1-3): Evidence and Provenance Hardening

**Objective:** Every claim is reproducible and attributable.

**Deliverables:**
- Provenance objects for source, extraction, and transformation lifecycle.
- Evidence binder per investigation.
- Boundary policy: graph rejects writes missing `source_refs` and extraction references.

### Phase 2 (Weeks 2-6): Connector SDK Foundation

**Objective:** Scale ingestion with low per-source overhead.

**Deliverables:**
- Connector interface (`discover`, `fetch`, `normalize`, `extract`, `load`).
- Idempotent queue/job model with retries and deterministic run IDs.
- Five proving connectors (news, filings, sanctions, court/public record, social capture).

### Phase 3 (Weeks 4-8): Ontology Governance + ER v1

**Objective:** Keep graph identity clean and queryable.

**Deliverables:**
- Type/relation registries with CI linting.
- Compatibility-tested ontology migrations.
- ER service with alias tables, confidence scores, merge/unmerge audits.

### Phase 4 (Weeks 6-10): Temporal Semantics

**Objective:** Query truth across time, not just latest snapshots.

**Deliverables:**
- Temporal edge fields (`valid_from`, `valid_to`, `observed_at`).
- As-of network queries.
- Coexistence model for contradictory claims with confidence + provenance.

### Phase 5 (Weeks 8-12): Graph Analytics Services

**Objective:** Convert graph structure into repeatable insight.

**Deliverables:**
- Deterministic jobs: community, centrality, anomaly, flow.
- Persisted derived artifacts in graph with provenance lineage.
- Analyst-facing analytics catalog and job explainability metadata.

### Phase 6 (Weeks 10-14): Investigation Workspace v1

**Objective:** Enable complete investigations inside Summit.

**Deliverables:**
- Investigation object (scope, hypotheses, labels, owner).
- Workspace tabs: Timeline, Graph, Evidence Binder, Hypothesis Board, Reports.
- Pin-and-cite workflow that anchors every note to claims/evidence.

### Phase 7 (Weeks 12-18): Autonomous Investigation Agents

**Objective:** Safely automate investigative throughput.

**Deliverables:**
- Agent output contracts requiring structured artifacts.
- Critic/verifier loop with deterministic policy gates.
- Regression eval harness for schema, provenance, and quality checks.

### Phase 8 (Weeks 16-22): Governance Ubiquity

**Objective:** Enterprise-grade control surfaces.

**Deliverables:**
- ABAC/OPA enforcement on graph, connectors, agents, and exports.
- End-to-end access audit logs and redaction pathways.
- Policy evidence bundles attached to release artifacts.

### Phase 9 (Weeks 18-26): Sovereign Deployment Kit

**Objective:** Deploy in constrained and disconnected environments.

**Deliverables:**
- Reproducible Docker/Kubernetes profiles.
- Offline bootstrap pack and local model gateway profile.
- Signed release/update channels with rollback playbooks.

### Phase 10 (Weeks 22-30): Plugin Platform

**Objective:** Transition from product to extensible ecosystem.

**Deliverables:**
- Plugin contracts for connectors, analytics, UI panels, and agent skills.
- Compatibility policy and semantic versioning contract.
- Internal registry with vetting and deprecation controls.

## Non-Negotiable Build Order

1. Provenance enforcement
2. Connector SDK
3. Ontology + ER
4. Temporal semantics
5. Analytics
6. Workspace
7. Agents
8. Governance ubiquity
9. Sovereign packaging
10. Plugin ecosystem

## Next 7-Day Risk Reduction Sprint

1. Publish Canonical Graph Contract v1 with required fields.
2. Enforce evidence-required writes at graph boundaries.
3. Ship connector SDK skeleton plus one production connector.
4. Add ontology versioning + schema lint checks in CI.
5. Launch ER v1 alias table + merge audit trail.

## Success Metrics

- **Traceability:** 100% of generated claims link to source and extraction objects.
- **Ingestion velocity:** New source integration in less than one engineering day once connector SDK is in place.
- **Identity quality:** Merge precision and recall tracked with a human-reviewable sample set.
- **Temporal correctness:** As-of query regression suite with deterministic outputs.
- **Governance coverage:** Policy checks present on all graph and export paths.

## Forward-Leaning Enhancement

Introduce a **Deterministic Evidence Budget Controller** that scores each investigation run against a bounded evidence budget (time, source diversity, confidence dispersion) before allowing agent-generated conclusions to be marked publishable. This creates a measurable control point between speed and reliability while reducing over-collection and inconsistent confidence handling.
