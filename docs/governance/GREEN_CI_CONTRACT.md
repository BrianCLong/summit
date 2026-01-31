Owner: Governance
Last-Reviewed: 2026-01-14
Evidence-IDs: none
Status: active

# Green CI Contract

**Purpose:** Define the non-negotiable standards for code stability and test determinism.

## 1. The Golden Rule

**"It works on my machine" is not a valid defense.**
CI is the source of truth. If it fails in CI, it is broken.

## 2. Local Verification Chain

Before pushing, every contributor must run the canonical verification subset for their changes.

- **Lint**: `pnpm lint`
- **Test (Unit)**: `pnpm test:unit`
- **Type Check**: `pnpm tsc --noEmit`

## 3. Test Determinism Rules

To prevent flaky tests and "works locally" syndrome:

### A. No Real Network Access

- **Forbidden**: Fetching `google.com`, calling external APIs, connecting to real DBs (unless strictly integration tests with service containers).
- **Required**: Mock all network boundaries using `msw`, `nock`, or dependency injection.
- **Global Mocks**: Ensure `ioredis` and `pg` are mocked in unit tests (see `server/tests/setup/jest.setup.js`).

### B. No Leaked State (Singletons)

- **Problem**: Singletons (e.g., `Prometheus` registry, `pg-boss` instance) persist between tests in the same process, causing "Duplicate metric" or "Connection already active" errors.
- **Requirement**: Implement `reset()` or `clear()` methods on all singletons. Call them in `afterEach` or `beforeEach`.
- **Example**:

  ```typescript
  // In your singleton
  public static resetForTesting() {
    this.instance = null;
    // clear internal maps/arrays
  }

  // In test file
  afterEach(() => {
    MySingleton.resetForTesting();
  });
  ```

### C. No Open Handles

- **Requirement**: Close all servers, database connections, and file handles after tests.
- **Verify**: Run Jest/node:test with `--detectOpenHandles`.

### D. ESM/CJS Hygiene

- **Requirement**: Do not mix `require` and `import` haphazardly.
- **Config**: Follow the repo's pattern (ESM preferred for new code). Use `createRequire` if you must import CJS into ESM.

## 4. Evidence Expectations

- **New Features**: Must include a test case covering the happy path.
- **Bug Fixes**: Must include a regression test.
- **Ops Tools**: Must verify successfully via `pnpm verify`.

## 5. Automation

We use `pnpm ci:cluster` to detect violations of this contract in CI logs (e.g., `ERR_MODULE_NOT_FOUND`, `Duplicate metric`).
