# Sandbox Runtime

## Role

Controlled execution environment for POAR plans and EAMS modules with budget enforcement and egress accounting.

## Responsibilities

- Enforce runtime, memory, and network egress limits; emit halt events on violation.
- Provide determinism seeds to stabilize randomized components.
- Emit egress receipts and proof object hooks for downstream proof service ingestion.
- Support attestation for environments with TEE capability.
