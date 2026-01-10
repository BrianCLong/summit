# PR Fast Lane

## Overview

The **PR Fast Lane** is a conceptual subset of the CI pipeline designed to provide rapid feedback (under 15 minutes) for the majority of PRs.

## What's in the Fast Lane?

The Fast Lane includes:

1.  **Format Check:** Prettier/Ruff.
2.  **Lint:** ESLint, Type Checking.
3.  **Unit Tests (Sharded):** `pnpm test:unit` split into shards.
4.  **Verification Suite:** Lightweight script verification (`pnpm verify`).

## How to use it

As a developer, simply open a PR. The Fast Lane jobs run automatically.

*   If `Lint` fails, fix it immediately.
*   If `Test` (Unit) fails, fix logic errors.
*   If `Verify` fails, check `server/scripts/verify-*.log`.

## Merge Train Integration

The Merge Train prioritizes these "Fast Lane" checks. Heavier tests (Integration, Golden Path) run in parallel but may take longer.

## Configuration

The Fast Lane is defined implicitly in `.github/workflows/ci.yml` by the dependencies:

```yaml
  test:
    needs: [lint, verify]
```

## Future Improvements

*   **Selective Execution:** Use `ci-fast.yml` to skip heavy integration tests on documentation-only changes (already partially implemented via `paths-ignore`).
*   **Scoped Testing:** Run only tests related to changed files (requires complex dependency graph analysis).
