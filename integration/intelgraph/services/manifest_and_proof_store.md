# Manifest and Proof Store

Stores immutable manifests and proof objects used across evaluator runs.

## Stored Artifacts

- Metric proof objects
- Witness chain digests
- Conformance suite manifests
- Determinism token schemas

## Requirements

- Content-addressed storage keyed by hash.
- Append-only guarantees for transparency log integration.
- Policy-as-code checks before disclosure to evaluators.
