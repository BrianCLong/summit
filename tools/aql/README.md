# Audit Query Language (AQL)

`aql` is a reference implementation of a cross-system Audit Query Language and execution engine. It provides:

- A Rust compiler and execution engine that parses AQL queries, federates evidence from heterogeneous connectors, and emits deterministic results and traces.
- Connectors backed by canonical fixtures for logs, provable ledgers, identity translation layers (IDTL), and MPC proof archives.
- A TypeScript CLI that wraps the Rust binary and renders human-friendly summaries or raw JSON.
- An offline verifier that replays provenance to guarantee byte-identical results for identical inputs.

## Query language overview

The DSL is intentionally compact. A typical query looks like:

```
FIND events
WHERE subject = "Alice" AND action = "LOGIN"
FROM logs, ledger
BETWEEN 2024-01-01T00:00:00Z AND 2024-01-31T23:59:59Z
PROVENANCE JOIN ledger ON event_id
PROVENANCE JOIN idtl ON event_id
PROVENANCE JOIN mpc ON event_id
WITH PROOFS
EXPLAIN TRACE
```

### Grammar highlights

- `FIND <target>` identifies the evidence family (free-form string).
- `WHERE` accepts one or more equality predicates joined with `AND`.
- `FROM <connector[, ...]>` selects connectors. Supported connectors are `logs`, `ledger`, `idtl`, and `mpc`.
- `BETWEEN <start> AND <end>` (optional) constrains timestamps.
- `PROVENANCE JOIN <connector> ON <field>` (repeatable) performs provenance joins across connectors using a shared field (e.g., `event_id`).
- `WITH PROOFS` attaches cryptographic proof bundles from each connector.
- `EXPLAIN TRACE` emits a deterministic execution trace.

The compiler normalises all output (records, proofs, trace steps) to guarantee byte-identical JSON for identical inputs.

## Repository layout

```
Cargo.toml         # Rust crate manifest
src/               # Rust engine, connectors, verifier, and CLI entrypoint
fixtures/          # Canonical connector fixtures and proofs
package.json       # TypeScript CLI metadata
ts/                # CLI implementation (Node/TypeScript)
```

## Building the Rust compiler

```
cargo build --release
```

This produces `target/release/aqlc` which the CLI (and tests) use by default.

## Running a query with the Rust binary

```
./target/release/aqlc --file samples/find-alice.aql --fixtures fixtures --verify runs/alice.json
```

- `--query` allows inline queries.
- `--verify` replays provenance against a captured `ExecutionResult` JSON file.
- `--output` writes deterministic JSON instead of printing to stdout.

## TypeScript CLI

Install dependencies and build:

```
npm install
npm run build
```

Run a query:

```
node dist/cli.js --file samples/find-alice.aql --fixtures fixtures --show-trace
```

Or interactively during development:

```
npm run dev -- --query "FIND events WHERE subject = \"Alice\" FROM logs, ledger WITH PROOFS"
```

CLI options:

- `--query` / `--file` – supply the query inline or via file (one is required).
- `--fixtures` – directory of connector fixtures (defaults to `fixtures/`).
- `--compiler` – path to a prebuilt `aqlc` binary. Defaults to `target/release/aqlc` or `cargo run` fallback.
- `--verify` – passes through to the Rust verifier for offline replay.
- `--output` – write canonical JSON to file.
- `--json` – stream the raw JSON emitted by the compiler.
- `--show-trace` – print the deterministic execution trace.

## Deterministic verification

The verifier (`Verifier::verify`) canonicalises both expected and actual runs. If any record evidence, proofs, or trace entries differ the verifier raises a `verification` error. This guarantees byte-identical outputs for identical inputs, satisfying the acceptance criteria.

## Fixtures

The `fixtures/` directory contains deterministic evidence for all connectors. Each connector also includes a corresponding `*-proofs.json` file so `WITH PROOFS` queries can return full provenance bundles.

## Tests

Run all library and binary tests:

```
cargo test
```

The test suite covers parsing, connector determinism, engine execution, and verifier replay.
