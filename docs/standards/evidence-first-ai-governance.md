# Evidence-First AI Governance (Standard)

## Intent

Summit emits evidence artifacts as a **normal byproduct of operation** to keep audit readiness continuous, verifiable, and deterministic.

## Scope

- Evidence ledger + audit bundle export.
- Continuous compliance signals derived from runtime events.
- Lineage chain: policy → data → model/agent → action → outcome.

## Non-Goals

- Not a GRC replacement.
- Not a model registry rewrite.
- Not end-to-end EU AI Act compliance; only traceability primitives.

## Import / Export Matrix

### Imports

- Policy definitions: `src/governance/policy/**` (adapter-friendly).
- Agent run metadata: `src/agents/**` (hooks).
- Data access events: `src/connectors/**`, `src/graphrag/**` (hooks).

### Exports

- Audit bundle directory (JSON/NDJSON).
- Continuous compliance scorecard (JSON) for dashboards.
- Optional GraphQL/REST endpoints (later PR).

## Determinism Rules

- `bundle.json`, `policy_snapshot.json`, and `redaction_report.json` are deterministic.
- Timestamps allowed only in runtime logs, not in committed artifacts.
- Stable evidence IDs are derived from canonicalized payloads.

## Evidence ID Standard

- Format: `ev:<kind>:<sha256-12>`.
- Canonical JSON with stable key ordering.

## Claim Alignment

- Audit readiness by construction.
- End-to-end lineage chain for every run.
- Regulator-style evidence packs on demand.
- Continuous compliance over point-in-time certification.
- Evidence-first verification of policy application.

## Governance Interfaces (Phase Plan)

1. Emit events + export bundles (logging-only).
2. Continuous scoring + remediation queue.
3. Optional enforcement hooks (feature-flagged).
