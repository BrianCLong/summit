# Commitments and Receipts

Shared commitments and receipt structures reused across wedges.

## Commitments
- Merkle roots over evidence nodes or support sets.
- Witness chains representing ordered application of migration steps or macro execution.
- Attestation quotes from trusted execution environments when enabled.

## Receipts
- Origin certificates, collision proofs, compatibility proofs, macro justifications, and linkage receipts share:
  - Snapshot/replay identifiers (seed, schema/policy/index versions, time windows).
  - Proof budgets (evidence count, verification time) embedded for reproducibility.
  - Hashes of supporting evidence with deterministic ordering.

## Transparency
- Receipts are appended to a transparency log with immutable sequence numbers.
- Replay service rehydrates provenance to validate certificates under the same budgets.
