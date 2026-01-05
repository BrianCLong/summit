# Provenance Schema Canonicalization (v2.0)

This document defines the canonical schema for Summit's Knowledge Graph & Provenance system. All provenance data is projected into this graph to enable explainability, auditability, and impact analysis.

## Core Entities

The schema consolidates all system activity into four atomic entity types:

### 1. Input (Source of Truth)

Represents data, configuration, or external signals that feed into the system.

- **Types**: `DataArtifact`, `Configuration`, `PolicyDefinition`, `PromptTemplate`.
- **Properties**: `hash` (SHA-256), `uri`, `version`, `createdAt`.

### 2. Decision (Logic & Governance)

Represents a choice made by a human or a machine (policy engine, classifier).

- **Types**: `PolicyEvaluation`, `ManualApproval`, `ClassifierPrediction`, `RoutingDecision`.
- **Properties**: `result` (ALLOW/DENY/FLAG), `confidence`, `policyVersion`, `evaluator`.

### 3. Action (Execution)

Represents a state-changing operation or a process execution.

- **Types**: `MaestroRun`, `IngestionJob`, `EnforcementAction` (e.g., Block User), `Deployment`.
- **Properties**: `status`, `startedAt`, `completedAt`, `durationMs`.

### 4. Outcome (Result)

Represents the observable side-effect or final state resulting from an action.

- **Types**: `MetricValue`, `SystemState`, `Alert`, `GeneratedArtifact`.
- **Properties**: `value`, `timestamp`, `dimension`.

## Canonical Relationships

Edges represent causality and data flow. All edges are directed.

- `(:Input)-[:FED_INTO]->(:Decision)`
- `(:Input)-[:USED_BY]->(:Action)`
- `(:Decision)-[:TRIGGERED]->(:Action)`
- `(:Decision)-[:BLOCKED]->(:Action)`
- `(:Action)-[:PRODUCED]->(:Outcome)`
- `(:Action)-[:GENERATED]->(:Input)` (Cycles allowed for pipelines)
- `(:Outcome)-[:AFFECTED]->(:Decision)` (Feedback loops)

## Integrity Invariants

1.  **Tenant Isolation**: Every node must have a `tenantId`. No edge shall connect nodes with different `tenantId`s (except specifically marked cross-tenant shared resources like Global Policies, which are strictly read-only for tenants).
2.  **No Orphans**: Every node must be connected to at least one other node (except potentially root Inputs).
3.  **Immutability**: Once an `Action` or `Decision` is finalized (completed/recorded), its properties and outgoing edges are immutable.
4.  **Evidence Linking**: Every `Decision` and `Outcome` must link back to the `Input` (Evidence) that supported it.
5.  **Receipt Continuity**: Privileged transitions emit signed receipts that can be chained and verified end-to-end.

## Receipt Schema v1 (Privileged Transitions)

Receipt schema v1 is defined in [`provenance/receipt_schema_v1.json`](provenance/receipt_schema_v1.json).
It is the canonical serialization for privileged transition receipts and aligns to **Article IV — Data,
Provenance & Truth** in [`docs/governance/CONSTITUTION.md`](docs/governance/CONSTITUTION.md), ensuring every
output is attributable, explainable, replayable, and contestable.

### Required Semantics

- **spec_version**: `1.0.0` (schema version).
- **id / correlation_id**: Unique receipt ID + workflow/run trace linkage.
- **tenant_id / actor / action / resource**: Explicit governance context for traceability.
- **policy / result**: Policy decision provenance (bundle version + decision ID) and outcome.
- **signature**: Signed, canonicalized payload with key rotation (KID) support.

### Disclosure Controls

Receipt exports must apply redaction policies (PII/sensitive/financial) to honor constitutional
constraints and avoid secret or PII leakage. Evidence bundles must only expose redacted fields.

## Graph Projection

The graph is deterministically assembled from the immutable `ProvenanceLedger`.

1.  `ProvenanceEntry` (Log) -> Canonical Node (Graph)
2.  `MutationPayload` -> Node Properties
3.  `Attribution`/`Witness` -> Edges

## Versioning

- **Schema Version**: 2.0.0
- **Effective Date**: Sprint N+62
