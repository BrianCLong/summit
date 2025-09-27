# Deterministic Embedding Store (DES)

The DES crate provides the core primitives for storing and comparing versioned
embeddings with reproducible metadata. Embeddings are keyed by item identifier
and version, and records capture the full configuration required to recreate the
vector: model/tokenizer digests, quantization recipes, pooling strategy, and
normalization pipeline.

Key capabilities:

- Deterministic pipeline application with explicit pre/post-normalization steps
  and optional quantization.
- Thread-safe, idempotent `EmbeddingStore` that rejects conflicting re-embeds
  under the same configuration.
- Deterministic batching helpers to guarantee reproducible job boundaries.
- Cosine drift diff tooling to highlight numerical deltas between versions.

TypeScript and Python SDKs expose the same abstractions for clients that do not
link against Rust directly. All SDKs share the same canonical JSON
serialization, enabling portable snapshots across languages.
