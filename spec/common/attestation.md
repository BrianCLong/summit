# Attestation

## Purpose

Attestation binds computations to trusted execution environments (TEEs) or controlled runtimes, enabling verifiers to trust artifacts without raw data exposure.

## Components

- **Attestation quote**: Hardware- or runtime-produced evidence of code identity and configuration.
- **Binding**: Proof objects, transparency log entries, and receipts include attestation hashes to connect outputs to trusted execution.
- **Policy checks**: Verify enclave identity, measurements, and freshness before accepting artifacts.

## Operational guidance

- Cache attestation validations for short-lived reuse; include nonce-based freshness to prevent replay.
- Rotate measurement allowlists with policy versions and record transitions in the transparency log.
- Provide fallback verification paths (e.g., sandbox-only) when TEEs are unavailable, with explicit downgrade markers.
