# Maltego — Source-Attested Transform Templates (SATT)

SATT packages transforms as attested templates with license metering, rate limits, and disclosure
constraints. Outputs include license receipts and witness chains.

## Objectives

- Attest transform templates and runtime execution.
- Enforce license metering and rate limits.
- Apply disclosure constraints on outputs.
- Produce license receipts and witness entries for audit.

## Architecture

1. **Template Registry:** Stores signed template metadata and measurement hashes.
2. **Attestation Verifier:** Validates signer identity and measurement hash.
3. **Metering Engine:** Tracks license consumption per tenant.
4. **Transform Runtime:** Executes templates in sandboxed environment.
5. **Receipt Ledger:** Stores license receipts and witnesses.

## Workflow

1. Receive template + metadata descriptor.
2. Validate attestation and policy authorization.
3. Enforce license budget and rate limits.
4. Execute template and apply disclosure constraints.
5. Emit transform artifact with license receipt.

## Policy-as-Code Hooks

- Template approval and license enforcement are policy-governed.
- Disclosure constraints defined as policy rules.

## Safeguards

- Cache outputs keyed by template hash with invalidation on hash change.
- Quarantine templates with invalid attestation.
