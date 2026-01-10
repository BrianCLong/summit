# Attestation Service

## Responsibilities

- Verify TEE quotes for wedge computations.
- Bind attestation results to commitment roots and replay tokens.

## Inputs

- `attestation_quote`
- `artifact_id`
- `commitment_root`

## Outputs

- `attestation_reference`
- Verification status + reason codes
