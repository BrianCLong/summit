# Deterministic Build & Test Recipe

## Versions

- **Node**: Prefer `.nvmrc` (20.19.0) for runtime; note `.tool-versions` lists nodejs 20.11.0 and npm 10.8.0. Align all runners to 20.19.0 to avoid drift.
- **pnpm**: 10.0.0 (from `packageManager` field). Use `corepack enable pnpm@10.0.0` to pin.
- **Rust**: `Cargo.lock` present for Rust components; use toolchain pinned in repository defaults if touching `rust/` paths.

## Clean Clone Workflow

1. `corepack enable pnpm@10.0.0`
2. `nvm use 20.19.0` (or `asdf install` matching `.tool-versions` but override to 20.19.0 for consistency).
3. `pnpm install --frozen-lockfile`
4. **Golden path**: `make bootstrap && make up && make smoke` (canonical green-path expectation).
5. **Build**: `pnpm build` (delegates to `build:client` and `build:server`).
6. **Lint**: `pnpm lint` (ESLint + Ruff; Ruff warnings tolerated in non-strict mode).
7. **Tests**:
   - `pnpm test` (Jest aggregate)
   - `pnpm test:e2e` (Playwright) when browser deps available
   - `pnpm test:fuzz:graph-guardrails` for guardrail fuzzing
   - GA verification fallback: `node --test testing/ga-verification/*.ga.test.mjs` and `node scripts/ga/verify-ga-surface.mjs`

## Notes for CI Parity

- Use `pnpm install --frozen-lockfile` to prevent lockfile churn; do not update `pnpm-lock.yaml` unless dependency intent changes.
- Avoid altering Jest/pnpm global configuration (per `agent-contract.json` stop conditions); add Tier B/C verification instead of skipping tests.
- Network-restricted environments should use existing lockfiles and internal registry mirrors; avoid `npm install` fallbacks that bypass pnpm caching.
- When running release workflows locally, prefer the reusable action definitions in `.github/workflows/_reusable-*` to mirror CI behavior.
