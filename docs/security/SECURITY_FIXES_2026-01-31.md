# Security Fixes - 2026-01-31

## Summary

Critical vulnerability remediation and security hardening completed.

## Vulnerabilities Addressed

### CRITICAL: vm2 Sandbox Escape (GHSA-99p7-6v5w-7xg8)

**Status**: FIXED

| Package | Action | PR/Commit |
|---------|--------|-----------|
| `@intelgraph/plugin-system` | Removed unused vm2 dependency | Direct to main |
| `@intelgraph/smart-contracts` | Migrated from vm2 to isolated-vm | PR #17514 (merged) |

**Details**:
- vm2 is deprecated with no available patches
- All versions vulnerable to sandbox escape
- `isolated-vm` provides proper V8 isolate-based sandboxing

### CRITICAL: @orval/core Code Injection (GHSA-gch2-phqh-fg9q)

**Status**: FIXED

| Action | Details |
|--------|---------|
| Override updated | `>=7.19.0` → `>=7.21.0` in root package.json |
| Patched version | 7.21.0 |

## Package Rename Fixes

Workspace references updated for npm scope renames:

| Old Name | New Name |
|----------|----------|
| `@maestro/core` | `@intelgraph/maestro-core` |
| `@summit/graph-sync-validator` | `@summi7/graph-sync-validator` |

**Files updated**:
- `server/package.json`
- `apps/validator-worker/package.json`
- `packages/maestro-cli/*`
- `packages/maestro-skills/*`
- `server/src/maestro/engine.ts`

## Credential Rotation

| Item | Status |
|------|--------|
| npm tokens rotated | DONE |
| Old tokens revoked | DONE |
| No tokens in repo | VERIFIED |

## Verification Checklist

- [x] vm2 removed from plugin-system
- [x] vm2 migrated to isolated-vm in smart-contracts
- [x] @orval/core override updated to >=7.21.0
- [x] Workspace references updated for renamed packages
- [x] npm tokens rotated
- [x] No hardcoded tokens in repository (`git grep` clean)

## Remaining Items

- [ ] Lockfile regeneration (CI will handle)
- [ ] Dependabot alerts auto-close after lockfile update

## References

- Dependabot Alert #2145: vm2 in plugin-system
- Dependabot Alert #2146: vm2 in smart-contracts
- Dependabot Alert #2245: @orval/core
- PR #17514: smart-contracts vm2 migration
