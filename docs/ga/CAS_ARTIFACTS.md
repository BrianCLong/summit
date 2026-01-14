# CAS Artifacts (Immutable Evidence Storage)

This document defines the Content-Addressable Store (CAS) layout and the run-manifest
invariants for GA evidence and governance artifacts. The CAS is append-only: once a blob
is written it is never modified, only referenced.

## Directory Layout

```
artifacts/
  cas/
    sha256/
      <aa>/<bb>/<fullsha>.blob
      <aa>/<bb>/<fullsha>.meta.json  # optional metadata
```

- `<fullsha>` is a lowercase SHA-256 digest of the blob contents.
- `<aa>` and `<bb>` are the first two and next two hex characters of the digest.
- `.meta.json` is optional and contains size + timestamp metadata.

## Atomic Write Protocol

1. Compute SHA-256 and size from the source file.
2. Create the target directory if missing.
3. Write to a temporary file in the CAS directory.
4. `fsync` the temporary file.
5. Atomically rename the temp file to `<fullsha>.blob`.
6. Optionally write `<fullsha>.meta.json` using the same atomic pattern.

**Invariant:** The blob path MUST match the content digest. Existing blobs are never
modified (append-only behavior).

## Run Manifest Format

Each run directory emits a deterministic `run-manifest.json` describing the files and
their CAS references.

```
artifacts/<category>/<sha>/run-manifest.json
```

Schema:

```json
{
  "schema_version": "1",
  "category": "evidence" | "ga-verify" | "governance/<name>",
  "sha": "<git sha>",
  "created_at": "<iso>",
  "thin_mode": false,
  "files": [
    {
      "path": "sbom/monorepo.cdx.json",
      "sha256": "<digest>",
      "size": 12345,
      "cas": "sha256/<aa>/<bb>/<digest>.blob"
    }
  ],
  "tool_versions": {
    "node": "v20.11.0",
    "pnpm": "pnpm/10.0.0 npm/? node/v20.11.0"
  },
  "policy_hashes": {
    "verification_map": "<sha256>"
  }
}
```

### Manifest Rules

- `files` MUST be sorted by `path`.
- Each `cas` entry MUST point to a blob with matching digest.
- `created_at` is informational and excluded from integrity comparisons.
- `thin_mode=false` means run files must exist on disk (no pointer-only entries).

## Verification Rules

The verifier enforces:

1. **CAS integrity:** each blob’s SHA-256 matches its path digest.
2. **Run integrity:** each run file hash matches the manifest entry.
3. **CAS linkage:** each manifest entry points to a CAS blob with matching digest.
4. **Immutability:** any mutation of existing CAS blobs fails verification.

## Local Pruning (Optional)

A local-only prune script can remove unreachable CAS blobs based on a set of manifests.
Pruning is refused in CI and requires explicit `ALLOW_CAS_PRUNE=1`.
