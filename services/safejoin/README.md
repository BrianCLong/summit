# SafeJoin PSI Engine

SafeJoin is a lightweight Rust microservice that coordinates privacy-preserving
set intersection and PSI joins using ECDH-derived hashed keys and Bloom filter
summaries. It supports two execution modes:

- **Intersection only** – returns the exact intersection size together with a
  Bloom filter cardinality estimate.
- **Aggregate** – computes DP-noised sums and counts for intersecting keys while
  preserving key privacy.

## Architecture

- Clients register an ephemeral X25519 public key. The server relays peer keys
  but never sees plaintext identifiers.
- Each client derives a shared secret, hashes identifiers via HMAC-SHA256, and
  loads them into the provided Bloom filter implementation.
- Aggregated attributes are perturbed with Laplace noise on the client before
  upload to maintain differential privacy guarantees.
- The server intersects hashed token sets, combines Bloom filters for
  diagnostics, and returns sanitized aggregates.

## Endpoints

```
POST   /sessions                       # create a new session
POST   /sessions/{id}/register         # register participant public key
GET    /sessions/{id}/peer             # poll for peer key availability
POST   /sessions/{id}/upload           # upload hashed tokens (+ aggregates)
GET    /sessions/{id}/result           # retrieve PSI result
```

## Development

```
cargo run --bin safejoin-server
```

Offline benchmarks simulate large intersections:

```
cargo run --bin safejoin-offline-bench
```

## Testing

```
cargo test -p safejoin
```

The correctness harness compares PSI results with plaintext joins to ensure the
service stays within the configured DP tolerance.
