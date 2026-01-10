# Witness Chains

Witness chains provide ordered evidence of intermediate computations so that artifacts can be
replayed or audited without reprocessing the full dataset.

## Structure

- **Entry header:** `{sequence, timestamp, transform_id, input_commitment}`
- **Entry body:** `{output_commitment, metrics, policy_decision_refs}`
- **Entry hash:** `hash(header || body || prior_hash)`

## Storage

- Stored alongside artifacts in a write-once store (e.g., append-only log or WORM bucket).
- Indexed by `artifact_id` and `sequence` for efficient retrieval.

## Verification

- Validate chain continuity by recomputing `entry_hash` and checking `prior_hash` linkage.
- Verify each `input_commitment` against the stored Merkle root.

## Disclosure Modes

- **Full:** all entries disclosed for internal audit.
- **Selective:** provide inclusion proofs for only the relevant steps.
- **Redacted:** replace body fields with hashes while preserving chain integrity.
