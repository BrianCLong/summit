# Palantir-Class Build Roadmap (Graph-First, Evidence-First)

## Ordering Rule

Execute in this exact order to avoid graph debt and rework:

1. Provenance enforcement
2. Ingestion SDK
3. Ontology + ER
4. Temporal semantics
5. Analytics service
6. Workspace v1
7. Autonomous agents with verifier gates
8. Governance ubiquity
9. Sovereign deployment
10. Plugin ecosystem

## Phase Plan

### Phase 0 (Week 0-1): Platform Contract Lock

**Deliverables**

- Canonical Graph Contract v1 primitives: `Entity`, `Event`, `Relationship`, `Evidence`, `Claim`, `Narrative`.
- Required fields baseline: `id`, `type`, `time`, `confidence`, `source_refs`, `provenance`.
- Graph-as-system-of-record assertion for all final outputs.
- Ontology versioning + migration policy.

**Exit criteria**

- All new artifacts reference contract v1.

### Phase 1 (Weeks 1-3): Proof Moat Foundation

**Deliverables**

- Provenance object model: source/extraction/transformation lineage.
- Investigation evidence binder with deterministic indexing.
- Policy gate: claims without source references are rejected.

**Exit criteria**

- Every visible output is traceable to claim + evidence chain.

### Phase 2 (Weeks 2-6): Connector SDK

**Deliverables**

- Connector lifecycle interface: `discover()`, `fetch()`, `normalize()`, `extract()`, `load()`.
- Idempotent queued job model with retries and observability.
- Golden connectors: RSS/News, corporate filings, sanctions, court/public records, social capture.

**Exit criteria**

- New source onboarding requires connector implementation only.

### Phase 3 (Weeks 4-8): Ontology + Entity Resolution

**Deliverables**

- Governed type/relation registries and schema lints.
- ER v1: alias table, fuzzy/blocking strategies, merge/unmerge workflow.
- Confidence + provenance on all merges.

**Exit criteria**

- Canonical identities are stable and auditable.

### Phase 4 (Weeks 6-10): Temporal Intelligence

**Deliverables**

- Temporal edge model: `valid_from`, `valid_to`, `observed_at`.
- Time-slice query capability (`as-of` views).
- Contradiction-safe claim coexistence with confidence tracking.

**Exit criteria**

- Timeline is semantically correct, not timestamp sorting.

### Phase 5 (Weeks 8-12): Graph Analytics Engine

**Deliverables**

- Repeatable jobs: community, centrality, anomaly, flow.
- Derived artifact write-back into graph with provenance.

**Exit criteria**

- Analyst-intent questions resolve through reproducible analytics outputs.

### Phase 6 (Weeks 10-14): Investigation Workspace v1

**Deliverables**

- Investigation object with scope, hypotheses, tags.
- Workspace tabs: Timeline, Graph, Evidence Binder, Hypotheses, Reports.
- Pin-and-cite workflow.

**Exit criteria**

- Single full investigation can be completed without leaving Summit.

### Phase 7 (Weeks 12-18): Autonomous Investigation Agents

**Deliverables**

- Agent contracts requiring structured graph writes.
- Verifier loop: deterministic policy/schema/provenance checks + critic agents.
- Regression harness for agent output quality.

**Exit criteria**

- Agents run unattended without unverified graph pollution.

### Phase 8 (Weeks 16-22): Governance Everywhere

**Deliverables**

- ABAC/OPA enforcement on reads/writes/connectors/tools/exports.
- End-to-end audit logging and redaction policy enforcement.

**Exit criteria**

- Governed access posture is verifiable in production evidence.

### Phase 9 (Weeks 18-26): Sovereign Deployment

**Deliverables**

- Reproducible profiles: laptop, cluster, offline bundle.
- Signed artifact update channels and verification policy.

**Exit criteria**

- Third-party deployability in constrained environments within one week.

### Phase 10 (Weeks 22-30): Plugin Platform

**Deliverables**

- Plugin contracts: connectors, analytics, UI panels, agent skills.
- Compatibility/version policy + registry.

**Exit criteria**

- External teams can extend Summit without core edits.

## 7-Day Risk-Reduction Plan

1. Publish Canonical Graph Contract v1.
2. Enforce evidence-required graph writes.
3. Stand up connector SDK skeleton and one real connector.
4. Enable ontology versioning and lint in CI.
5. Launch ER v1 alias table + merge audit trail.

## MAESTRO Security Alignment

- **MAESTRO Layers**: Data, Agents, Tools, Observability, Security.
- **Threats Considered**: prompt injection, provenance spoofing, tool abuse, policy bypass.
- **Mitigations**: evidence-required write gates, deterministic schema validation, signed artifacts, end-to-end auditability.
