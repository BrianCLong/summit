# Switchboard Notary Adapter v1

## Purpose
Provide a pluggable signing interface for provenance receipts with local dev and staging KMS-backed implementations.

## Interface Contract
- `sign(receipt) -> signature` using RS256.
- `verify(receipt, signature) -> boolean`.
- `key_id` identifies the signing key; rotation is supported.

## Providers
- **local-dev-signer**: local keypair for development and testing.
- **staging-kms-signer**: KMS-backed signer for staging environments.

## Receipt Requirements
- Sign the canonicalized receipt payload.
- Store `key_id`, `algorithm`, and signature `value` in the receipt.
- Emit verification result via `POST /receipts:verify`.
