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

- **Types**: `PolicyEvaluation`, `ManualApproval`, `ClassifierPrediction`, `RoutingDecision`, `OptimizationDecision`.
- **Properties**: `result` (ALLOW/DENY/FLAG), `confidence`, `policyVersion`, `evaluator`, `loopId`.

### 3. Action (Execution)

Represents a state-changing operation or a process execution.

- **Types**: `MaestroRun`, `IngestionJob`, `EnforcementAction` (e.g., Block User), `Deployment`, `OptimizationAction`.
- **Properties**: `status`, `startedAt`, `completedAt`, `durationMs`, `receiptId`.

### 4. Outcome (Result)

Represents the observable side-effect or final state resulting from an action.

- **Types**: `MetricValue`, `SystemState`, `Alert`, `GeneratedArtifact`, `OptimizationReceipt`.
- **Properties**: `value`, `timestamp`, `dimension`, `loopId`, `expectedOutcome`, `observedOutcome`.

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

## Graph Projection

The graph is deterministically assembled from the immutable `ProvenanceLedger`.

1.  `ProvenanceEntry` (Log) -> Canonical Node (Graph)
2.  `MutationPayload` -> Node Properties
3.  `Attribution`/`Witness` -> Edges

## Versioning

- **Schema Version**: 2.0.0
- **Effective Date**: Sprint N+62
