# Test Runtime Determinism

This document establishes the canonical test runtime configuration for the IntelGraph Platform to eliminate CI variance caused by test-runner sprawl, ESM/CJS friction, and workspace/module-resolution instability.

## Canonical Runtime Decisions

| Aspect              | Decision                 | Rationale                                                |
| ------------------- | ------------------------ | -------------------------------------------------------- |
| Package Manager     | pnpm@10.0.0              | Enforced via `packageManager` field in root package.json |
| Node Version        | >=18.18                  | Required for native ESM and test runner compatibility    |
| Module System       | ESM (`"type": "module"`) | Standard across server, client, and most packages        |
| Primary Test Runner | Jest 29.x + ts-jest      | Widest adoption, mature ESM support                      |
| Browser Test Runner | Vitest 4.x               | For client-side Vite-integrated tests                    |
| E2E Framework       | Playwright 1.x           | Cross-browser testing                                    |

## Package Matrix

### Core Packages

| Package | Test Command                               | Runner        | ESM | Known Issues                  |
| ------- | ------------------------------------------ | ------------- | --- | ----------------------------- |
| root    | `jest --runInBand`                         | Jest          | Yes | Sequential execution required |
| server  | `jest --config jest.config.ts`             | Jest          | Yes | Uses ts-jest ESM preset       |
| client  | `npm run test:jest && npm run test:vitest` | Jest + Vitest | Yes | Runs BOTH runners             |

### Configuration Files

- **Root**: `jest.config.cjs` - ts-jest ESM preset, roots across server/client/packages
- **Server**: `jest.config.ts` - ESM preset with jest-extended setup
- **Client**: `jest.config.cjs` - jsdom environment for React testing

## ESM Configuration

All test configurations use the ts-jest ESM preset:

```javascript
{
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  transform: {
    '^.+\\.[cm]?[tj]sx?$': ['ts-jest', { useESM: true }]
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'  // ESM extension resolution
  }
}
```

## Test Script Patterns

### Recommended

```bash
# Run all tests sequentially (CI-safe)
pnpm test

# Run client tests
pnpm test:client

# Run server tests
pnpm test:server
```

### CI-Specific

```bash
# Root-level CI test (sequential)
jest --runInBand

# With coverage
jest --coverage --runInBand
```

## Known Issues and Mitigations

### 1. Dual Runner Issue (Client)

- **Problem**: Client runs both Jest and Vitest
- **Mitigation**: Jest handles `.test.tsx` files, Vitest for future migration
- **Action**: Consider consolidating to single runner

### 2. ESM/CJS Friction

- **Problem**: Some legacy configs use `.cjs` extension
- **Mitigation**: Use `preset: 'ts-jest/presets/default-esm'` consistently
- **Action**: Migrate `.cjs` configs to `.ts` where possible

### 3. Test Isolation

- **Problem**: Parallel test execution causes flaky tests
- **Mitigation**: Use `--runInBand` for CI
- **Action**: Improve test isolation with proper mocking

## Verification

Run the verification script to check runtime consistency:

```bash
./scripts/verification/verify_runtime.sh
```

This script checks:

1. Node version meets minimum requirements
2. pnpm version matches `packageManager` field
3. All test configs use consistent ESM settings
4. No conflicting module resolution patterns

## Related Documentation

- [CI Pipeline](../ci/README.md)
- [ESM Migration Guide](../development/esm-migration.md)
- [Test Strategy](../testing/strategy.md)

---

_Last updated: 2026-01-03_
_Owner: Platform Team_
