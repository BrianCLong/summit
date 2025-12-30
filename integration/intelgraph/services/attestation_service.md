# Attestation Service

Coordinates trusted execution environment (TEE) attestations for wedge computations.

## Responsibilities
- Issue attestation requirements based on policy gateway decisions.
- Verify attestation quotes embedded in receipts and bind them to replay tokens.
- Record attestation status in transparency log and receipt ledger.
- Provide attestation verification to replay service during deterministic replays.
