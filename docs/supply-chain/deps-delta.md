# Dependency Delta

## Update: Sentinel Security Fixes

**Date:** 2026-02-07
**Author:** Sentinel

### Changes
- Updated `pnpm-lock.yaml` to resolve `ERR_PNPM_OUTDATED_LOCKFILE` in `services/websocket-server`.
- Synced lockfile with `package.json` definitions.

### Justification
CI pipelines were failing due to inconsistent lockfile states. This update ensures reproducible builds and passes the `frozen-lockfile` check.
