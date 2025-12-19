# Contributing to Summit (IntelGraph)

> **⚠️ IMPORTANT:** This document is being superseded by the **[Developer Enablement Pack](planning/enablement-pack/README.md)**.
> Please refer to that directory for the authoritative "Golden Path" on onboarding, workflows, and architecture.

## 🚀 Quick Start & Golden Path

For a fast and reliable development loop, we strictly enforce a "Golden Path" for commits:

1.  **Setup**: Ensure you have run `pnpm install` and your environment is ready.
2.  **Linting**: We use `husky` and `lint-staged` to automatically lint and format your code on commit.
    *   **JS/TS**: `eslint` and `prettier` run automatically.
    *   **Python**: `ruff` runs automatically (ensure `ruff` is installed, e.g., via `pip install ruff` or `pip install -r requirements.txt`).
3.  **Secrets**: `gitleaks` checks for secrets. If you don't have it, the check is skipped locally, but CI will catch it.
4.  **Commit**: Simply run `git commit`. The hooks are optimized to run only on staged files.

**Pre-commit Checks:**
*   **Fast**: Linting and formatting on changed files only.
*   **Secure**: Basic secret scanning.
*   **No Heavy Lifting**: Type checking (`npm run typecheck`) and Tests (`npm test`) run in CI, not on local commit.

## Prerequisites & Setup

Please follow the **[Onboarding & Quickstart Guide](planning/enablement-pack/onboarding-quickstart.md)**.

## Common Development Tasks

See **[Daily Developer Workflows](planning/enablement-pack/daily-dev-workflows.md)**.

> **Note:** Check out the [Examples Directory](examples/) for plugins and custom pipelines.

## Branch & Pull Request Workflow

Please adhere to the [Merge Rules & CI Gates](planning/enablement-pack/merge-rules-and-ci-gates.md).

## Mergefix / Express 5 Changes (Fast Path)

This section defines **coding rules, commit conventions, and the minimal gate** for any PR that touches the Express 5 migration or related merge conflict work. Use it for PRs labeled `mergefix`.

### Coding Rules (must)

1. **One global error handler** at the end of the middleware chain. No router-level error handlers.
2. **Async handlers `throw`**; never call `next(err)` from an `async` function.
3. **Structured errors** only:
   ```json
   { "error": { "code": "BAD_REQUEST", "message": "Human-readable text" } }
   ```
4. **Order**: routes → 404 → error handler.
5. **Return after responding** (avoid `"headers already sent"`).
6. **Validation**: validators may `throw` `{ statusCode, code, message }`; do not `next(err)`.
7. **Streaming**: use `await pipeline(stream, res)`; let rejections bubble to the global error handler.
8. **Tests**: Supertest must `await`; assert JSON errors; 404 is JSON.

### Commit Message Convention

Use the `mergefix` type + scope:

- `mergefix(express5): centralize error handler`
- `mergefix(router): drop next(err) in async handlers`
- `mergefix(build): adjust Vite 7 config`
- `mergefix(tests): update Supertest for JSON errors`

If a commit is a pure conflict resolution, prefer the prefix `mergefix(express5):` and keep the diff tightly scoped.

> Add formatting-only or mass-rename SHAs to `.git-blame-ignore-revs`.

### Minimal Local Gate (must pass before pushing)

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm test -- --ci
pnpm -r build
pnpm playwright install --with-deps
pnpm e2e
pnpm jest contracts/graphql/__tests__/schema.contract.ts --runInBand
curl -sL -o opa https://openpolicyagent.org/downloads/latest/opa_linux_amd64 && chmod +x ./opa && ./opa test policies/ -v
pnpm cyclonedx-npm --output-format JSON --output-file sbom.json
node .ci/gen-provenance.js > provenance.json && node .ci/verify-provenance.js provenance.json
```

Or with `make`:

```bash
make ci-check contracts policy-sim
```

### Conflict-Resolution Tips

- Enable `git rerere` once:

  ```bash
  git config --global rerere.enabled true
  git config --global rerere.autoUpdate true
  git config --global rerere.log true
  ```

- Detect duplicates before opening your PR:

  ```bash
  git log --oneline --cherry origin/main...HEAD
  ```

### PR Checklist

- [ ] No `next(err)` in async handlers
- [ ] Single global error handler (after 404)
- [ ] JSON error shape consistent
- [ ] Tests updated for Express 5 semantics
- [ ] Contracts + policy sim pass
- [ ] SBOM + provenance generated and verified

## Testing Guidelines

See **[Testing Guidelines](planning/enablement-pack/testing-guidelines.md)** for detailed patterns, factories, and mocking strategies.

### Running Tests

```bash
# Run all tests
pnpm run test

# Run unit tests only
pnpm run test:unit

# Run integration tests
pnpm run test:integration

# Run E2E tests
pnpm run test:e2e

# Run with coverage
pnpm run test:coverage

# Run tests in watch mode
pnpm run test:watch

# Run tests for specific file
pnpm run test -- path/to/test.test.ts
```

### Coverage Requirements

**Minimum Coverage Thresholds:**

- Global: 80%
- Critical paths (middleware, resolvers): 85%

## AI Agent Collaboration

See **[AI Agent Guidelines](planning/enablement-pack/ai-agent-guidelines.md)**.

## Merge Rules & CI Gates

See **[Merge Rules & CI Gates](planning/enablement-pack/merge-rules-and-ci-gates.md)** for:
*   Branching Strategy
*   Pull Request Expectations
*   CI Gates
*   Fast Path / Mergefix instructions

## Strict CI Enforcement & Code Quality

We enforce strict TypeScript checks (`strict: true`, `noImplicitAny`) and ESLint rules (`no-explicit-any`, `no-unused-vars`).

### Zero Tolerance

- All PRs must pass `npm run typecheck` and `npm run lint` with **zero errors and zero warnings**.
- CI will fail fast on the first error.

### Legacy Code Exemption

To support gradual migration, existing files with errors are grandfathered via:
- `.eslint-legacy-files.json`: Files exempt from strict ESLint rules.
- `tsconfig.strict.json` exclude list: Files exempt from strict type checking.

**New code must not be added to these exemption lists.**
If you modify a legacy file, aim to fix the errors and remove it from the exemption list.
