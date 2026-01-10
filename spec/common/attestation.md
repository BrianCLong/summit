# Attestation

## Purpose

Attestation binds computation to a trusted execution environment (TEE),
allowing verifiers to confirm integrity of sensitive analytics.

## Attestation payload

- Measurement of the runtime and binary hash.
- Policy version and determinism token.
- Artifact ID and output hash.

## Verification flow

1. Verify TEE quote signature.
2. Validate measurement against approved hashes.
3. Confirm policy and determinism token match artifact metadata.

## Storage

- Store attestation quotes alongside artifacts.
- Persist quote digests in the transparency log.
