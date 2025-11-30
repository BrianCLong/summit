# Confidential Compute Engine (CCE)

The CCE module provides a lightweight enclave manager with attestation verification, sealed storage, and a gRPC-style job runner API. It is designed to operate without external network dependencies so that it can be executed inside sandboxed CI environments.

## Components
- **Enclave Manager**: Coordinates attestation verification, executes deterministic enclave-safe jobs, and seals results.
- **Attestation Verifier**: Validates quotes against manifest measurements and region allow-lists.
- **Sealed Storage**: Uses AES-GCM with envelope keys that are unwrapped inside the enclave boundary; opening requires the enclave-only KMS wrap token.
- **RunJob API**: gRPC-style JSON endpoint (`/api.ComputeEnclave/RunJob`) exposed over HTTP for easier local testing while keeping egress disabled.

## Running
```
cd platform/cce
GO111MODULE=on go test ./...
go run ./cmd/cced
```

The server listens on `:8443` by default. Configure with env vars:
- `CCE_BIND_ADDR`: address to bind (default `:8443`).
- `CCE_SEAL_KEY`: base64 key used to derive envelope keys.
- `CCE_ALLOWED_REGIONS`: comma-separated list of regions permitted for attestation (default `us-east-1,us-west-2`).

Region pinning and egress lock-down are enforced in the `EnclaveManager`: attempts to allow egress or present quotes from other regions fail fast, ensuring the workload remains region-local to the configured TEE pool.

## SDKs
- **TypeScript**: `sdk/cce-ts/index.ts` provides a `CCEClient` with default test quotes and a `runJob` helper.
- **Python**: `sdk/cce-py/cce.py` offers the same interface without external dependencies (uses `urllib`).

## Manifest
`manifest.yaml` contains enclave measurements and attestation quotes used to validate incoming requests.
