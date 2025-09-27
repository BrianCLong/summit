# CRKRE Jurisdictional Split-Key Manager

The **Cross-Region Key Routing & Escrow (CRKRE)** service provides geo-aware split-key governance using Shamir secret sharing with deterministic escrow expirations and signed provenance proofs for offline verification.

## Features

- **Jurisdiction aware routing** – Keys are bound to jurisdiction, residency, and purpose. Encryption/decryption is only permitted when all attributes align.
- **Split-key control** – Threshold policies are enforced with Shamir secret sharing. Shares are backed by configurable backends (HSM/KMS) and signed for provenance.
- **Deterministic escrow** – Temporary escrow grants controlled release of shares until an immutable expiry; requests after expiry return HTTP `410`.
- **Quorum recovery** – Recover master secrets when a quorum of signed shares is presented.
- **Offline verification** – Share proofs are signed with an Ed25519 key so custody can be validated offline without the service.

## Running the service

```bash
cd services/crkre
cargo run
```

The server listens on port `8080` by default. Set `CRKRE_PORT` to override.

## HTTP API

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/keys` | Create a jurisdiction-scoped key set and return metadata + signed share proofs. |
| `GET` | `/keys/{key_id}/provenance` | Retrieve signed provenance proofs for all shares. |
| `POST` | `/encrypt` | Encrypt plaintext (Base64 payload) when jurisdiction/residency/purpose align. |
| `POST` | `/decrypt` | Decrypt ciphertext using a quorum of provided shares (Base64). |
| `POST` | `/quorum/recover` | Reconstruct the master secret for disaster recovery. |
| `POST` | `/keys/{key_id}/escrow` | Create a temporary escrow releasing selected share IDs with an expiry. |
| `GET` | `/escrow/{escrow_id}` | Fetch escrowed shares prior to expiry. |
| `GET` | `/health` | Liveness probe. |

All byte payloads use Base64 encoding in JSON.

## Testing

```bash
cargo test
```

The resilience tests verify:

- Quorum and jurisdiction alignment are required for decrypt operations.
- Escrow expirations are enforced deterministically with an injected time provider.
- Share provenance signatures verify offline using the published verifying key.

## SDK Clients

- **TypeScript:** `sdk/typescript/src/crkre.ts`
- **Python (async):** `sdk/python/maestro_sdk/crkre.py`

Both clients wrap the HTTP API with typed helpers for integrating CRKRE into applications.
