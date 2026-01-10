# Transparency Log

Defines append-only transparency logging for evaluator-relevant artifacts.

## Entries

- Artifact type (metric proof object, label manifest, OA/MOSA package, capsule witness chain, shard manifest).
- Artifact hash/digest and optional Merkle root.
- Component version and determinism token reference.
- Timestamp, signer identity, and attestation quote (if available).

## Operations

- Append-only writes; no deletions or edits.
- Verification API to retrieve entry by hash and validate signature.
- Supports cross-organization replication for evaluator access.
- Log inclusion proofs are stored by the transparency log service (`integration/intelgraph/services/transparency_log.md`).

## Usage

- Every evaluator-run artifact must produce a transparency log entry.
- Evaluators validate entries before accepting outputs or labels.
