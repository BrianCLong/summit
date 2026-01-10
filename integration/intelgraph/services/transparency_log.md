# Transparency Log Service

The transparency log stores append-only receipts for evaluator runs and OA/MOSA
package generation.

## Event Types

- Evaluator run completion
- Conformance suite publication
- Rights assertion updates
- Shard manifest generation

## Guarantees

- Append-only log with Merkle tree inclusion proofs.
- Publicly verifiable digests without exposing proprietary content.
