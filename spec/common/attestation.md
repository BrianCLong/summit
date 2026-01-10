# Attestation

Attestation binds execution environments and artifacts to trusted measurements.

## Attestation Envelope

| Field              | Type   | Description                                |
| ------------------ | ------ | ------------------------------------------ |
| `attestation_id`   | string | Identifier for the attestation statement.  |
| `measurement_hash` | string | Hash of the executable or container image. |
| `signer_id`        | string | Trusted signer identity.                   |
| `signature`        | string | Signature over the measurement hash.       |
| `timestamp`        | string | RFC 3339 timestamp.                        |
| `environment_id`   | string | Runtime or TEE instance ID.                |

## Validation Requirements

- Verify signature against a trusted signer list.
- Ensure measurement hash matches the running artifact.
- Bind attestation to the commitment envelope and witness ledger entry.

## Usage by Wedge

- **CIRW:** attest clustering runtime.
- **FASC:** attest calibration and drift detection engine.
- **PQLA:** attest sandbox execution environment.
- **SATT:** attest transform templates and runtime execution.
- **QSDR:** attest monitoring and kill-switch logic.
