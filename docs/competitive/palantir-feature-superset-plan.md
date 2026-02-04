# Palantir Feature Superset Plan (Foundry/Gotham/AIP/Apollo)

## Summit Readiness Assertion Alignment

This plan is executed under the Summit Readiness Assertion as the governing readiness baseline
for competitive feature subsumption and verification sequencing.【F:docs/SUMMIT_READINESS_ASSERTION.md†L1-L40】

## Evidence Bundle (UEF)

**Sensing Mode — Observations**

1. Palantir’s platform positioning spans Foundry (data integration + governance), Gotham (intel
   workflows), AIP (assistants + agents), and Apollo (deploy/operate/rollback). This defines the
   capability surface that must be surpassed with demonstrable, governed features.
2. The current Summit repository already mandates policy-as-code, provenance, and evidence
   integrity as first-class governance requirements. This enables a superset strategy grounded in
   enforceable controls rather than marketing claims.【F:docs/GA_GOVERNANCE.md†L1-L40】
3. The platform vision and governance fabric are explicitly documented as operating constraints
   and differentiators, enabling a controlled, evidence-first roadmap for competitive parity and
   beyond.【F:docs/GOVERNANCE_FABRIC.md†L1-L40】【F:docs/VISION.md†L1-L40】

**Reasoning Mode — Judgments**

1. The superset must integrate data, ontology, AI agents, and deployment controls into a single
   governed system with provable lineage, reversible operations, and audit-grade evidence.
2. Differentiation is achieved by enforcing policy and provenance at every layer (data ingest,
   analytics, agent actions, and release operations) rather than relying on post-hoc governance.

## Superset Objectives (Non-Negotiable)

1. **Governed Supremacy**: All platform actions are policy-gated, audited, and reversible by
   default. “Governed Exceptions” are explicitly tracked and revalidated.
2. **Evidence-First Runtime**: Every analytic result, agent action, and deployment change emits
   provenance, integrity hashes, and verification artifacts.
3. **Unified Semantic Plane**: Ontology is the authoritative interface for humans and agents, with
   model execution and tool invocation bound to the same governance controls.
4. **Operational Dominance**: Deploy/rollback/recall capabilities are integrated into workflow
   orchestration with explicit kill-switch and recall paths.

## Feature Superset Map

### Foundry Superset (Data + Analytics + Governance)

- **Evidence-Backed Data Integration**: Ingest pipelines emit provenance hashes and policy
  attestations at each stage.
- **Deterministic Lineage Graph**: Lineage is queryable, ordered, and immutable with evidence
  budget constraints.
- **Compute-Agnostic Orchestration**: Support third-party compute with policy verification and
  contract enforcement at runtime.
- **Multi-Modal Analytics**: Geospatial, temporal, tabular, graph, and narrative analytics through
  a single governed workflow engine.

### Gotham Superset (Intel + Investigation Workflows)

- **Access-Controlled Case Fabric**: Case state transitions require policy checks and emit
  provenance logs.
- **Investigation-Grade Link Analysis**: Evidence-budgeted graph queries with deterministic
  ordering, repeatability, and audit chains.
- **Collaborative Evidence Review**: Shared, multi-analyst review with immutable audit trails.

### Ontology Superset (Semantic & Operational Plane)

- **Tool Factory With Policy Gates**: Every tool is policy-labeled; agents cannot execute without
  explicit governance and logged approvals.
- **Model Lifecycle Integrity**: Models are versioned, evaluated, and deployed through the same
  policy-as-code controls as data.

### AIP Superset (AI Agents + Assistants)

- **Ontology-Aware Agents**: Agents can read, propose, and execute on ontology objects with
  governance gates at each action.
- **Evidence-Bound Reasoning**: LLM outputs are traceable to source evidence with explicit
  uncertainty handling marked as “Intentionally constrained.”
- **Threaded Analysis Ledger**: Every session is a ledgered artifact, replayable for audit and
  verification.

### Apollo Superset (Deployment + Ops)

- **Continuous Compliance Deployments**: Policy checks before deployment, during rollout, and
  post-deploy verification with immutable evidence.
- **Recall & Rollback by Design**: Automated recall triggers and rollback automation tied to
  evidence thresholds and operational SLOs.

## Execution Plan (Compressed Timeline)

### Phase 1 — Governance-First Superset (Now)

1. Enforce policy-as-code at data ingest, query execution, and agent tool invocation.
2. Extend provenance ledger to cover all analytics and agent outputs.
3. Publish evidence bundle schema for feature claims.

### Phase 2 — Integrated Workflow Superset (Next)

1. Build unified workflow templates across investigation, analytics, and operational response.
2. Require deterministic query ordering and evidence budgeting for all graph operations.

### Phase 3 — Operational Superset (Next)

1. Implement deployment recall/rollback integration in orchestration workflows.
2. Add monitoring hooks for anomalous agent actions and policy violations.

## Verification & Evidence Requirements

- **Tiered Verification**: All feature claims carry Tier A/B/C verification aligned to governance
  requirements.
- **Evidence Artifacts**: Each feature includes audit logs, lineage graphs, and reproducibility
  records in evidence bundles.
- **Reversibility**: Every capability includes a rollback path and an explicit trigger definition.

## MAESTRO Security Alignment

- **MAESTRO Layers**: Foundation, Data, Agents, Tools, Infra, Observability, Security.
- **Threats Considered**: Prompt injection, tool abuse, policy bypass attempts, provenance
  tampering, and rollback misuse.
- **Mitigations**: Policy-as-code enforcement, evidence hashing, deterministic queries, audit
  logging, and runtime anomaly detection hooks.

## Decision Posture

This plan asserts present-state alignment and dictates future execution with governance-first
superset delivery. Deviation is **Deferred pending policy authorization** and recorded as a
Governed Exception.
