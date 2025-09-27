# Adaptive Consent-Aware Dataflow Compiler (ACDC)

ACDC is a Rust-based compiler that translates a high-level dataflow DSL into
per-node execution plans with consent-aware guards and proof hooks. The
repository also includes a TypeScript command-line interface that forwards to
the Rust binary.

## DSL Overview

The DSL describes sources, transforms, and sinks. Each node must declare a
purpose, jurisdiction, and retention window. Edges connect nodes using `->`
notation.

```
source ingest [purpose=analytics, jurisdiction=US, retention=30d]
transform clean [purpose=analytics, jurisdiction=US, retention=7d]
sink warehouse [purpose=analytics, jurisdiction=US, retention=90d]

ingest -> clean -> warehouse
```

## Building

```sh
cargo build --manifest-path acdc/Cargo.toml
```

## CLI Usage

Compile a plan directly with the Rust binary:

```sh
cargo run --manifest-path acdc/Cargo.toml -- \
  compile --dsl samples/acdc/demo.dsl \
  --policy samples/acdc/policy.json \
  --consent samples/acdc/consent.json
```

Compare plans with changing consent or policy:

```sh
cargo run --manifest-path acdc/Cargo.toml -- \
  simulate --dsl samples/acdc/demo.dsl \
  --policy samples/acdc/policy.json \
  --consent samples/acdc/consent.json \
  --updated-consent samples/acdc/consent.json
```

## TypeScript CLI

The CLI wrapper lives in `tools/acdc-cli`. After installing dependencies you
can run:

```sh
cd tools/acdc-cli
npm install
npm run build
npx acdc-cli compile samples/acdc/demo.dsl samples/acdc/policy.json \
  --consent samples/acdc/consent.json
```

The wrapper forwards to the Rust binary (or a custom executable specified via
`ACDC_BIN`) and supports the `compile` and `simulate` subcommands.
