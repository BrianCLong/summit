# Disclosure bundle export

## Endpoint

- **POST `/bundles/export`**
  - Input: `{ "case_id": "<id>", "evidence_ids": ["..."] }`
  - Output: ZIP archive containing:
    - `manifest.json`
    - `artifacts/<evidence>.json` entries
    - `records/claims.json` and `records/provenance.json`

## Hashing rules

- SHA-256 across all entries
- JSON payloads are canonicalized (sorted keys, UTF-8, compact separators) before hashing
- Root hash is computed over `path:hash` pairs sorted lexicographically

## Verification

Run `python -m app.verify_bundle <bundle.zip>` locally. It exits `0` when valid and reports a reason for mismatches otherwise.
