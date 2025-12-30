# Transform Receipts and Witnesses

## Receipt Contents

- License consumption (executions/time/bytes) with remaining balance.
- Measurement hash and template version.
- Policy decision identifier and disclosure constraint parameters.
- Commitment to input entity and outputs (hash or Merkle root).
- Determinism token and optional runtime attestation quote.

## Witness Record

- Minimal support set proving compliance with license and disclosure constraints.
- Hash-chained into transparency log and witness ledger.

## Transparency & Audit

- Receipts stored in append-only ledger; inclusion proofs provided to tenants.
- Revocation path if signer removed from trusted registry; cached outputs invalidated.
