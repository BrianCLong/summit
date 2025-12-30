# Transparency Log

The transparency log records digests of evaluator bundles, capsules, and tier manifests.

## Requirements

- Append-only ledger with timestamped entries and Merkle commitments.
- Supports lookups by replay token, interface version, and performer identity.

## Publication

- Publish entries when evaluator bundles, benchmark binders, or capsules are generated.
- Provide audit proofs for evaluators to confirm inclusion.

## Retention and access

- Retain entries for the program duration plus transition period.
- Permit evaluator read access and performer write access through attested services.
