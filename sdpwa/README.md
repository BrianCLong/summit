# sdpwa

Streaming Differential Privacy Window Aggregator (SDPWA) is a Rust library for computing noisy counts and sums over tumbling and sliding windows at the network edge. It enforces per-identity contribution bounds, applies deterministic ChaCha20-based noise for reproducibility, and maintains an auditable privacy ledger that tracks advanced composition across window releases.

## Features

- **Streaming windows**: Supports both tumbling and sliding windows through configurable window sizes and strides.
- **Contribution bounding**: Clips per-identity counts and values to enforce local sensitivity constraints before noise addition.
- **Deterministic noise seeding**: Derives Laplace noise draws from a drift-safe ChaCha20 seed mixed with window coordinates.
- **Advanced composition ledger**: Maintains a running ledger of epsilon/delta usage and exposes it for audits.
- **Auditor**: Recomputes the ledger's cumulative privacy loss to verify the runtime ledger.
- **TypeScript bindings**: Ships with a lightweight wrapper for `wasm-pack` builds, enabling the same streaming logic inside Node.js or browser runtimes.

## Building & Testing

```bash
cargo test --manifest-path sdpwa/Cargo.toml
```

## WebAssembly Bindings

Build the bindings via `wasm-pack` using the optional `wasm` feature:

```bash
wasm-pack build . --features wasm --target bundler --out-dir pkg
```

After the build, use the package in TypeScript projects with the bindings located at `bindings/ts`.

## Auditing Workflow

The runtime ledger stores a full history of window-level privacy usage. The bundled `Auditor` recomputes the cumulative epsilon via advanced composition and compares it with the ledger. Consumers can serialize the ledger, transmit it to a central service, and independently verify privacy guarantees.
