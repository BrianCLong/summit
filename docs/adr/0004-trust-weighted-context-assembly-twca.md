# ADR 0004: Trust-Weighted Context Assembly (TWCA)

- Status: Accepted
- Date: 2026-01-01
- Deciders: Brian C. Long

## Context

Context segments carry different trust levels based on source, provenance, and invariants. A deterministic assembly strategy is required to prefer trusted content and bound context size for model compatibility.

## Decision

Introduce a trust-weighted assembler that sorts segments by trust weight, applies a configurable limit, and preserves encoding metadata for downstream model invocation. The assembler is intentionally model-agnostic.

## Consequences

- **Positive:** Provides deterministic ordering and inclusion decisions, enabling reproducibility and auditability. Facilitates trust attenuation experiments in CCR.
- **Negative:** Requires calibration of trust weights and max segment limits per model/vendor.
- **Follow-up:** Integrate trust scoring inputs (provenance, policy evaluations) and surface assembly rationale in logs and metrics.
