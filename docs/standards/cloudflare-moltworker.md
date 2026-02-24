# Sandboxed Agent Runtime + Edge Router Pattern (Cloudflare Moltworker Reference)

## Status

Experimental. Feature-flagged, default OFF. Designed for adapter parity with Cloudflare Sandboxes but provider-agnostic by contract.

## Readiness Assertion

This standard is governed by the Summit Readiness Assertion and the governing constitution. Implementation is blocked unless evidence bundles and policy-as-code gates are satisfied.

## Purpose

Define a reference architecture and interoperability contract for running Summit agent workloads in isolated runtime containers behind an edge router. The pattern preserves deterministic evidence bundles, policy-controlled tool/model/browser access, and durable state in a blob/object store.

## Authority Files

- docs/SUMMIT_READINESS_ASSERTION.md
- docs/governance/CONSTITUTION.md
- docs/governance/META_GOVERNANCE.md
- docs/governance/AGENT_MANDATES.md
- agent-contract.json
- docs/ga/TESTING-STRATEGY.md
- docs/ga/LEGACY-MODE.md

## Reference Architecture

```
+-------------------------+          +----------------------------+
| Edge Router (Worker)    |          | Policy/Observability Stack |
| - API + Admin Gateway   |<-------->| - Policy-as-code (OPA)     |
| - Authn/Authz           |          | - Evidence bundler         |
| - Tool/Model Broker     |          | - Audit logging            |
+-----------+-------------+          +--------------+-------------+
            |                                       |
            v                                       v
+-------------------------+          +----------------------------+
| Sandboxed Agent Runtime |          | Object/Blob Store          |
| - Isolated containers   |<-------->| - State + memory           |
| - Deterministic steps   |          | - Evidence bundles         |
+-------------------------+          +----------------------------+
            |
            v
+-------------------------+
| Gateway Adapters        |
| - Model gateway         |
| - Browser automation    |
+-------------------------+
```

## Interop Matrix (Summit ↔ Runtime)

| Direction | Artifact | Required Fields | Notes |
| --- | --- | --- | --- |
| Summit → Runtime | RunSpec | evidenceId, toolAllowlist, modelPolicy, persistence, budget | EvidenceId must map to evidence bundles and deterministic stamps. |
| Runtime → Summit | StepEvents | stepId, inputsHash, outputsHash, timestamps? | Timestamps must be deterministic or omitted. |
| Runtime → Summit | EvidenceBundle | report, metrics, stamp | Stamp must be derived from stable inputs only. |
| Runtime → Summit | AuditEvents | actor, action, policyDecision, outcome | AuthZ and policy decisions must be logged. |

## Policy Requirements

- Deny-by-default for tools, network egress, model providers, and browser automation.
- All regulatory logic must be expressed as policy-as-code.
- Evidence bundles are mandatory for every run.
- Sandbox runtime cannot receive direct user input for graph queries; all queries must flow through the IntentCompiler and EvidenceBudget validators.

## Persistence Contract

- State is stored in an object/blob store namespace scoped per run.
- Runtime containers are assumed ephemeral; state restoration must be explicit on startup.
- Retention is configurable; defaults are defined in the data-handling standard.

## Feature Flags

- FEATURE_SANDBOX_RUNTIME=0 (default)
- FEATURE_SANDBOX_RUNTIME_ADAPTER_CLOUDFLARE=0 (default)

## Experimental Guardrails

- Adapter is opt-in and must be explicitly enabled in CI.
- “Governed Exception” is required for any deviation from evidence or policy requirements.
- No claims of product support; parity is a proof-of-concept only.

## Non-Goals

- Reimplementing OpenClaw or Moltworker.
- Shipping a production Cloudflare deployment.
- Removing evidence or policy gates.

## Determinism Rules

- No nondeterministic timestamps in evidence bundles.
- Stamps must be derived from stable inputs only.
- Evidence IDs must be stable within a run namespace.

## Implementation Notes

- Node.js compatibility improvements are leveraged where safe; runtime extensions must pass dependency security scans and lockfile enforcement.
- All adapters must emit observability hooks for policy decisions and runtime failures.

## Compliance Notes

- Evidence bundles must align with the repository evidence schema and policy validation.
- Any compliance requirement not expressible as policy-as-code is treated as incomplete.
