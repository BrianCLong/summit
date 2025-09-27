# Enclave Feature Store (EFS)

EFS is a minimal enclave-side feature store that seals feature payloads per tenant and only releases them when a caller presents a valid attestation request. The mock TEE uses per-tenant sealing keys derived from a master secret and signs quotes that include the caller nonce and the policy hash.

## Components

- **Rust core (`efs` crate):** Implements sealing, storage abstractions, attestation, and replay protection.
- **Postgres backing:** `sql/schema.sql` defines an encrypted feature table leveraging `BYTEA` columns for sealed blobs and storing policy hashes for verification.
- **Offline verifier:** `efs-offline-verifier` validates attestation quotes and sealed payload hashes without enclave access.
- **TypeScript SDK:** Located in `sdk/typescript/src/efs`, providing helpers for requesting and verifying attested features.

## Running Tests

```bash
cd services/efs
cargo test
```

## Offline Verification

```bash
cargo run --bin efs-offline-verifier \
  --quote ./quote.json \
  --sealed-blob ./sealed.json \
  --attestation-key <hex-encoded-key>
```

The tool checks the signature and recomputes the measurement hash for the sealed payload.
