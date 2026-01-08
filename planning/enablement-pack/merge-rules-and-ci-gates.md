# Merge Rules & CI Gates

To maintain code quality and stability, all changes must pass a series of automated checks and manual reviews before merging.

## Branching Strategy

- **Main Branch**: `main` (Protected). Deployable at any time.
- **Feature Branches**: `feat/description` or `feature/description`.
- **Fix Branches**: `fix/description` or `bugfix/description`.
- **Chore Branches**: `chore/description`.

## Pull Request Expectations

1.  **Title**: Must follow Conventional Commits.
    - `feat(auth): add login support`
    - `fix(graph): resolve connection timeout`
2.  **Description**:
    - Explain _what_ changed and _why_.
    - Include "Test Plan" (how did you verify?).
    - Include screenshots for UI changes.
3.  **Size**: Keep PRs small and atomic.

## CI Gates (Required Checks)

The following checks run on every PR and must pass:

1.  **Linting**: `pnpm run lint`
    - ESLint and Prettier checks.
2.  **Type Checking**: `pnpm run typecheck`
    - TypeScript compilation check.
3.  **Tests**: `pnpm run test`
    - Unit and integration tests.
4.  **Security**:
    - Secret scanning (Gitleaks).
    - Dependency audit.

## Review Process

- **Approvals**: At least one approval from a code owner or peer.
- **Feedback**: Address all comments. Resolve threads before merging.
- **Squash & Merge**: Preferred merge strategy to keep history clean.

## Local Verification

Before opening a PR, run:

```bash
pnpm run ci
```

This runs lint, typecheck, and tests locally, saving you round-trip time with CI.

---

## Fast Path: Mergefix / Express 5 Changes

This section defines **coding rules, commit conventions, and the minimal gate** for any PR that
touches the Express 5 migration or related merge conflict work. Use it for PRs labeled `mergefix`.

### Coding Rules (must)

1.  **One global error handler** at the end of the middleware chain. No router-level error handlers.
2.  **Async handlers `throw`**; never call `next(err)` from an `async` function.
3.  **Structured errors** only:
    ```json
    { "error": { "code": "BAD_REQUEST", "message": "Human-readable text" } }
    ```
4.  **Order**: routes → 404 → error handler.
5.  **Return after responding** (avoid `"headers already sent"`).
6.  **Validation**: validators may `throw` `{ statusCode, code, message }`; do not `next(err)`.
7.  **Streaming**: use `await pipeline(stream, res)`; let rejections bubble to the global error handler.
8.  **Tests**: Supertest must `await`; assert JSON errors; 404 is JSON.

### Commit Message Convention

Use the `mergefix` type + scope:

- `mergefix(express5): centralize error handler`
- `mergefix(router): drop next(err) in async handlers`
- `mergefix(build): adjust Vite 7 config`
- `mergefix(tests): update Supertest for JSON errors`

If a commit is a pure conflict resolution, prefer the prefix `mergefix(express5):` and keep the diff
tightly scoped.

### Minimal Local Gate (must pass before pushing)

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm test -- --ci
pnpm -r build
pnpm playwright install --with-deps
pnpm e2e
```
