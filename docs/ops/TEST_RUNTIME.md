# Test Runtime Canonical Reference

> **Status**: Authoritative
> **Last Updated**: 2026-01-04
> **Owner**: Platform Engineering

This document defines the canonical test runtime configuration for the IntelGraph Platform monorepo. All packages MUST conform to these standards to ensure CI determinism.

## Canonical Runtime Decision Matrix

| Context                  | Runner           | Config Extension | Rationale                          |
| ------------------------ | ---------------- | ---------------- | ---------------------------------- |
| **Root monorepo**        | Jest             | `.cjs`           | Primary, uses ts-jest ESM preset   |
| **Server (backend)**     | Jest             | `.ts`            | Primary, uses ts-jest ESM preset   |
| **Client (frontend)**    | Jest             | `.cjs`           | jsdom environment, babel-jest      |
| **Services**             | Jest (preferred) | `.cjs` or `.js`  | Match root config patterns         |
| **Packages**             | Jest (preferred) | `.cjs` or `.js`  | Match root config patterns         |
| **E2E tests**            | Playwright       | `.ts`            | Dedicated E2E runner               |
| **New packages (2025+)** | Vitest           | `.ts`            | Allowed for new, isolated packages |

## Key Constraints

### ESM Configuration

The monorepo uses ES Modules (`"type": "module"` in root `package.json`). This requires:

1. **Jest config files MUST use `.cjs` extension** (CommonJS) when using `module.exports`
2. **Vitest config files use `.ts`** (native ESM support)
3. **Test files**: Use `.test.ts` / `.test.tsx` extensions
4. **ts-jest preset**: `ts-jest/presets/default-esm`

### Node Version

```
engines:
  node: ">=18.18"
```

CI runs on Node 20.x. Local development MUST use Node 18.18+ or 20.x.

### Package Manager

```
packageManager: pnpm@10.0.0
```

**Always use `pnpm install --frozen-lockfile` in CI.**

## Disallowed Patterns

### 1. Mixed Runners in Same Package

**WRONG:**

```json
{
  "test": "npm run test:jest && npm run test:vitest"
}
```

**RIGHT:**

```json
{
  "test": "jest"
}
```

Pick ONE runner per package. The client previously ran both Jest and Vitest; this is now consolidated to Jest for unit tests.

### 2. Config Importing Uninstalled Dependencies

**WRONG:** (jest.config.ts importing ts-node when not in package devDependencies)

```typescript
// jest.config.ts
import { pathsToModuleNameMapper } from "ts-jest";
import { compilerOptions } from "./tsconfig.json"; // Requires ts-node loader
```

**RIGHT:**

```javascript
// jest.config.cjs
module.exports = {
  preset: "ts-jest/presets/default-esm",
  // ... static config
};
```

### 3. Orphan Runner Configs

Do NOT have both `jest.config.ts` and `vitest.config.ts` in the same package if only one is used.

### 4. ESM/CJS Mismatch

**WRONG:**

```javascript
// In package with "type": "module"
// jest.config.js
module.exports = { ... }; // Error: cannot use CJS in ESM package without .cjs
```

**RIGHT:**

```javascript
// jest.config.cjs
module.exports = { ... };
```

## How to Run Tests Locally

### Full Test Suite (Root)

```bash
pnpm install --frozen-lockfile
pnpm test
```

### Server Tests

```bash
cd server
pnpm test
```

### Client Tests

```bash
cd client
pnpm test
```

### Specific Package

```bash
pnpm --filter @intelgraph/<package-name> test
```

### With Coverage

```bash
pnpm test -- --coverage
```

## Verification

Run the runtime verification script before pushing:

```bash
pnpm verify:runtime
```

This validates:

- Node/pnpm versions
- Lockfile presence
- Runner config consistency
- Critical module resolution
- No mixed runner configurations

## Common Failure Modes

### ERR_MODULE_NOT_FOUND

**Cause**: ESM import of CJS-only package, or missing dependency.

**Fix**:

1. Check the package is in `dependencies` or `devDependencies`
2. Check if the package needs a moduleNameMapper entry in jest config
3. Check transformIgnorePatterns for packages that need transpilation

### Hanging Tests / Open Handles

**Cause**: Unclosed database connections, timers, HTTP servers.

**Fix**:

1. Add proper teardown in `afterAll` / `afterEach`
2. Use `--detectOpenHandles` to identify
3. Add `testTimeout` in jest config (default: 30000ms)

### Config Load Failures

**Cause**: jest.config.ts importing packages that aren't installed.

**Fix**: Use static `.cjs` config files that don't require runtime imports.

## Migration Path for New Packages

1. **If starting fresh**: Use Vitest with `vitest.config.ts`
2. **If extending existing**: Match the parent package's runner
3. **Always**: Run `pnpm verify:runtime` before committing

## CI Pipeline Integration

The CI workflow (`ci-core.yml`) runs tests in this order:

1. `pnpm install --frozen-lockfile`
2. `pnpm verify:runtime` (fast fail on config issues)
3. `pnpm test:unit`
4. `pnpm test:integration`

Tests are BLOCKING - PRs cannot merge if tests fail.

## References

- [Jest ESM Support](https://jestjs.io/docs/ecmascript-modules)
- [ts-jest ESM Preset](https://kulshekhar.github.io/ts-jest/docs/guides/esm-support/)
- [Vitest Configuration](https://vitest.dev/config/)
- [pnpm Workspaces](https://pnpm.io/workspaces)
