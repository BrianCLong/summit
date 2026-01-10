# Commitments & Receipts

## Purpose

Commitments provide a tamper-evident link between an emitted artifact (certificate,
macro, or canonical indicator) and the evidence used to generate it. Receipts
capture the execution metadata needed for audit and replay.

## Commitments

- **Merkle Root**: Hash of evidence identifiers, inputs, and key parameters.
- **Commitment Payload**:
  - `evidence_ids[]`
  - `input_snapshot_id`
  - `policy_decision_id`
  - `model_version`
  - `replay_token`
- **Hash Function**: SHA-256 (or stronger) with explicit versioning.

## Receipts

Receipts are append-only records in the transparency log.

**Required fields**:

- `artifact_id`
- `artifact_type`
- `commitment_root`
- `policy_decision_id`
- `generated_at`
- `issuer`
- `attestation_quote?`

## Validation Steps

1. Recompute Merkle root from stored evidence identifiers.
2. Verify `policy_decision_id` against policy-as-code logs.
3. Confirm `replay_token` determinism for recomputation.
4. If attested, verify TEE signature and nonce binding.

## Failure Modes

- **Missing evidence**: block artifact promotion to production workflows.
- **Commitment mismatch**: escalate to governance review.
- **Policy decision missing**: invalidate artifact and flag for remediation.
