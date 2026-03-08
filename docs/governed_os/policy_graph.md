# Policy Graph

## Definition
The Policy Graph is the authoritative governance fabric for Summit. It expresses policy as
first-class, graph-native objects that are compiled into enforceable policy-as-code. The Policy
Graph is the single source of truth for scoped capabilities, approvals, and export gates.

## Core Nodes

- `Policy`
- `Rule`
- `Scope`
- `Actor`
- `Capability`
- `ApprovalStep`
- `ExportGate`
- `ResidencyConstraint`

## Core Edges

- `APPLIES_TO`
- `REQUIRES`
- `ALLOWS`
- `DENIES`
- `ESCALATES_TO`
- `SATISFIED_BY`

## Compilation Model

1. **Ingest**: policy definitions are ingested into the graph as structured nodes/edges.
2. **Normalize**: rules are normalized to a canonical intermediate representation.
3. **Compile**: normalized rules compile into policy-as-code with deny-by-default semantics.
4. **Explain**: a policy explainability tree is generated for each compiled decision path.

## Enforcement Points

- **Maestro Runtime**: each agent step is bound to an execution identity with scoped
  capabilities.
- **Export Gates**: all exports must satisfy policy requirements and approvals.
- **Policy Changes**: policy edits require approvals, diff artifacts, and deterministic evidence
  bundles.

## Determinism & Evidence

Policy decisions are deterministic when executed against a fixed tuple of:
- Policy graph version
- Capability scope and execution identity
- Policy-as-code version
- Approval stamps

Deterministic execution produces a `stamp.json` artifact that encodes the decision outcome,
rule path, and evidence hashes. No policy decision is accepted without a stamp.

## Explainability Artifact

Every gated workflow produces a **Policy Explainability Artifact** that links:

- `Policy` → `Rule` → `Scope` → `ApprovalStep` → `EvidenceArtifact`

This artifact is consumed by Auditor Verify to validate every decision without human
interpretation.

## Compliance Assertions

- Deny-by-default is mandatory.
- All policy decisions generate explainability artifacts.
- No policy change is valid without approval + diff artifacts.

## Status

Governed OS policy graph scope is tracked via the Governed OS epic and aligned to the Summit
Readiness Assertion.
