# Transparency Log Service

The transparency log service provides append-only storage for digests of evaluator artifacts.

- Accepts digests for evaluator bundles, benchmark binders, capsules, and tier manifests.
- Supports inclusion proofs and lookup by replay token or interface version.
- Exposes attestation bindings when runs are executed inside TEEs.
