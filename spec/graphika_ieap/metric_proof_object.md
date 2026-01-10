# Metric Proof Object

Provides evaluator-verifiable evidence for IEAP component runs.

## Contents

- Determinism token and component version.
- Metrics payload with schema version.
- Merkle root over intermediate artifacts and witness chain pointer.
- Budget enforcement record (runtime, memory, egress events) and any halts.
- Optional TEE attestation quote and transparency log entry ID.

## Serialization

- Canonical JSON with deterministic key ordering; signed envelope with performer identity.
- Sized for transport but references external artifact storage via hashes.
