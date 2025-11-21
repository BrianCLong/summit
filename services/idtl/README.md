# Immutable Decision Transparency Log (IDTL)

IDTL is a small Go service that maintains an append-only transparency log for governance and model
usage decisions. Each decision becomes a Merkle tree leaf and new Signed Tree Heads (STHs) are
emitted every time an entry is appended. The implementation supports redacted entries where the
log stores hashed metadata and an external disclosure can later be verified without revealing the
sensitive payload.

## Features

- **Append-only Merkle log** using RFC 6962 style leaf/node hashing.
- **Signed tree heads** (Ed25519) exposed via `/tree/head` with public verification key at
  `/tree/pubkey`.
- **Inclusion proofs** per entry through `/entries/{id}/proof`.
- **Consistency evidence** via `/tree/leaves` which publishes canonical leaf hashes so auditors can
  recompute tree heads and detect equivocation.
- **Redacted entries** accept detached disclosures that are checked against stored hashes.
- **Witness utility** (`cmd/witness`) that fetches STHs, replays leaf hashes, and flags inconsistent
  histories.
- **Python verifier** (`verifier.py`) that can validate inclusion proofs or recompute tree heads for
  consistency checks against a running service.

## Running the service

```bash
cd services/idtl
go run ./cmd/idtl --addr :8080
```

Set `IDTL_SIGNING_SEED` to reuse the same signing key across restarts.

## Witness

The witness keeps a small JSON state file containing the latest trusted STH. Each invocation
fetches the current STH, verifies the signature, downloads the leaf hashes, and asserts that the
prefix matches the previously trusted state.

```bash
cd services/idtl
go run ./cmd/witness --endpoint http://localhost:8080 --state witness_state.json
```

## Python verifier

The Python helper can verify inclusion proofs that the server returns, or recompute tree heads using
leaf hashes served from `/tree/leaves`.

```bash
cd services/idtl
python verifier.py inclusion --index 0 --leaf-data "example" \
  --root BASE64_ROOT --proof PROOF_NODE ...

python verifier.py consistency --endpoint http://localhost:8080 \
  --old-size 5 --new-size 8 --old-root BASE64_OLD --new-root BASE64_NEW
```

## API overview

- `POST /entries` – append a new decision (`decision`, optional `redacted`, `disclosure`).
- `GET /entries` – list entries with metadata and timestamps.
- `GET /entries/{id}` – fetch a single entry.
- `GET /entries/{id}/proof` – retrieve the inclusion proof for that entry.
- `POST /entries/{id}/disclosure` – validate a detached disclosure.
- `GET /tree/head` – obtain the latest signed tree head.
- `GET /tree/history` – retrieve the full STH history.
- `GET /tree/pubkey` – fetch the log signing public key.
- `GET /tree/consistency?from=X&to=Y` – emit a structural proof sketch between two tree sizes.
- `GET /tree/leaves?limit=N` – return the first `N` canonical leaf hashes for independent
  recomputation.

## Tests

Run the unit tests with:

```bash
cd services/idtl
go test ./...
```
