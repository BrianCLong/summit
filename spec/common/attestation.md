# Attestation Model

Trusted execution environment (TEE) support strengthens confidence in computation outputs.

## Components

- **Execution enclave:** isolates computation with sealed inputs.
- **Quote:** attests to measurement hash, input digests, and output digest; bound to replay token.
- **Verifier:** validates quotes against platform roots and expected measurements.

## Integration Points

- Role certificates, attribution artifacts, governance reports, inversion artifacts, and shard manifests can embed attestation quotes.
- Attestation service should persist quotes and expose verification APIs.
