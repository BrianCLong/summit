# CAS Artifacts (Immutable Evidence Store)

This document defines the content-addressable store (CAS) for governance and
verification artifacts. The CAS is **append-only** and supports deterministic,
verifiable evidence chains for GA readiness.

## Directory Layout

```
artifacts/
  cas/
    sha256/
      aa/
        bb/
          <fullsha>.blob
          <fullsha>.meta.json
```

- `blob` stores the raw bytes of an artifact.
- `meta.json` stores non-sensitive metadata:
  - `digest` (sha256)
  - `size` (bytes)
  - `created_at` (ISO timestamp)

## Atomic Write Protocol

1. Compute digest + size.
2. Write to a temporary file in the **same** directory.
3. `fsync` the temporary file.
4. `rename` the temporary file into place.
5. Never modify existing blobs once written.

This guarantees immutability and guards against partial writes.

## Run Manifests

Each run produces a manifest at:

```
artifacts/<category>/<sha>/run-manifest.json
```

Schema (v1):

```json
{
  "schema_version": "1",
  "category": "evidence" | "ga-verify" | "governance/<name>",
  "sha": "<git sha>",
  "created_at": "<iso timestamp>",
  "files": [
    {
      "path": "sbom/monorepo.cdx.json",
      "sha256": "<digest>",
      "size": 12345,
      "cas": "sha256/aa/bb/<digest>.blob"
    }
  ],
  "tool_versions": {
    "node": "v20.x",
    "pnpm": "pnpm/10.x"
  },
  "policy_hashes": {}
}
```

## Verification Rules

The verifier enforces:

1. **CAS integrity**: every blob’s digest matches its path.
2. **Run integrity**: each run file hash matches `run-manifest.json`.
3. **CAS linkage**: every run file references a CAS blob that matches the same
   digest.
4. **Immutability**: any mutation of stored blobs fails verification.

## Invariants

- CAS is append-only.
- Run manifests are deterministic and sorted by `path`.
- CI never deletes or prunes CAS blobs.

## Local Pruning Policy

Local pruning is available via `scripts/ci/cas_prune.mjs` and is guarded by:

- `ALLOW_CAS_PRUNE=1`
- Not running in CI (`GITHUB_ACTIONS` must be unset)

Pruning removes only blobs that are unreachable from a provided set of run
manifests.
