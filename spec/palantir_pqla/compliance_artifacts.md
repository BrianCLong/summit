# Compliance Artifacts (PQLA)

## Artifact Contents

- Commitment to analytics request and query plan.
- Policy decision ID and rule digest.
- Commitment to transformed output.
- Determinism token for replay.
- Attestation statement for sandbox execution.

## Storage

- Store in witness ledger and transparency log.
- Hash-chain artifacts by request lineage.

## Verification

1. Validate policy decision against policy engine logs.
2. Recompute commitments from stored summaries.
3. Verify attestation measurement hash.
