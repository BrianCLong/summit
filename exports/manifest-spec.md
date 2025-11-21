# Export Manifest Specification

The manifest defines the canonical structure for signed export bundles generated within the Black-Cell enclave. Every export **must** ship with a manifest and ledger snapshot, enabling recipients to verify provenance, detect tampering, and reconstruct evidence chains.

## File Layout

```
exports/
  manifest.json      # Signed manifest described below
  ledger.json        # Append-only ledger snapshot referenced by the manifest
  artifacts/...      # Payload referenced in the manifest `artifacts` array
```

## Top-Level Structure

```json
{
  "version": "1.0",
  "bundle": { ... },
  "claims": [ ... ],
  "artifacts": [ ... ],
  "ledger": { ... },
  "integrity": { ... }
}
```

Field descriptions:

| Field | Description |
| --- | --- |
| `version` | Semantic version of the manifest schema. Always `"1.0"` for this iteration. |
| `bundle` | Metadata describing the export batch (ID, generated timestamp, environment, filters). |
| `claims` | Array of claim objects with linked evidence. |
| `artifacts` | Checksummed payload descriptors stored in the bundle. |
| `ledger` | Pointer to the immutable ledger snapshot plus the sequences referenced by the manifest. |
| `integrity` | Canonical manifest hash and Ed25519 signature. |

## Claim & Evidence Model

Each claim follows the JSON schema documented in [`provenance/schema.json`](../provenance/schema.json). Key rules:

- `evidence[].ledgerSequence` **must** map to the same sequence inside the bundled ledger.
- `evidence[].artifactHash` **must** match the ledger entry `contentHash`.
- Evidence `stage` enumerations: `ingest`, `transform`, `delivery`.
- The manifest `bundle.itemCount` equals `claims.length`.

## Ledger Embedding

The manifest `ledger` object embeds:

```json
{
  "uri": "./ledger.json",
  "rootHash": "<sha256>",
  "entries": [
    { "sequence": 1, "hash": "<sha256>" },
    { "sequence": 2, "hash": "<sha256>" }
  ]
}
```

- `rootHash` equals the hash of the last ledger entry (the ledger head).
- `entries` enumerates every ledger sequence referenced by claims or artifacts. Verifiers compare these hashes against the ledger file to ensure immutability.
- Ledger entries themselves contain `prevHash`, `hash`, and `signature` fields. See [`exports/examples/ledger.json`](./examples/ledger.json) for the exact structure.

## Integrity Block

```
"integrity": {
  "manifestHash": "<sha256>",
  "signature": {
    "algorithm": "ed25519",
    "keyId": "export-signing-key",
    "value": "<base64 signature>"
  }
}
```

- `manifestHash` is computed over the manifest minus the `integrity` node.
- The signature is calculated on the canonical JSON (sorted keys, arrays preserved) and must validate with the public key referenced by `keyId`.

## Verification Flow

1. **Ledger** – Run `provenance-cli verify-ledger --ledger ledger.json`. This checks sequence continuity, hash integrity, and entry signatures.
2. **Manifest** – Run `provenance-cli verify-manifest --manifest manifest.json --ledger ledger.json --public-key export-public.pem`. This verifies:
   - The ledger hash chain and root hash alignment.
   - Evidence to ledger consistency (claim IDs, entity IDs, stages, hashes).
   - Manifest hash correctness and signature validity.
3. **Evidence Retrieval** – `provenance-cli evidence-chain --manifest manifest.json --ledger ledger.json --entity <id>` returns the ordered evidence for the requested entity.

## Examples

Sample artifacts demonstrating the spec:

- [`examples/manifest.json`](./examples/manifest.json) – Signed manifest covering a single entity export.
- [`examples/ledger.json`](./examples/ledger.json) – Matching ledger snapshot.
- [`examples/manifest-tampered.json`](./examples/manifest-tampered.json) – Manifest with a modified evidence hash. Verification fails due to the mismatch.

Each example is validated by automated tests in `tests/provenance`.
