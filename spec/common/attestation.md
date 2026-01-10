# Attestation

## Objective

Attestation provides a cryptographic statement that an artifact was produced by
trusted code running in a verified execution environment (TEE).

## Attestation Payload

- `artifact_id`
- `commitment_root`
- `replay_token`
- `policy_decision_id`
- `build_hash`
- `timestamp`

## Verification Workflow

1. Validate the TEE quote against the attestation service.
2. Confirm the quote binds the `commitment_root` and `replay_token`.
3. Store verification results in the transparency log.

## Required Outputs

- `attestation_quote`: raw quote from the TEE.
- `attestation_result`: verified/unverified with reason codes.
- `attestation_reference`: lookup handle stored in receipts.
