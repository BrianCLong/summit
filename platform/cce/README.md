# Confidential Compute Engine (CCE)

This package provides a minimal enclave runtime scaffold with attestation verification, sealed storage, and a gRPC RunJob API. The service enforces region-local attestation and disallows network egress while producing sealed results and audit tokens.

## Components
- `pkg/attestation`: Quote verification against an allowlist of PCR digests and region.
- `pkg/sealed`: AES-GCM sealing keyed from attestation measurement.
- `pkg/manager`: Orchestrates attestation, hashing, sealing, and audit token creation.
- `pkg/server`: gRPC server exposing the RunJob endpoint using a JSON codec for simplicity.

## Running
```
cd platform/cce
GO111MODULE=on go test ./...
```
