# Evidence Capsule Standard

Defines structure for encapsulating replayable analytic outputs across wedges.

## Components

- **Capsule payload**: bounded set of artifacts referenced by stable identifiers.
- **Replay token**: binds capsule to time window, index version, policy version, and schema version.
- **Cryptographic commitment**: Merkle root over artifact identifiers.
- **Audit envelope**: provenance metadata, signer, and attestation reference.

## Responsibilities

- Ensure deterministic recomputation when using the replay token.
- Preserve minimal disclosure while retaining verifiability.
- Align capsule schema with witness chains and transparency logs.
