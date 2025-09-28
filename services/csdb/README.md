# Consent-Scoped Data Broker (CSDB)

The CSDB service packages partner data exports that are constrained by consent, stated
purpose, and jurisdictional requirements. It applies deterministic redaction/tokenisation
rules and emits a signed export manifest that can be verified offline by partners. The
service also exposes a dry-run export preview and an inbound attestation verifier.

## Features

- **Consent-aware exports** – records lacking consent for the requested purpose are
  excluded before any transformations are applied.
- **Jurisdiction filters** – exports can be constrained to specific regulatory regions.
- **Deterministic data hygiene** – PII fields are redacted (`SSN`) or tokenised using
  HMAC-SHA256 to enable reconciliation without leaking raw values.
- **Signed manifests** – manifests contain dataset proofs (record-level SHA256 hashes)
  and are signed with an Ed25519 keypair. The public key is published so signatures can
  be verified offline.
- **Dry-run previews** – `POST /exports/preview` returns the transformed payload without
  persisting any manifest data, enabling partners to inspect changes safely.
- **Attestation validation** – `POST /attestations/verify` deterministically validates
  partner attestations against registered Ed25519 public keys.

## Running the broker

```bash
cd services/csdb
GO111MODULE=on go run ./cmd/csdb
```

Set the `PORT` environment variable to change the listening port (default `8080`).

## HTTP surface

| Method | Path                  | Description |
| ------ | --------------------- | ----------- |
| POST   | `/exports`            | Materialises an export and persists the manifest. |
| POST   | `/exports/preview`    | Dry-run export preview (no persistence). |
| GET    | `/manifests/{id}`     | Fetch a persisted manifest for offline verification. |
| POST   | `/attestations/verify`| Validate a partner attestation payload. |

## Offline manifest verification

Manifests embed the base64-encoded Ed25519 signature. To verify offline in Go:

```go
ok, err := broker.VerifyManifest(manifest, manifestPublicKey)
```

The published manifest verification key (hex) is:

```
4221c3a1973b719b5be3f08b0795e84d4a6bf78f11566d10d9dc698c7b80a1cc
```

## Fixtures

`internal/data/fixtures.go` provides deterministic partner data used by both the server
and tests. Exports sourced from these fixtures exclude all records without matching consent
(e.g. `rec-002` is omitted from marketing exports because consent is `false`).
