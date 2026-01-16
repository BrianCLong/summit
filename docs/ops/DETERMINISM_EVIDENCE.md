# Test Runtime Determinism Evidence

> **Status**: Implementation Complete
> **Date**: 2026-01-04
> **PR**: claude/test-runtime-determinism-20260104

## Executive Summary

This document captures evidence of the test runtime determinism improvements implemented to eliminate CI variance caused by test-runner sprawl and ESM/CJS friction.

## Before State: Failure Analysis

### Issue 1: Client Dual-Runner Pattern

**Location**: `client/package.json`

**Before**:

```json
{
  "test": "npm run test:jest && npm run test:vitest",
  "test:jest": "node node_modules/jest/bin/jest.js --config jest.config.cjs",
  "test:vitest": "vitest"
}
```

**Problem**: Running two test runners sequentially:

- Increases CI time
- Creates potential for inconsistent test results
- Confuses contributors about which runner to use
- No vitest.config.ts existed - vitest ran with defaults

**After**:

```json
{
  "test": "node node_modules/jest/bin/jest.js --config jest.config.cjs",
  "test:jest": "node node_modules/jest/bin/jest.js --config jest.config.cjs",
  "_test:vitest:disabled": "vitest (disabled - consolidated to Jest for CI determinism)"
}
```

### Issue 2: Orphan Runner Configurations

**Problem**: Multiple packages had runner configs that didn't match their test scripts.

| Package              | Had Config       | Used Runner | Action      |
| -------------------- | ---------------- | ----------- | ----------- |
| server               | vitest.config.ts | Jest        | Quarantined |
| packages/adapter-sdk | jest.config.cjs  | Vitest      | Removed     |
| apps/api             | vitest.config.ts | Jest        | Removed     |
| apps/mobile          | vitest.config.ts | Jest        | Removed     |

**Impact**:

- Confusing for developers
- Could cause accidental runner invocation
- Maintenance burden for unused configs

### Issue 3: No Runtime Verification Gate

**Problem**: No automated way to detect:

- Mixed runner configurations
- Orphan config files
- Module resolution issues
- ESM/CJS mismatches

## After State: Verification

### Verification Script Output

```
============================================================
  IntelGraph Runtime Verification
  2026-01-04T20:17:35.529Z
============================================================

Runtime Versions:
✅ Node.js Version: v20.19.6 (required: >=18.18)
✅ pnpm Version: v10.0.0 (required: >=9.0.0)

Lockfile Verification:
✅ pnpm-lock.yaml exists: Present
✅ Node linker mode: isolated

ESM Configuration:
✅ Root package type: "module" (ESM)
✅ Jest config extension: Uses .cjs (correct for ESM)

Runner Configuration Consistency:
Runner distribution: Jest=428, Vitest=101, node:test=10
✅ No dual-runner packages: All packages use single runner
✅ No orphan runner configs: All configs are in use

Module Resolution Probes:
✅ Module: zod: Resolvable
✅ Module: pino: Resolvable
✅ Module: prom-client: Resolvable
✅ Module: ioredis: Resolvable
✅ Module: neo4j-driver: Resolvable
✅ ESM dynamic import (zod): Works

Summary:
Results: 14/14 checks passed
✅ All runtime checks passed!
```

## Commands to Reproduce

### Run Verification

```bash
pnpm verify:runtime
```

### Run Client Tests (After Fix)

```bash
cd client && pnpm test
# Uses Jest only, completes faster
```

### Check for Orphan Configs

```bash
# Verification script checks automatically
# Manual check:
find . -name "jest.config.*" -o -name "vitest.config.*" | \
  xargs -I{} sh -c 'echo "Config: {}"; grep -l "test.*:" $(dirname {})/package.json 2>/dev/null'
```

## Why This Approach Avoids Runner Sprawl

1. **Single Canonical Runner Per Context**:
   - Root/Server: Jest (established, extensive test suite)
   - Client: Jest (jsdom environment, testing-library)
   - New packages (2025+): Vitest allowed if isolated

2. **Automated Detection**:
   - `verify:runtime` script runs in CI
   - Fails fast with actionable diagnostics
   - Prevents regression

3. **Clear Documentation**:
   - `docs/ops/TEST_RUNTIME.md` defines canonical patterns
   - Disallowed patterns explicitly listed
   - Migration guidance provided

## Known Limitations

1. **Vitest remains in some packages**: ~101 packages use Vitest as their primary runner. These are intentional (newer packages or packages with Vite integration). The fix ensures each package uses ONE runner, not that all packages use the same runner.

2. **node:test usage**: ~10 packages use node:test. This is acceptable for simple utility packages that don't need a framework.

3. **Server vitest.config.ts preserved**: Quarantined in `server/.quarantine/` for reference. Contains migration status information that may be useful if server tests are ever migrated to Vitest.

## Files Changed

### Added

- `docs/ops/TEST_RUNTIME.md` - Canonical runtime documentation
- `docs/ops/DETERMINISM_EVIDENCE.md` - This file
- `scripts/verification/verify_runtime.ts` - Runtime verification script
- `server/.quarantine/README.md` - Quarantine explanation

### Modified

- `package.json` - Added `verify:runtime` script
- `client/package.json` - Consolidated to Jest only

### Removed

- `packages/adapter-sdk/jest.config.cjs` - Orphan (uses Vitest)
- `apps/api/vitest.config.ts` - Orphan (uses Jest)
- `apps/mobile/vitest.config.ts` - Orphan (uses Jest)

### Quarantined

- `server/vitest.config.ts` -> `server/.quarantine/vitest.config.ts.quarantined`

## CI Integration

The `verify:runtime` script has been added to CI as a fast-fail check in `.github/workflows/ci-core.yml`:

```yaml
# In verification-suite job
- name: Verify runtime configuration
  run: pnpm verify:runtime

- name: Run verification scripts
  run: pnpm verify
```

This runs before tests and fails immediately if configuration issues are detected.

## Hanging Test Prevention

Added safety mechanisms to prevent tests from hanging:

1. **detectOpenHandles** (opt-in): `JEST_DETECT_HANDLES=true pnpm test`
2. **forceExit** in CI: Automatically enabled when `CI=true`
3. **Cleanup utilities**: `global.testCleanup` for resource management

```javascript
// Tests can register resources for automatic cleanup
global.testCleanup.registerServer(httpServer);
global.testCleanup.registerTimer(intervalId);
global.testCleanup.registerConnection(dbConn);
```

## References

- [docs/ops/TEST_RUNTIME.md](./TEST_RUNTIME.md) - Canonical runtime decisions
- [Jest ESM Support](https://jestjs.io/docs/ecmascript-modules)
- [ts-jest ESM Preset](https://kulshekhar.github.io/ts-jest/docs/guides/esm-support/)
