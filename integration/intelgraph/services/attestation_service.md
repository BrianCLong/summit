# Attestation Service

## Responsibility

- Verify TEE attestation quotes and bind them to artifact digests.
- Persist attestation envelopes for audit retrieval.

## Inputs

- `artifact_digest`
- `attestation_quote`
- `replay_token`

## Outputs

- Verification status (pass/fail).
- Attestation reference ID for downstream artifacts.

## Observability

- Metrics: `attestation.verify.count`, `attestation.verify.failures`.
- Logs: include artifact type, digest prefix, and replay token hash.
