# Keyless KMS Proxy (KKP)

KKP is a Rust-based proxy that mints policy-bound envelope decryption tokens. It unifies
AWS, GCP, and Azure KMS workflows behind a single interface while enforcing Open Policy
Agent (OPA) rules on every token issuance and decrypt request.

## Features

- **Policy-scoped tokens** – Ed25519-signed JWT-style tokens expire quickly and scope
decryption to a backend/key pair plus arbitrary policy claims.
- **Multi-cloud envelope encryption** – In-memory KMS adaptors emulate AWS, GCP, and Azure
providers using AES-GCM wrapped data keys to enable deterministic tests.
- **OPA integration** – Rego policies (see `policy/kkp.rego`) gate token issuance,
encryption, and decryption based on contextual claims such as environment or audience.
- **Offline verification** – Clients can cache JWKS output (`/keys/jwks`) and verify
tokens without calling the proxy. TypeScript and Python SDKs provide helpers.
- **Automated key rotation** – The proxy maintains an Ed25519 signing key ring, rotates on
an interval, and exposes manual rotation via `/keys/rotate`.
- **Benchmarks** – Criterion benchmarks (see `cargo bench`) capture token issuance and
decryption latency.

## Running the proxy

```bash
cd services/kkp
cargo run
```

Environment variables:

| Variable | Description | Default |
| --- | --- | --- |
| `KKP_LISTEN_ADDR` | Bind address | `0.0.0.0:8080` |
| `KKP_POLICY_PATH` | Path to a Rego policy | built-in `policy/kkp.rego` |
| `KKP_TOKEN_TTL_SECS` | Default token TTL seconds | `300` |
| `KKP_KEY_TTL_SECS` | Lifetime for signing keys | `1800` |
| `KKP_KEY_ROTATION_SECS` | Rotation interval | `900` |
| `KKP_MAX_ACTIVE_KEYS` | Max retained signing keys | `5` |

## HTTP API

- `POST /token` – Issue a scoped token. Requires subject, audience, backend, key id, and
optional policy claims. Evaluated against `data.kkp.authz.allow`.
- `POST /envelope/encrypt` – Envelope encrypt plaintext, returning ciphertext, nonce, and
encrypted data key.
- `POST /envelope/decrypt` – Validate token, evaluate policy, and decrypt envelope.
- `GET /keys/jwks` – Return JWKS for offline verification.
- `POST /keys/rotate` – Force rotate signing keys (key rotation also happens automatically).

## Clients

- `sdk/kkp/ts` – TypeScript package offering token verification and convenience HTTP
wrappers.
- `sdk/kkp/python` – Python package for offline verification and basic API helpers.

## Tests & Benchmarks

```bash
cd services/kkp
cargo test
cargo bench
```

Integration tests cover multi-cloud encryption/decryption flows, policy enforcement, key
rotation, and offline verification.
