# Temporal Access Token Service (TATS)

TATS issues short-lived, caveated access tokens for downstream data APIs. Tokens carry dataset- and row-level scopes, a declared purpose, and are signed with Ed25519 so that consumers can verify them offline. Holders can attenuate an existing token to narrow its privileges without involving the issuer.

## Features

- **Time-boxed tokens** – all tokens embed `issued_at` and `expires_at` timestamps and fail validation after expiry.
- **Structured caveats** – audiences, dataset identifiers, row scopes, and purposes are tracked explicitly.
- **Attenuation** – clients can derive a narrower token from a parent token. Dataset, row-scope, purpose, and TTL restrictions must be subsets of the parent.
- **Replay protection** – verifier helpers ship with replay caches that reject previously accepted `jti` values.
- **Offline verification** – tokens are signed via Ed25519 (`EdDSA`). The `/v1/keys` endpoint exposes the public key so that verifiers can validate tokens without contacting TATS.

## HTTP API

| Method | Path | Description |
| ------ | ---- | ----------- |
| `POST` | `/v1/tokens` | Issue a fresh token. |
| `POST` | `/v1/attenuate` | Produce a child token with narrowed permissions. Requires a valid parent token. |
| `GET` | `/v1/keys` | Returns the Ed25519 verifying key (Base64) and algorithm metadata. |
| `GET` | `/healthz` | Liveness probe. |

### Token issuance request shape

```json
{
  "audience": "analytics-api",
  "dataset_ids": ["ds:sales", "ds:inventory"],
  "row_scopes": {"ds:sales": ["tenant-123"]},
  "purposes": ["reporting"],
  "ttl_seconds": 1800,
  "nonce": "optional client supplied nonce"
}
```

- `dataset_ids` and `purposes` must be non-empty.
- `row_scopes` are optional; when omitted, access is assumed to cover the full dataset.
- `ttl_seconds` defaults to `TATS_DEFAULT_TTL_SECONDS` (3600 by default) and is capped by `TATS_MAX_TTL_SECONDS` (86400 default).
- If `nonce` is omitted, the service deterministically derives one to keep identical inputs stable.

### Attenuation request shape

```json
{
  "parent_token": "<token string>",
  "dataset_ids": ["ds:sales"],
  "row_scopes": {"ds:sales": ["tenant-123"]},
  "purposes": ["reporting"],
  "ttl_seconds": 600
}
```

Any provided field must be a subset of the parent token's allowances. TTLs are automatically clamped so the child never outlives its parent.

## Token format

Tokens follow a compact JWS-inspired structure: `base64url(header).base64url(claims).base64url(signature)`. The header currently fixes `alg = "EdDSA"` and `typ = "TATS"`. Claims include:

- `jti`: deterministic token identifier used for replay detection.
- `parent`: `jti` of the parent token (if attenuated).
- `audience`, `dataset_ids`, `row_scopes`, `purposes`.
- `issued_at`, `expires_at`, `nonce`.

## Configuration

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `TATS_BIND_ADDRESS` | `0.0.0.0:8080` | Socket address to listen on. |
| `TATS_SIGNING_KEY` | *generated at startup* | Base64 encoded 32-byte Ed25519 secret seed. The service logs a warning if a random key is generated to highlight ephemeral signing. |
| `TATS_DEFAULT_TTL_SECONDS` | `3600` | Default token lifetime. |
| `TATS_MAX_TTL_SECONDS` | `86400` | Hard cap on issued lifetimes and attenuated TTLs. |

## Running locally

```bash
cargo run --bin tats-service
```

The service will start on the configured bind address and log the public key fingerprint.

## Client libraries

### TypeScript

A lightweight ESM client is provided under `clients/ts/`:

```bash
cd services/tats/clients/ts
npm install
npm run build
```

Usage:

```ts
import { TatsClient, InMemoryReplayCache, verifyToken } from '@summit/tats-client';

const client = new TatsClient('http://localhost:8080');
const { token } = await client.issueToken({
  audience: 'analytics-api',
  dataset_ids: ['ds:sales'],
  purposes: ['reporting'],
  ttl_seconds: 600,
});

const publicKey = await client.publicKey();
const claims = verifyToken(token, publicKey, new InMemoryReplayCache(), {
  expectedAudience: 'analytics-api',
  requiredDatasets: ['ds:sales'],
  requiredPurposes: ['reporting'],
});
```

### Python

The Python module lives in `clients/python/` and relies on `requests` and `pynacl`:

```bash
pip install requests pynacl
```

```python
from tats_client import (
    TatsClient,
    IssueTokenRequest,
    MemoryReplayCache,
    verify_token,
)

client = TatsClient('http://localhost:8080')
issued = client.issue_token(IssueTokenRequest(
    audience='analytics-api',
    dataset_ids=['ds:sales'],
    purposes=['reporting'],
    ttl_seconds=600,
))

public_key = client.public_key()
claims = verify_token(
    issued.token,
    public_key,
    MemoryReplayCache(),
    expected_audience='analytics-api',
    required_datasets=['ds:sales'],
    required_purposes=['reporting'],
)
```

## Replay protection

The verifier helpers expose a `ReplayCache` trait/protocol along with an in-memory implementation. Callers should provide a storage-backed implementation in production (e.g., Redis) to enforce global replay guarantees.

## Performance

Benchmarks were captured with Criterion (`cargo bench --bench perf`):

| Operation | Mean latency |
| --------- | ------------ |
| Issue token | ~30.1 µs |
| Verify token | ~52.0 µs |

These measurements translate to >30k token issues/sec and >19k verifications/sec on the benchmark host, satisfying the target SLO of sub-100 µs latency for both operations.

Benchmark details are available in [`BENCHMARK.md`](./BENCHMARK.md).
