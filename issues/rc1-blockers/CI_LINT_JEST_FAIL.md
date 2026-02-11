# RC1 Blocker: CI/Lint/Jest Failures

## Description
The CI gate is failing due to multiple issues:
1. `pnpm-lock.yaml` is out of sync with `packages/sdes-jee/package.json`.
2. 1232 linter errors (ruff) found across the codebase.
3. Jest tests fail to start because `tests/utils/jest-setup.cjs` is missing from the root.

## Impact
Prevents automated verification of code quality and correctness.

## Suggested Fix
1. Update lockfile: `pnpm install --no-frozen-lockfile`.
2. Run `ruff check . --fix`.
3. Restore or create `tests/utils/jest-setup.cjs`.
