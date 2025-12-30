# Template Attestation

## Inputs

- Measurement hash of executable transform logic or WASM bundle.
- Metadata descriptor including signer identity and policy effects.

## Validation Steps

1. Verify signature over measurement hash using trusted signer registry.
2. Bind attestation to template version and determinism token.
3. Record attestation result in witness ledger and transparency log.

## Runtime Attestation

- Optional TEE quote for runtime environment; attach to transform artifact when available.
