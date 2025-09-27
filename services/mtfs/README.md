# Multi-Tenant Fairness Scheduler (MTFS)

MTFS provides deterministic, policy-aware arbitration for multi-tenant clusters.
It consists of a Rust scheduling core, a gRPC service, and a lightweight
TypeScript client wrapper.

## Components

- **`core/`** – Rust library implementing weighted fair queuing with
  policy tiers (gold/silver/bronze), burst credits, SLA monitoring, starvation
  detection, signed allocation snapshots, and a "what-if" simulator for weight
  overrides.
- **`server/`** – gRPC front end powered by [`tonic`](https://github.com/hyperium/tonic)
  that exposes job submission, allocation retrieval, snapshot streaming, and
  simulation endpoints.
- **`client/`** – TypeScript helper that loads the gRPC definitions at runtime
  for Node.js callers.

## Development

```bash
cd services/mtfs
cargo test
```

### Running the service

```bash
cd services/mtfs
cargo run -p mtfs-server -- --addr 0.0.0.0:50051
```

The TypeScript client expects the proto definition at `services/mtfs/proto` by
default, but an explicit path can be supplied when instantiating the client.
