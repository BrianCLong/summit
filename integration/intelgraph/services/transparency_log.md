# Transparency Log Service

## Responsibilities

- Append-only storage of artifact digests (proofs, receipts, forecasts).
- Provide inclusion proofs and checkpoints.

## Inputs

- Artifact digest, metadata, and timestamp.

## Outputs

- Inclusion proof and checkpoint reference.

## SLIs/SLOs

- Append latency p95 < 500ms.
- Integrity verification success rate 100%.
