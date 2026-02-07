# pnpm Store Cache (CI)

## Purpose

Ensure CI jobs reuse a shared pnpm store cache keyed by OS, pnpm version, and the lockfile hash to
speed installs without compromising determinism.

## Cache Key Strategy

Cache keys must include:

- Runner OS
- pnpm version (from `pnpm --version`)
- `pnpm-lock.yaml` SHA-256 hash

Example key:

```
${RUNNER_OS}-pnpm-${PNPM_VERSION}-${LOCKFILE_HASH}
```

## Store Path Discovery

Always resolve the store path with:

```
pnpm store path
```

Use `tools/ci/pnpm_store_path.sh` in workflows to output both the store path and pnpm version for
consistent caching.
