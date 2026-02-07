# Docker Buildx Cache (CI)

## Purpose

Use BuildKit cache scopes keyed by Dockerfile and lockfile hashes to reuse layers safely across CI
runs while avoiding cross-branch contamination.

## Cache Scope

Compute cache scopes from:

- Dockerfile SHA-256 hash
- pnpm lockfile SHA-256 hash

Example scope:

```
docker-${DOCKERFILE_HASH}-${LOCKFILE_HASH}
```

Use `tools/ci/docker_cache_keys.sh` to generate the scope and hashes for Buildx.
