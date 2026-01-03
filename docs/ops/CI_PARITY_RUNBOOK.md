# CI Parity Runbook

**Goal:** Reproduce CI behavior locally to verify changes before pushing.

## Prerequisites
- Node.js v18.20.1
- pnpm v9.x (or v10.x as per package.json)

## Canonical Command Chain

The following sequence mirrors the CI pipeline. Run these from the repository root.

### 1. Install Dependencies
```bash
pnpm install
```
*Note: If you encounter `ERR_PNPM_PEER_DEP_ISSUES`, try `pnpm install --legacy-peer-deps`.*

### 2. Linting
CI runs linting across the entire workspace.
```bash
pnpm -r lint
```
*Expected: All packages pass linting rules.*

### 3. Type Checking
Type checking is critical for this TypeScript monorepo.
```bash
pnpm -r typecheck
```
*Expected: Zero `error TS...` messages.*

### 4. Build
This verifies that all packages can be built (transpiled/bundled).
```bash
pnpm -r build
```
*Note: This includes `next build` for apps and `tsc` for libraries.*

### 5. Test
Run the test suite. Note that different packages use different runners.
```bash
pnpm -r test
```
*   **Root/Server:** Uses `jest`.
*   **Web Apps:** Use `vitest`.
*   **E2E:** Uses `playwright`.

### 6. Operational Readiness (New)
Run the automated readiness check.
```bash
pnpm ops:readiness
```

## Troubleshooting Common Failures

| Failure | Context | Fix |
| :--- | :--- | :--- |
| `ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL` | `pnpm -r ...` | Look at the lines immediately preceding the error to identify the specific package. |
| `browserType.launch: Executable doesn't exist` | Playwright Tests | Run `pnpm exec playwright install`. |
| `TS6059: File ... is not under 'rootDir'` | `apps/gateway` | Known blocker BLK-001. Requires `tsconfig.json` adjustment. |
| `pify(...).bind is not a function` | `apps/mobile-interface` | Known blocker BLK-002. Dependency issue. |
