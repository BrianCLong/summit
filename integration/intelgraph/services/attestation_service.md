# Attestation Service

## Responsibilities

- Collect TEE quotes for sensitive computations.
- Verify quotes against approved measurements.
- Attach attestation metadata to artifacts.

## Inputs

- Binary measurement, runtime metadata, determinism token.

## Outputs

- Attestation quote and verification status.

## Dependencies

- TEE attestation provider.
