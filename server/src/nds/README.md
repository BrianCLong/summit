# Narrative Dominance Suite (NDS) v0.1

## Purpose
NDS is the governance-first subsystem for narrative risk modeling, built to produce deterministic,
auditable outputs without any execution capability. It focuses on early-warning, resilience, and
investigation-grade narrative analysis.

## Scope (v0.1)
- **Narrative Operating Graph (NOG)** snapshot construction from curated OSINT fixtures.
- **Lifecycle tagging** using deterministic heuristics (seed → amplify → peak → mutate/decline).
- **Policy-gated simulation** that emits advisory-only reports and a policy decision record.
- **Evidence artifacts** emitted in deterministic JSON (report/metrics/stamp separation).
- **Append-only audit events** with hash-chain verification for tamper detection.

## Non-goals (v0.1)
- No automated execution or publishing.
- No microtargeting or identity-based persuasion tooling.
- No user-level psychological profiling.

## Integration posture
- Feature-flagged entrypoint with deny-by-default behavior.
- Policy enforcement aligns with Summit OPA ABAC direction and audit logging standards.
- Evidence artifacts follow deterministic conventions (sorted keys, stable IDs, no wall-clock time).

## Determinism guarantees
- Stable hashes for IDs and evidence IDs.
- Sorted keys and arrays.
- Fixed time bucketization (no raw timestamps in artifacts).

## Evidence outputs (planned)
- `artifacts/nds/nog.snapshot.json`
- `artifacts/nds/metrics.json`
- `artifacts/nds/pdr.json`
- `artifacts/nds/stamp.nds.json`

## Security & governance anchors
- Policy-as-code enforcement (OPA-compatible interface).
- Audit log hash chaining for tamper detection.
- Never-log rules for OSINT raw text bodies.
