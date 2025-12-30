# Guardrail: Attestation Required

MC tools must validate attestation before executing templates or analytics in sensitive contexts.

## Requirements

- SATT executions require verified template measurement signatures.
- PQLA jobs in TEE contexts must include attestation quote verification.
- CIRW/FASC model bundles optionally attested; enforcement toggled via policy.

## Failure Handling

- Deny execution and log policy decision identifier when attestation fails or is missing.
