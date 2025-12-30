# Maltego — Source-Attested Transform Templates with License Metering (SATT)

SATT packages transforms as attested templates with explicit license metering, rate limits, and disclosure constraints; outputs include license receipts and witness chains.

## Objectives

- Validate transform templates before execution using attestation over measurement hashes.
- Enforce license budgets (executions, time, bytes) per tenant.
- Apply disclosure constraints to outputs and emit receipts with commitments and witnesses.

## Workflow Overview

1. **Template Intake:** Receive transform template with executable logic and metadata descriptor (license policy, disclosure constraint, policy effects).
2. **Attestation Validation:** Verify signature over measurement hash against trusted signer list; record result.
3. **Execution Request:** Accept input entity and enforce per-source rate/concurrency limits.
4. **Metering:** Decrement license budgets; reject if exhausted.
5. **Execution & Disclosure:** Run transform, apply disclosure constraints (egress bytes, entity count).
6. **Artifact Emission:** Output transform artifact with outputs, license receipt, witness record, and determinism token.

## Governance Hooks

- Receipts hash-chained into ledger; cached outputs invalidated if measurement hash changes.
- Policy engine must authorize executions that include export effects.
