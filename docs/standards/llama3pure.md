# llama3pure-Inspired GGUF Reference Mode (Summit Standard)

## Readiness Alignment

This standard is governed by the Summit Readiness Assertion and remains intentionally constrained
until the minimal, deterministic inspection-and-policy surface is certified. See
`docs/SUMMIT_READINESS_ASSERTION.md` for readiness posture and invariants.

## Scope

Summit adopts a **dependency-minimal GGUF inspection and policy gate** inspired by the
llama3pure approach, without copying code or claiming performance parity.

### In-Scope

- GGUF inspection (metadata + tensor headers only; no weight materialization).
- Deterministic JSON artifacts for inspection and policy decisions.
- Target-specific policy checks (web/node/native) with explicit memory and file-size caps.
- Explainable execution flow for debugging and conformance checks.

### Non-Goals

- High-performance inference.
- GPU kernels or acceleration paths.
- Full chat state management or long-form conversation orchestration.

## Interop Matrix

| Direction | Artifact | Purpose |
| --- | --- | --- |
| Import | GGUF files (read-only) | Metadata inspection and policy evaluation |
| Export | Deterministic JSON reports | Evidence-grade artifacts for conformance and drift detection |

## Determinism Requirements

- Output artifacts must be stable across runs with the same inputs.
- No timestamps or environment-specific fields in reports.
- Hashes must be computed on stable, canonicalized content.

## Policy Constraints (Deny-by-Default)

- Web targets must fail closed when file size exceeds 2GB.
- All targets must enforce hard caps on tensor sizes and context limits.
- Policy violations must emit deterministic, machine-verifiable error reports.

## Governance Notes

- Legacy bypasses are treated as **Governed Exceptions** only with explicit, documented approval.
- All changes must keep evidence artifacts aligned to the authoritative definitions.
- Any policy logic must be expressed as policy-as-code before merge.
