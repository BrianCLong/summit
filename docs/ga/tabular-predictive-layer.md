# Tabular Predictive Layer (GA Guardrails)

## Summit Readiness Assertion

This work references the Summit Readiness Assertion as the governing readiness baseline. See
`docs/SUMMIT_READINESS_ASSERTION.md` for the authoritative readiness posture.

## Scope

This document defines the GA guardrails for the tabular predictive layer that subsumes tabular
modeling claims into Summit’s ingestion + GraphRAG stack with deny-by-default governance.

## Evidence IDs

- `EVD-FUNDAMENTAL-TABULAR-SCHEMA-001`
- `EVD-FUNDAMENTAL-PROVIDER-002`
- `EVD-FUNDAMENTAL-EVAL-003`
- `EVD-FUNDAMENTAL-POLICY-004`
- `EVD-FUNDAMENTAL-GRAPHRAG-BRIDGE-005`

## Feature Flags (Default OFF)

- `TABULAR_PREDICT_ENABLED`
- `EVAL_TABULAR_ENABLED`
- `TABULAR_GRAPHRAG_BRIDGE`

## Deny-by-Default Requirements

- Remote inference is disabled unless the feature flag is enabled **and** the provider host is
  allowlisted in policy **and** the runtime allowlist is explicitly set.
- Tabular inputs default to **Sensitive** classification.
- Never log raw cell values, row samples, identifiers, or join keys.

## Evidence Artifacts

Evidence files are stored under `evidence/fundamental-nexus-tabular/` and referenced by the
Evidence IDs above. Timestamps are allowed only in `stamp.json` and must be deterministic
(other files remain immutable unless explicitly updated with evidence).

## MAESTRO Threat Modeling Alignment

- **MAESTRO Layers:** Foundation, Data, Tools, Observability, Security.
- **Threats Considered:** prompt/feature injection, remote egress misuse, provenance gaps.
- **Mitigations:** allowlist-only egress, schema validation and length caps, provenance stamps tied
  to evidence IDs.

## Verification Plan

- Verification for this feature is mapped in `docs/ga/MVP-4-GA-VERIFICATION.md` and
  `docs/ga/verification-map.json`.
- `make ga-verify` must remain green for GA-related surfaces.
