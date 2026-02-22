# Reproducible Node/pnpm Docker Standard

**Item:** `reproducible-node-pnpm-docker`

This standard defines the pattern for building reproducible Docker images for Node.js/pnpm services in Summit.

## Requirements

1.  **Stable Timestamps:** Build arguments `SOURCE_DATE_EPOCH` must be passed and used to set `org.opencontainers.image.created` label and `TZ=UTC`.
2.  **Pinned pnpm:** The Dockerfile must pin `pnpm` version.
3.  **Frozen Lockfile:** Builds must use `pnpm install --frozen-lockfile`.
4.  **Hermetic Install:** Runtime dependencies should be installed via `pnpm pack` tarball.
5.  **Source Normalization:** `.gitattributes` must enforce `text eol=lf`.

## Implementation

See `docker/repro.Dockerfile` for the reference implementation.

## Verification

Run the verification script:
```bash
scripts/ci/verify_pnpm_lock.sh
```

Docker reproducibility is smoke-tested in `.github/workflows/repro-docker.yml`.
