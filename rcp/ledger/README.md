# Release Ledger

The Release Ledger provides a tamper-evident log of all release and promotion actions.

## Hash Chaining

Each entry in the ledger (`release-ledger.jsonl`) contains a `prev_hash` field. This field is computed as the SHA-256 hash of the deterministic JSON string of the *previous* entry in the file. The very first entry uses a `prev_hash` of `0000000000000000000000000000000000000000000000000000000000000000`.

This prevents reordering or removal of historical entries without breaking the cryptographic chain.

## Signature Format

When a key is provided, the ledger appending process calculates a signature over the entire entry JSON (including the `prev_hash`). This ensures non-repudiation.

The signature is appended to the JSON object before being written to the ledger.

### Example Entry

```json
{"action":"merge","details":{"pr":1},"prev_hash":"0000000000000000000000000000000000000000000000000000000000000000","run_id":"pr-1-abc12345","signature":"mock_sig_...","timestamp":"2024-05-01T12:00:00Z","trust_score":91}
```
